const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const Message = require('../models/Message');

const initializeSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token && socket.handshake.headers && socket.handshake.headers.cookie) {
        const match = socket.handshake.headers.cookie.match(/jwt=([^;]+)/);
        if (match) {
          token = match[1];
        }
      }
      if (!token) {
        return next(new Error('Authentication token required.'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      let account = await User.findById(decoded.id).select('-password');
      let role = 'patient';

      if (!account) {
        account = await Doctor.findById(decoded.id).select('-password');
        role = 'doctor';
      }

      if (!account) {
        return next(new Error('Account not found.'));
      }

      socket.user = account;
      socket.role = role;
      next();
    } catch (err) {
      console.error('Socket authentication failed:', err.message);
      return next(new Error('Not authorized.'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    const role = socket.role;

    if (role === 'doctor') {
      socket.doctorId = userId;
      socket.join(`doctor:${userId}`);

      Doctor.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() })
        .then(() => {
          io.emit('doctor-presence-update', { doctorId: userId, isOnline: true });
        })
        .catch(err => console.error('Error updating doctor presence:', err));
    } else {
      socket.join(`user:${userId}`);

      User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() })
        .then(() => {
          io.emit('patient-presence-update', { patientId: userId, isOnline: true });
        })
        .catch(err => console.error('Error updating patient presence:', err));
    }

    socket.on('join-appointment-room', async ({ appointmentId }) => {
      try {

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
          return socket.emit('error', 'Appointment not found.');
        }

        const isPatient = appointment.patientId.toString() === userId;
        const isDoctor = appointment.doctorId.toString() === userId;


        if (!isPatient && !isDoctor) {
          return socket.emit('error', 'Access denied to this consultation room.');
        }

        const payment = await Payment.findOne({ appointmentId: appointment._id, paymentStatus: 'paid' });
        const start = payment ? payment.createdAt : appointment.createdAt;
        const expiresAt = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

        if (new Date() >= expiresAt) {
          return socket.emit('consultation-expired', { appointmentId });
        }

        socket.join(`appointment:${appointmentId}`);
        socket.currentAppointmentId = appointmentId;

        socket.to(`appointment:${appointmentId}`).emit('participant-joined', { userId, role });

        const roomSockets = await io.in(`appointment:${appointmentId}`).fetchSockets();
        const otherParticipants = roomSockets
          .filter(s => s.user._id.toString() !== userId)
          .map(s => ({ userId: s.user._id.toString(), role: s.role }));

        if (otherParticipants.length > 0) {
          socket.emit('room-status', { members: otherParticipants });
        }
      } catch (err) {
        console.error('Error joining appointment room:', err);
        socket.emit('error', 'Error joining consultation room.');
      }
    });

    socket.on('leave-appointment-room', ({ appointmentId }) => {
      socket.leave(`appointment:${appointmentId}`);
      socket.currentAppointmentId = null;
      socket.to(`appointment:${appointmentId}`).emit('participant-left', { userId, role });
    });

    socket.on('send-message', async ({ appointmentId, type, content, fileUrl, fileName }) => {
      try {
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) return socket.emit('error', 'Appointment not found.');

        const payment = await Payment.findOne({ appointmentId: appointment._id, paymentStatus: 'paid' });
        const start = payment ? payment.createdAt : appointment.createdAt;
        const expiresAt = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

        if (new Date() >= expiresAt) {
          socket.emit('consultation-expired', { appointmentId });
          socket.leave(`appointment:${appointmentId}`);
          return;
        }

        const receiverId = role === 'doctor' ? appointment.patientId : appointment.doctorId;

        let messageType = 'text';
        if (type === 'image') messageType = 'image';
        else if (type === 'pdf') messageType = 'pdf';
        else if (type === 'video') messageType = 'video';
        else if (type === 'file') messageType = 'file';

        const message = new Message({
          appointmentId,
          senderId: userId,
          receiverId,
          senderRole: role,
          messageType,
          content: content || '',
          fileUrl: fileUrl || '',
          fileName: fileName || '',
          isSeen: false,
        });

        await message.save();

        io.to(`appointment:${appointmentId}`).emit('receive-message', message);

        const receiverRoom = role === 'doctor' ? `user:${receiverId}` : `doctor:${receiverId}`;
        io.to(receiverRoom).emit('new-message-notification', {
          appointmentId,
          senderId: userId,
          senderName: socket.user.name,
          message: messageType === 'text' ? content : 'Sent an attachment',
        });
      } catch (err) {
        console.error('Error sending message:', err);
        socket.emit('error', 'Failed to send message.');
      }
    });

    socket.on('delete-message', ({ appointmentId, messageId }) => {
      io.to(`appointment:${appointmentId}`).emit('message-deleted', { messageId });
    });

    socket.on('typing', ({ appointmentId }) => {
      socket.to(`appointment:${appointmentId}`).emit('typing', {
        senderId: userId,
        senderRole: role
      });
    });

    socket.on('stop-typing', ({ appointmentId }) => {
      socket.to(`appointment:${appointmentId}`).emit('stop-typing', {
        senderId: userId,
        senderRole: role
      });
    });

    socket.on('mark-seen', async ({ appointmentId }) => {
      try {
        await Message.updateMany(
          { appointmentId, receiverId: userId, isSeen: false },
          { $set: { isSeen: true, seenAt: new Date() } }
        );
        socket.to(`appointment:${appointmentId}`).emit('messages-marked-seen', { appointmentId });
      } catch (err) {
        console.error('Error marking messages seen:', err);
      }
    });

    socket.on("initiate_call", ({ callerId, receiverId, callType, callerInfo }) => {
      const hasUserSocket = io.sockets.adapter.rooms.get(`user:${receiverId}`)?.size > 0;
      const hasDoctorSocket = io.sockets.adapter.rooms.get(`doctor:${receiverId}`)?.size > 0;

      if (hasUserSocket || hasDoctorSocket) {
        const callId = `${callerId}-${receiverId}-${Date.now()}`;

        io.to([`user:${receiverId}`, `doctor:${receiverId}`]).emit("incoming_call", {
          callerId,
          callerName: callerInfo?.username || callerInfo?.name || socket.user.name,
          callerAvatar: callerInfo?.profilePicture || callerInfo?.profileImage || '',
          callId,
          callType
        });
      } else {
        socket.emit("call_failed", { reason: "user is offline" });
      }
    });

    socket.on("accept_call", ({ callerId, callId, receiverInfo }) => {
      const hasUserSocket = io.sockets.adapter.rooms.get(`user:${callerId}`)?.size > 0;
      const hasDoctorSocket = io.sockets.adapter.rooms.get(`doctor:${callerId}`)?.size > 0;

      if (hasUserSocket || hasDoctorSocket) {
        io.to([`user:${callerId}`, `doctor:${callerId}`]).emit("call_accepted", {
          callerName: receiverInfo?.username || receiverInfo?.name || socket.user.name,
          callerAvatar: receiverInfo?.profilePicture || receiverInfo?.profileImage || '',
          callId,
        });
      } else {
        socket.emit("call_failed", { reason: "user is offline" });
      }
    });

    socket.on("reject_call", ({ callId, callerId }) => {
      io.to([`user:${callerId}`, `doctor:${callerId}`]).emit("call_rejected", { callId });
    });

    socket.on("end_call", ({ callId, participantId }) => {
      io.to([`user:${participantId}`, `doctor:${participantId}`]).emit("call_ended", { callId });
    });

    socket.on("webrtc_offer", ({ callId, offer, receiverId }) => {
      io.to([`user:${receiverId}`, `doctor:${receiverId}`]).emit("webrtc_offer", {
        callId,
        offer,
        senderId: userId
      });
    });

    socket.on("webrtc_answer", ({ callId, answer, receiverId }) => {
      io.to([`user:${receiverId}`, `doctor:${receiverId}`]).emit("webrtc_answer", {
        callId,
        answer,
        senderId: userId
      });
    });

    socket.on("webrtc_ice_candidate", ({ callId, candidate, receiverId }) => {
      io.to([`user:${receiverId}`, `doctor:${receiverId}`]).emit("webrtc_ice_candidate", {
        callId,
        candidate,
        senderId: userId
      });
    });

    socket.on("disconnect_call", ({ callId, receiverId }) => {
      io.to([`user:${receiverId}`, `doctor:${receiverId}`]).emit("call_disconnected", { callId });
    });

    socket.on("toggle_audio", ({ callId, receiverId, enabled }) => {
      io.to([`user:${receiverId}`, `doctor:${receiverId}`]).emit("remote_toggle_audio", { callId, enabled });
    });

    socket.on('disconnect', async () => {
      if (socket.currentAppointmentId) {
        socket.to(`appointment:${socket.currentAppointmentId}`).emit('participant-left', { userId, role });
      }
      if (role === 'doctor') {
        const lastSeen = new Date();
        await Doctor.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
        io.emit('doctor-presence-update', {
          doctorId: userId,
          isOnline: false,
          lastSeen,
        });
      } else if (role === 'patient') {
        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
        io.emit('patient-presence-update', {
          patientId: userId,
          isOnline: false,
          lastSeen,
        });
      }
    });
  });
};

module.exports = initializeSocket;
