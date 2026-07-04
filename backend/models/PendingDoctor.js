const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const pendingDoctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  specialization: {
    type: String,
    required: true,
    trim: true,
  },
  experienceYears: {
    type: Number,
    default: 0,
  },
  consultationFee: {
    type: Number,
    required: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  governmentIdUrl: {
    type: String,
    default: '',
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  phoneVerified: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  emailOtp: {
    type: String,
  },
  emailOtpExpires: {
    type: Date,
  },
  phoneOtp: {
    type: String,
  },
  phoneOtpExpires: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending',
  },
  rejectionReason: {
    type: String,
    default: '',
  }
}, {
  timestamps: true,
  strict: false
});

pendingDoctorSchema.pre('save', async function (next) {
  if (!this.isModified('password') || (this.password && this.password.startsWith('$2') && this.password.length === 60)) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

pendingDoctorSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('PendingDoctor', pendingDoctorSchema);
