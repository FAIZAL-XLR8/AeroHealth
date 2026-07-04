const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  register,
  login,
  getMe,
  verifyEmailOtp,
  verifyPhoneOtp,
  uploadGovernmentId,
  submitDoctorApplication,
  getSuspensionDetails,
  logout,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/register', register);
router.post('/login', login);
router.get('/suspension-details/:email', getSuspensionDetails);

router.get('/me', protect, getMe);
router.post('/verify-email-otp', protect, verifyEmailOtp);
router.post('/verify-phone-otp', protect, verifyPhoneOtp);
router.post('/upload-id', protect, upload.single('media'), uploadGovernmentId);
router.post('/submit-application', protect, submitDoctorApplication);
router.post('/logout', protect, logout);

module.exports = router;
