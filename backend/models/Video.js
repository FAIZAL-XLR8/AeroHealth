const mongoose = require('mongoose');
const { Schema } = mongoose;

const videoSchema = new mongoose.Schema({
  appointmentId: {
    type: Schema.Types.ObjectId,
    ref: "Appointment",
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  cloudinaryPublicId: {
    type: String,
    required: true,
    unique: true
  },
  secureUrl: {
    type: String,
    required: true
  },
  format: {
    type: String,
    enum: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv']
  },
  resourceType: {
    type: String,
    default: 'video'
  },
  duration: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Video', videoSchema);
