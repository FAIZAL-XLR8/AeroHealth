import { useState, useEffect, useRef } from 'react';
import { showFlash } from '../components/FlashMessage';

export const useTelehealthCall = ({ socket, user, counterpartId, counterpartName, counterpartPhoto, isExpired }) => {
  const [callState, setCallState] = useState('idle');
  const [callType, setCallType] = useState('video');
  const [callId, setCallId] = useState(null);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const pcRef = useRef(null);
  const timerRef = useRef(null);
  const screenTrackRef = useRef(null);
  const localStreamRef = useRef(null);

  const counterpartIdRef = useRef(counterpartId);
  const callTypeRef = useRef(callType);

  useEffect(() => {
    counterpartIdRef.current = counterpartId;
  }, [counterpartId]);

  useEffect(() => {
    callTypeRef.current = callType;
  }, [callType]);

  const startTimer = () => {
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatCallTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const stopMedia = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
      setIsScreenSharing(false);
    }
    setRemoteStream(null);
  };

  const cleanupCall = () => {
    stopTimer();
    stopMedia();
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setCallState('idle');
    setIncomingCallData(null);
    setCallId(null);
  };

  const createPeerConnection = (cId, targetUserId, stream) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" },
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("webrtc_ice_candidate", {
          callId: cId,
          candidate: event.candidate,
          receiverId: targetUserId
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    if (stream) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    }

    return pc;
  };

  const handleStartCall = async (type) => {
    if (isExpired || !counterpartId) return;
    setCallType(type);
    setCallState('calling');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;

      const generatedCallId = `${user.id || user._id}-${counterpartId}-${Date.now()}`;
      setCallId(generatedCallId);

      socket.emit("initiate_call", {
        callerId: user.id || user._id,
        receiverId: counterpartId,
        callType: type,
        callerInfo: {
          username: user.name,
          profilePicture: user.profileImage || ''
        }
      });
    } catch (err) {
      alert('Could not start call - failed to access camera/mic.');
      setCallState('idle');
    }
  };

  const handleAcceptCall = async () => {
    if (isExpired || !incomingCallData || !callId) return;
    setCallState('connected');
    startTimer();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: callType === 'video', audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;

      socket.emit("accept_call", {
        callerId: incomingCallData.callerId,
        callId: callId,
        receiverInfo: {
          username: user.name,
          profilePicture: user.profileImage || ''
        }
      });
    } catch (err) {
      showFlash(`Call accept failed: ${err.message}`, 'error');
      cleanupCall();
    }
  };

  const handleRejectCall = () => {
    if (socket && incomingCallData && callId) {
      socket.emit("reject_call", {
        callId,
        callerId: incomingCallData.callerId
      });
    }
    setCallState('idle');
    setIncomingCallData(null);
    setCallId(null);
  };

  const handleEndCall = () => {
    if (socket && callId && counterpartId) {
      socket.emit("end_call", {
        callId,
        participantId: counterpartId
      });
    }
    cleanupCall();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        const newEnabled = !audioTrack.enabled;
        audioTrack.enabled = newEnabled;
        setMicMuted(!newEnabled);

        socket?.emit("toggle_audio", {
          callId,
          receiverId: counterpartId,
          enabled: newEnabled
        });
      }
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current && callType === 'video') {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        const newEnabled = !videoTrack.enabled;
        videoTrack.enabled = newEnabled;
        setCamOff(!newEnabled);
      }
    }
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: callType === 'video', audio: true });
        const videoTrack = stream.getVideoTracks()[0];

        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        }

        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach(track => track.stop());
        }

        setLocalStream(stream);
        localStreamRef.current = stream;
        setIsScreenSharing(false);
      } catch (err) {
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender && screenTrack) {
            sender.replaceTrack(screenTrack);
          }
        }

        const audioTrack = localStreamRef.current?.getAudioTracks()[0];
        const newStream = new MediaStream([screenTrack]);
        if (audioTrack) {
          newStream.addTrack(audioTrack);
        }

        const camVideoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (camVideoTrack) {
          camVideoTrack.stop();
        }

        setLocalStream(newStream);
        localStreamRef.current = newStream;

        screenTrack.onended = () => {
          handleToggleScreenShare();
        };

        setIsScreenSharing(true);
      } catch (err) {
      }
    }
  };

  useEffect(() => {
    if (!socket) return;

    socket.on("incoming_call", ({ callerId, callerName, callerAvatar, callType, callId }) => {
      setCallId(callId);
      setCallType(callType);
      setIncomingCallData({ callerId, callerName, callerAvatar });
      setCallState('incoming');
    });

    socket.on("call_accepted", async ({ callId: acceptedCallId }) => {
      setCallState('connected');
      startTimer();

      let stream = localStreamRef.current;
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: callTypeRef.current === 'video', audio: true });
          setLocalStream(stream);
          localStreamRef.current = stream;
        } catch (err) {
          handleEndCall();
          return;
        }
      }

      const counterpartIdVal = counterpartIdRef.current;
      const pc = createPeerConnection(acceptedCallId, counterpartIdVal, stream);
      pcRef.current = pc;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("webrtc_offer", {
        callId: acceptedCallId,
        offer,
        receiverId: counterpartIdVal
      });
    });

    socket.on("call_rejected", () => {
      alert("Call rejected by other user.");
      cleanupCall();
    });

    socket.on("call_ended", () => {
      cleanupCall();
    });

    socket.on("webrtc_offer", async ({ offer, senderId, callId: incomingCallId }) => {
      let stream = localStreamRef.current;
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: callTypeRef.current === 'video', audio: true });
          setLocalStream(stream);
          localStreamRef.current = stream;
        } catch (err) {
          return;
        }
      }

      const pc = createPeerConnection(incomingCallId, senderId, stream);
      pcRef.current = pc;

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("webrtc_answer", {
        callId: incomingCallId,
        answer,
        receiverId: senderId
      });
    });

    socket.on("webrtc_answer", async ({ answer }) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on("webrtc_ice_candidate", async ({ candidate }) => {
      try {
        if (pcRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
      }
    });

    socket.on("remote_toggle_audio", ({ enabled }) => {
    });

    socket.on("call_failed", ({ reason }) => {
      alert(`Call failed: ${reason}`);
      cleanupCall();
    });

    socket.on("call_disconnected", () => {
      cleanupCall();
    });

    return () => {
      socket.off("incoming_call");
      socket.off("call_accepted");
      socket.off("call_rejected");
      socket.off("call_ended");
      socket.off("webrtc_offer");
      socket.off("webrtc_answer");
      socket.off("webrtc_ice_candidate");
      socket.off("remote_toggle_audio");
      socket.off("call_failed");
      socket.off("call_disconnected");
      cleanupCall();
    };
  }, [socket]);

  return {
    callState,
    callType,
    callId,
    incomingCallData,
    localStream,
    remoteStream,
    micMuted,
    camOff,
    isScreenSharing,
    callDuration,
    handleStartCall,
    handleAcceptCall,
    handleRejectCall,
    handleEndCall,
    toggleMute,
    toggleCam,
    handleToggleScreenShare,
    formatCallTime,
    cleanupCall
  };
};
