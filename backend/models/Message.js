const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  senderRole: {
    type: String,
    enum: ['patient', 'doctor'],
    required: true,
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'pdf', 'file', 'video'],
    required: true,
  },
  content: {
    type: String,
    default: '',
  },
  fileUrl: {
    type: String,
    default: '',
  },
  fileName: {
    type: String,
    default: '',
  },
  isSeen: {
    type: Boolean,
    default: false,
  },
  seenAt: {
    type: Date,
  },
}, {
  timestamps: true,
});


module.exports = mongoose.model('Message', messageSchema);
