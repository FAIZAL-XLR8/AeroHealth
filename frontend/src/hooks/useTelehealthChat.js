import { useState, useEffect, useRef } from 'react';
import { apiUrl, fetchWithAuth } from '../utils/api';

export const useTelehealthChat = ({ socket, user, appointmentId, role }) => {
  const [appointment, setAppointment] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [counterpartPresence, setCounterpartPresence] = useState({ online: false, lastSeen: null });
  const [isTyping, setIsTyping] = useState(false);
  const [counterpartTyping, setCounterpartTyping] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState(null);
  const [roomMembers, setRoomMembers] = useState([]);

  const fileInputRef = useRef(null);
  const counterpartIdRef = useRef(null);
  const roleRef = useRef(role);

  const counterpartId = appointment
    ? (role === 'doctor'
        ? (appointment.patientId?._id || appointment.patientId)
        : (appointment.doctorId?._id || appointment.doctorId)
      )
    : null;

  useEffect(() => {
    counterpartIdRef.current = counterpartId;
  }, [counterpartId]);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  const fetchRoomData = async () => {
    if (!appointmentId) return;
    try {
      let targetAppt = null;

      if (role === 'doctor') {
        const docRes = await fetchWithAuth(apiUrl(`/api/appointments/doctor/dashboard`));
        const docData = await docRes.json();
        if (docRes.ok) {
          targetAppt = docData.appointments?.find(a => a._id === appointmentId);
        }
      } else {
        const apptRes = await fetchWithAuth(apiUrl(`/api/appointments/patient/dashboard`));
        const apptData = await apptRes.json();
        if (apptRes.ok) {
          targetAppt = apptData.find(a => a._id === appointmentId);
        }
      }

      if (targetAppt) {
        setAppointment(targetAppt);
        if (new Date() >= new Date(targetAppt.chatEnabledUntil)) {
          setIsExpired(true);
        }
      }

      const msgRes = await fetchWithAuth(apiUrl(`/api/messages/${appointmentId}`));
      const msgData = await msgRes.json();
      if (msgRes.ok) {
        setMessages(msgData);
      }
    } catch (err) {
    }
  };

  useEffect(() => {
    fetchRoomData();
  }, [appointmentId]);

  useEffect(() => {
    if (appointment) {
      if (role === 'patient') {
        const doc = appointment.doctorId;
        if (doc) {
          setCounterpartPresence({
            online: doc.isOnline || false,
            lastSeen: doc.lastSeen || null
          });
        }
      } else if (role === 'doctor') {
        const pat = appointment.patientId;
        if (pat) {
          setCounterpartPresence({
            online: pat.isOnline || false,
            lastSeen: pat.lastSeen || null
          });
        }
      }
    }
  }, [appointment, role]);

  useEffect(() => {
    if (!counterpartId) return;
    const isOnline = roomMembers.some(m => m.userId === counterpartId);
    if (isOnline) {
      setCounterpartPresence({ online: true, lastSeen: null });
    } else {
      setCounterpartPresence(prev => ({
        online: false,
        lastSeen: prev.online ? new Date() : prev.lastSeen
      }));
    }
  }, [roomMembers, counterpartId]);

  const handleClearSelectedFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadAndSendAttachment = async () => {
    if (!selectedFile || isExpired || !socket) return;

    const file = selectedFile;
    const fileType = file.type || '';
    let msgType = 'file';
    if (fileType.includes('pdf')) {
      msgType = 'pdf';
    } else if (fileType.includes('image')) {
      msgType = 'image';
    } else if (fileType.includes('video')) {
      msgType = 'video';
    }

    const formData = new FormData();
    formData.append('media', file);
    formData.append('appointmentId', appointmentId);
    formData.append('type', msgType);

    setUploading(true);
    try {
      const res = await fetchWithAuth(apiUrl('/api/messages/upload'), {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        socket.emit('send-message', {
          appointmentId,
          type: msgType,
          content: file.name,
          fileUrl: data.fileUrl
        });

        if (messageText.trim()) {
          socket.emit('send-message', {
            appointmentId,
            type: 'text',
            content: messageText.trim()
          });
          setMessageText('');
        }

        handleClearSelectedFile();
      } else {
        alert(data.message || 'File upload failed.');
      }
    } catch (err) {
      alert('Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (isExpired || !socket) return;

    if (selectedFile) {
      await uploadAndSendAttachment();
    } else if (messageText.trim()) {
      socket.emit('send-message', {
        appointmentId,
        type: 'text',
        content: messageText.trim()
      });

      setMessageText('');
      socket.emit('stop-typing', { appointmentId });
      setIsTyping(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (isExpired) return;
    if (!window.confirm("Are you sure you want to delete this message?")) return;

    try {
      const res = await fetchWithAuth(apiUrl(`/api/messages/${messageId}`), {
        method: 'DELETE'
      });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m._id !== messageId));
        socket?.emit('delete-message', { appointmentId, messageId });
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete message.');
      }
    } catch (err) {
      alert('Error deleting message.');
    }
  };

  const handleTyping = (e) => {
    setMessageText(e.target.value);

    if (isExpired || !socket) return;

    if (!isTyping && e.target.value.trim() !== '') {
      setIsTyping(true);
      socket.emit('typing', { appointmentId });
    } else if (isTyping && e.target.value.trim() === '') {
      setIsTyping(false);
      socket.emit('stop-typing', { appointmentId });
    }
  };

  const handleAttachmentUpload = (e) => {
    const file = e.target.files[0];
    if (!file || isExpired) return;

    const fileType = file.type || '';
    if (fileType.includes('image')) {
      setSelectedFile(file);
      setFilePreviewUrl(URL.createObjectURL(file));
    } else {
      setSelectedFile(file);
      setFilePreviewUrl(null);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      socket.emit('join-appointment-room', { appointmentId });
      socket.emit('mark-seen', { appointmentId });
    };

    if (socket.connected) {
      handleConnect();
    }
    socket.on('connect', handleConnect);

    socket.on('participant-joined', ({ userId, role: userRole }) => {
      setRoomMembers(prev => {
        if (prev.some(m => m.userId === userId)) return prev;
        return [...prev, { userId, role: userRole }];
      });
    });

    socket.on('participant-left', ({ userId }) => {
      setRoomMembers(prev => prev.filter(m => m.userId !== userId));
    });

    socket.on('room-status', ({ members }) => {
      setRoomMembers(members || []);
    });

    socket.on('receive-message', (message) => {
      setMessages(prev => [...prev, message]);
      socket.emit('mark-seen', { appointmentId });
    });

    socket.on('message-deleted', ({ messageId }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
    });

    socket.on('messages-marked-seen', () => {
      setMessages(prev => prev.map(m => (m.senderId === user.id || m.senderId === user._id) ? { ...m, isSeen: true } : m));
    });

    socket.on('doctor-presence-update', ({ doctorId, isOnline, lastSeen }) => {
      const counterpartIdVal = counterpartIdRef.current;
      if (counterpartIdVal === doctorId) {
        setCounterpartPresence({ online: isOnline, lastSeen });
      }
    });

    socket.on('patient-presence-update', ({ patientId, isOnline, lastSeen }) => {
      const counterpartIdVal = counterpartIdRef.current;
      if (counterpartIdVal === patientId) {
        setCounterpartPresence({ online: isOnline, lastSeen });
      }
    });

    socket.on('typing', ({ senderRole }) => {
      if (senderRole !== roleRef.current) {
        setCounterpartTyping(true);
      }
    });

    socket.on('stop-typing', ({ senderRole }) => {
      if (senderRole !== roleRef.current) {
        setCounterpartTyping(false);
      }
    });

    socket.on('consultation-expired', () => {
      setIsExpired(true);
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('participant-joined');
      socket.off('participant-left');
      socket.off('room-status');
      socket.off('receive-message');
      socket.off('message-deleted');
      socket.off('messages-marked-seen');
      socket.off('doctor-presence-update');
      socket.off('patient-presence-update');
      socket.off('typing');
      socket.off('stop-typing');
      socket.off('consultation-expired');
    };
  }, [socket, appointmentId]);

  return {
    appointment,
    messages,
    messageText,
    setMessageText,
    counterpartPresence,
    isTyping,
    counterpartTyping,
    isExpired,
    setIsExpired,
    uploading,
    selectedFile,
    filePreviewUrl,
    fullscreenImageUrl,
    setFullscreenImageUrl,
    fileInputRef,
    handleClearSelectedFile,
    handleSendMessage,
    handleDeleteMessage,
    handleTyping,
    handleAttachmentUpload,
    counterpartId
  };
};
