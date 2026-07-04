const User = require('../models/User');
const Doctor = require('../models/Doctor');
const PendingDoctor = require('../models/PendingDoctor');
const jwt = require('jsonwebtoken');
const FileType = require('file-type');
const { sendOtpToEmail } = require('../services/emailServices');
const twilioService = require('../services/twilioService');
const { uploadFromBuffer } = require('../services/cloudinaryService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

const setJwtCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === 'production' || process.env.FRONTEND_URL?.includes('onrender.com');
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
};

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const register = async (req, res) => {
  try {
    const {
      name, phone, password, email, role = 'patient',
      specialty, experience, fee, activeHours,
      profileImage, bio, address, latitude, longitude
    } = req.body;

    if (!name || !password || !email) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (role === 'doctor') {
      if (!specialty || !fee || !phone || !address) {
        return res.status(400).json({ message: 'Phone, specialization, fee, and clinic address are required.' });
      }

      const docRecord = await Doctor.findOne({ email: email.toLowerCase().trim() });
      const pendingRecord = await PendingDoctor.findOne({ email: email.toLowerCase().trim() });

      if (docRecord) {
        if (docRecord.status === 'suspended') {
          return res.status(400).json({
            message: 'Email address is suspended.',
            isSuspended: true,
            email: docRecord.email
          });
        }
        if (docRecord.status === 'pending') {
          return res.status(400).json({ message: 'Your doctor application is already under review.' });
        }
        if (docRecord.status === 'rejected') {
          return res.status(400).json({
            message: 'Your previous doctor application was rejected.',
            rejectionReason: docRecord.rejectionReason || 'No specific reasons provided.'
          });
        }
        return res.status(400).json({ message: 'Email address is already registered as a doctor.' });
      }

      if (pendingRecord) {
        if (pendingRecord.status === 'suspended') {
          return res.status(400).json({
            message: 'Email address is suspended.',
            isSuspended: true,
            email: pendingRecord.email
          });
        }
        if (pendingRecord.status === 'pending') {
          return res.status(400).json({ message: 'Your doctor application is already under review.' });
        }
        if (pendingRecord.status === 'rejected') {
          return res.status(400).json({
            message: 'Your previous doctor application was rejected.',
            rejectionReason: pendingRecord.rejectionReason || 'No specific reasons provided.'
          });
        }
        return res.status(400).json({ message: 'Email address is already registered as a doctor.' });
      }

      const phoneExists = await Doctor.findOne({ phone: phone.trim() }) ||
        await PendingDoctor.findOne({ phone: phone.trim() });
      if (phoneExists) {
        return res.status(400).json({ message: 'Phone number is already registered.' });
      }

      const phoneOtp = generateOtp();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

      const { geocodeAddress } = require('../utils/geocoder');
      let coordinates;

      if (latitude !== undefined && latitude !== '' && longitude !== undefined && longitude !== '') {
        const lat = Number(latitude);
        const lng = Number(longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          coordinates = [lng, lat];
        }
      }

      if (!coordinates) {
        coordinates = await geocodeAddress(address);
      }

      const doctor = await PendingDoctor.create({
        name,
        email: email.toLowerCase().trim(),
        password,
        phone: phone.trim(),
        specialization: specialty,
        experienceYears: Number(experience) || 5,
        consultationFee: Number(fee),
        activeHours: activeHours || '09:00 AM - 05:00 PM',
        profileImage: profileImage || '',
        bio: bio || '',
        emailVerified: true,
        phoneOtp,
        phoneOtpExpires: otpExpires,
        address: address.trim(),
        location: {
          type: 'Point',
          coordinates
        }
      });





      (async () => {
        try {
          const formattedPhone = doctor.phone.startsWith('+') ? doctor.phone : `+91${doctor.phone}`;
          await twilioService.sendOtpToPhoneNumber(formattedPhone);
        } catch (twilioErr) {
          console.warn(`Twilio SMS send failed (Bypassed in dev. Phone OTP is: ${phoneOtp}). Error:`, twilioErr.message);
        }
      })();

      const token = generateToken(doctor._id);
      setJwtCookie(res, token);

      return res.status(201).json({
        message: 'Doctor account created. Please verify your Phone OTP.',
        token,
        email: doctor.email,
        phone: doctor.phone,
        user: {
          id: doctor._id,
          name: doctor.name,
          email: doctor.email,
          role: 'doctor',
          emailVerified: true,
          phoneVerified: false,
          status: 'pending',
          isVerified: false,
        },
      });
    } else {
      if (!phone) {
        return res.status(400).json({ message: 'Phone number is required for patient registration.' });
      }

      const emailExists = await User.findOne({ email: email.toLowerCase().trim() });
      if (emailExists) {
        return res.status(400).json({ message: 'Email address is already in use.' });
      }

      const phoneExists = await User.findOne({ phone: phone.trim() });
      if (phoneExists) {
        return res.status(400).json({ message: 'Phone number is already in use.' });
      }

      const user = await User.create({
        name,
        email: email.toLowerCase().trim(),
        password,
        phone: phone.trim(),
      });

      const token = generateToken(user._id);
      setJwtCookie(res, token);

      return res.status(201).json({
        message: 'Patient registration successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: 'patient',
          profileImage: user.profileImage,
        },
      });
    }
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: 'Error registering account.', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, phone, password, role = 'patient' } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required.' });
    }

    if (role === 'admin') {
      if (!email) {
        return res.status(400).json({ message: 'Email is required for admin login.' });
      }

      const user = await User.findOne({ email: email.toLowerCase().trim(), role: 'admin' }).select('+password');
      if (!user) {
        return res.status(401).json({ message: 'Invalid admin credentials.' });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid admin credentials.' });
      }

      const token = generateToken(user._id);
      setJwtCookie(res, token);

      return res.status(200).json({
        message: 'Logged in successfully as admin',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: 'admin',
          profileImage: user.profileImage,
        },
      });
    }

    if (role === 'doctor') {
      if (!email) {
        return res.status(400).json({ message: 'Email is required for doctor login.' });
      }

      let doctor = await Doctor.findOne({ email: email.toLowerCase().trim() }).select('+password');
      if (!doctor) {
        doctor = await PendingDoctor.findOne({ email: email.toLowerCase().trim() }).select('+password');
        if (!doctor) {
          return res.status(401).json({ message: 'Invalid credentials.' });
        }
      }

      const isMatch = await doctor.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      if (doctor.status === 'pending') {
        return res.status(403).json({ message: 'Your application is under review.' });
      }
      if (doctor.status === 'rejected') {
        return res.status(403).json({
          message: 'Your application was rejected.',
          rejectionReason: doctor.rejectionReason
        });
      }
      if (doctor.status === 'suspended') {
        return res.status(403).json({
          message: 'Your account has been suspended.',
          isSuspended: true,
          email: doctor.email
        });
      }

      const token = generateToken(doctor._id);
      setJwtCookie(res, token);

      return res.status(200).json({
        message: 'Logged in successfully as doctor',
        token,
        user: {
          id: doctor._id,
          name: doctor.name,
          email: doctor.email,
          role: 'doctor',
          profileImage: doctor.profileImage,
          emailVerified: doctor.emailVerified,
          phoneVerified: doctor.phoneVerified,
          status: doctor.status,
          isVerified: doctor.isVerified,
        },
      });
    } else {
      if (!phone) {
        return res.status(400).json({ message: 'Phone number is required for login.' });
      }

      const user = await User.findOne({ phone: phone.trim() }).select('+password');
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const token = generateToken(user._id);
      setJwtCookie(res, token);

      return res.status(200).json({
        message: 'Logged in successfully as patient',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: 'patient',
          profileImage: user.profileImage,
        },
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error logging in.', error: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving profile.' });
  }
};

const verifyEmailOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ message: 'OTP code is required.' });
    }

    let doctor = await PendingDoctor.findById(req.user.id);
    if (!doctor) {
      doctor = await Doctor.findById(req.user.id);
    }
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found.' });
    }

    if (doctor.emailOtp !== otp || new Date() > doctor.emailOtpExpires) {
      return res.status(400).json({ message: 'Invalid or expired Email OTP code.' });
    }

    doctor.emailVerified = true;
    doctor.emailOtp = undefined;
    doctor.emailOtpExpires = undefined;
    await doctor.save();

    res.status(200).json({ message: 'Email verified successfully.', emailVerified: true });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error during email verification.' });
  }
};

const verifyPhoneOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ message: 'OTP code is required.' });
    }

    let doctor = await PendingDoctor.findById(req.user.id);
    if (!doctor) {
      doctor = await Doctor.findById(req.user.id);
    }
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found.' });
    }

    let verified = false;

    if (doctor.phoneOtp && doctor.phoneOtp === otp && new Date() < doctor.phoneOtpExpires) {
      verified = true;
    } else {
      try {
        const formattedPhone = doctor.phone.startsWith('+') ? doctor.phone : `+91${doctor.phone}`;
        const verificationResult = await twilioService.verifyOtp(formattedPhone, otp);
        if (verificationResult && verificationResult.status === 'approved') {
          verified = true;
        }
      } catch (twilioErr) {
      }
    }

    if (!verified) {
      return res.status(400).json({ message: 'Invalid or expired Phone OTP verification code.' });
    }

    doctor.phoneVerified = true;
    doctor.phoneOtp = undefined;
    doctor.phoneOtpExpires = undefined;
    await doctor.save();

    res.status(200).json({ message: 'Phone number verified successfully.', phoneVerified: true });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error during phone verification.' });
  }
};

const uploadGovernmentId = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ message: 'File size exceeds maximum limit of 5MB.' });
    }

    const fileInfo = await FileType.fromBuffer(req.file.buffer);
    if (!fileInfo || !['application/pdf', 'image/jpeg', 'image/png'].includes(fileInfo.mime)) {
      return res.status(400).json({
        message: 'Invalid file signature (magic bytes). Allowed types: PDF, JPG, JPEG, PNG.'
      });
    }

    let doctor = await PendingDoctor.findById(req.user.id);
    if (!doctor) {
      doctor = await Doctor.findById(req.user.id);
    }
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found.' });
    }

    const result = await uploadFromBuffer(req.file.buffer, req.file.originalname);

    doctor.governmentIdUrl = result.secure_url;
    await doctor.save();

    res.status(200).json({
      message: 'ID document uploaded successfully.',
      governmentIdUrl: result.secure_url
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error during ID upload.', error: error.message });
  }
};

const submitDoctorApplication = async (req, res) => {
  try {
    let doctor = await PendingDoctor.findById(req.user.id);
    if (!doctor) {
      doctor = await Doctor.findById(req.user.id);
    }
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found.' });
    }

    if (!doctor.emailVerified || !doctor.phoneVerified) {
      return res.status(400).json({ message: 'Email and phone number must be verified first.' });
    }

    if (!doctor.governmentIdUrl) {
      return res.status(400).json({ message: 'Government ID document proof must be uploaded.' });
    }

    doctor.status = 'pending';
    doctor.isVerified = false;
    await doctor.save();

    res.status(200).json({
      message: 'Doctor application submitted successfully under review.',
      doctor
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error during application submission.' });
  }
};

const getSuspensionDetails = async (req, res) => {
  try {
    const { email } = req.params;
    const doctor = await Doctor.findOne({ email: email.toLowerCase().trim() }) ||
      await PendingDoctor.findOne({ email: email.toLowerCase().trim() });

    if (!doctor || doctor.status !== 'suspended') {
      return res.status(404).send('<h1>Suspension details not found for this account.</h1>');
    }

    const suspensionDate = doctor.updatedAt ? new Date(doctor.updatedAt) : new Date();
    const formattedDate = suspensionDate.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
    const formattedTime = suspensionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AeroHealth Account Suspension Details</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
        <style>
          body {
            background-color: #0b0f19;
            color: #ffffff;
            font-family: 'Outfit', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 24px;
            box-sizing: border-box;
          }
          .card {
            background: linear-gradient(135deg, rgba(13, 17, 29, 0.85) 0%, rgba(22, 28, 45, 0.85) 100%);
            border: 1px solid rgba(239, 68, 68, 0.25);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(12px);
            border-radius: 16px;
            max-width: 500px;
            width: 100%;
            padding: 40px;
            text-align: center;
          }
          .icon-container {
            width: 64px;
            height: 64px;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.35);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px auto;
            color: #ef4444;
            font-size: 2rem;
            font-weight: bold;
          }
          h1 {
            font-size: 1.6rem;
            font-weight: 800;
            margin: 0 0 12px 0;
            color: #ffffff;
          }
          .doctor-name {
            font-size: 1.1rem;
            color: #94a3b8;
            margin-bottom: 24px;
          }
          .meta-item {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
            text-align: left;
            font-size: 0.9rem;
          }
          .meta-label {
            color: #64748b;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
          }
          .meta-value {
            font-weight: 600;
            color: #f1f5f9;
          }
          .reason-box {
            background: rgba(239, 68, 68, 0.03);
            border: 1px solid rgba(239, 68, 68, 0.15);
            border-radius: 8px;
            padding: 16px;
            margin-top: 20px;
            text-align: left;
            font-size: 0.9rem;
            line-height: 1.5;
            color: #fca5a5;
          }
          .reason-label {
            color: #ef4444;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 6px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-container">⚠️</div>
          <h1>Account Suspended</h1>
          <div class="doctor-name">Dr. ${doctor.name}</div>

          <div class="meta-item">
            <div class="meta-label">Suspension Date & Time</div>
            <div class="meta-value">${formattedDate} at ${formattedTime}</div>
          </div>

          <div class="meta-item">
            <div class="meta-label">Account Email</div>
            <div class="meta-value">${doctor.email}</div>
          </div>

          <div class="reason-box">
            <div class="reason-label">Reasons for Suspension</div>
            <div>${doctor.rejectionReason || 'No specific reasons provided by the administrator.'}</div>
          </div>
        </div>
      </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    res.status(500).send('<h1>Server Error: Could not load suspension details.</h1>');
  }
};

const logout = async (req, res) => {
  try {
    let token = req.cookies ? req.cookies.jwt : null;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    const isProd = process.env.NODE_ENV === 'production' || process.env.FRONTEND_URL?.includes('onrender.com');
    res.clearCookie('jwt', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax'
    });

    if (token) {
      const decoded = jwt.decode(token);
      const redisClient = require('../config/redisClient');

      if (decoded && decoded.exp) {
        const currentTime = Math.floor(Date.now() / 1000);
        const timeLeft = decoded.exp - currentTime;

        if (timeLeft > 0) {
          try {
            if (redisClient.isOpen) {
              await redisClient.set(`token:${token}`, 'blocked', {
                EX: timeLeft
              });
            }
          } catch (redisErr) {
          }
        }
      }
    }

    res.status(200).json({ message: 'Logged out successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error during logout process.', error: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
  verifyEmailOtp,
  verifyPhoneOtp,
  uploadGovernmentId,
  submitDoctorApplication,
  getSuspensionDetails,
  logout,
};
