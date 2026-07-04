const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please fill a valid email address'],
  },
  password: {
    type: String,
    required: true,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },

  specialization: {
    type: String,
    required: true,
    trim: true,
  },
  qualification: {
    type: String,
    default: '',
  },
  experienceYears: {
    type: Number,
    default: 0,
    min: [0, 'Experience years cannot be negative'],
  },
  consultationFee: {
    type: Number,
    required: true,
    min: [0, 'Consultation fee cannot be negative'],
  },
  bio: {
    type: String,
    default: '',
  },

  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  phone: {
    type: Number,
    required: true,
    trim: true,
    match: [/^\+?[\d\s\-()]{10,15}$/, 'Please fill a valid phone number'],
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
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending',
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  rejectionReason: {
    type: String,
    default: '',
  },
  approvedBy: {
    type: String,
    default: '',
  },
  approvedAt: {
    type: Date,
  },
  emailOtp: {
    type: Number,
  },
  emailOtpExpires: {
    type: Date,
  },
  phoneOtp: {
    type: Number,
  },
  phoneOtpExpires: {
    type: Date,
  },

  address: {
    type: String,
    default: '',
  },

  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
      default: [77.641151, 12.971891],
    },
  },
  activeHours: {
    type: String,
    default: '09:00 AM - 05:00 PM',
  },
}, {
  timestamps: true,
});

doctorSchema.pre('save', async function (next) {
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

doctorSchema.methods.matchPassword = async function (enteredPassword) {
  let passwordHash = this.password;
  if (!passwordHash) {
    const d = await this.model('Doctor').findById(this._id).select('+password');
    passwordHash = d ? d.password : '';
  }
  return await bcrypt.compare(enteredPassword, passwordHash);
};


module.exports = mongoose.model('Doctor', doctorSchema);
