const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const PendingDoctor = require('../models/PendingDoctor');
const redisClient = require('../config/redisClient');

const protect = async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {

      let isBlocked = false;
      try {
        if (redisClient.isOpen) {
          isBlocked = await redisClient.exists(`token:${token}`);
        }
      } catch (redisErr) {
      }

      if (isBlocked) {
        return res.status(401).json({ message: 'Not authorized, token is invalid/logged out' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET );

      let account = await User.findById(decoded.id).select('-password');

      if (!account) {
        account = await Doctor.findById(decoded.id).select('-password');
        if (account) {
          account = { ...account.toObject(), role: 'doctor', id: account._id };
        } else {
          account = await PendingDoctor.findById(decoded.id).select('-password');
          if (account) {
            account = { ...account.toObject(), role: 'doctor', id: account._id };
          }
        }
      } else {
        account = { ...account.toObject(), role: account.role || 'patient', id: account._id };
      }

      if (!account) {
        return res.status(401).json({ message: 'Not authorized, account not found' });
      }

      req.user = account;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token verification failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Admin access required.' });
  }
};

const requireApprovedDoctor = (req, res, next) => {
  if (req.user && req.user.role === 'doctor') {
    if (req.user.status !== 'approved' || !req.user.isVerified) {
      return res.status(403).json({ message: 'Access denied. Doctor profile is not approved or verified.' });
    }
  }
  next();
};

module.exports = { protect, isAdmin, requireApprovedDoctor };
