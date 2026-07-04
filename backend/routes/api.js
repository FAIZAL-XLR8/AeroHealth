const express = require('express');
const multer = require('multer');
const router = express.Router();

const doctorController = require('../controllers/doctorController');
const appointmentController = require('../controllers/appointmentController');
const patientDashboardController = require('../controllers/patientDashboardController');
const doctorDashboardController = require('../controllers/doctorDashboardController');
const aiController = require('../controllers/aiController');
const chatbotController = require('../controllers/chatbotController');
const prescriptionController = require('../controllers/prescriptionController');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');
const apiRateLimiter = require('../middleware/rateLimiter');

const fileAnalyzeLimiter = apiRateLimiter({
  windowSeconds: 60,
  keyPrefix: 'rateLimit:fileAnalyze',
  message: 'Analysis rate limit exceeded. Please wait 10 seconds.'
});

const chatbotLimiter = apiRateLimiter({
  windowSeconds: 2,
  keyPrefix: 'rateLimit:chatbot',
  message: 'Chatbot rate limit exceeded. Please wait 2 seconds.'
});
const videoController = require('../controllers/videoController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});



router.get('/doctors/search', doctorController.searchDoctors);
router.get('/doctors/compare', doctorController.compareDoctors);



const paymentController = require('../controllers/paymentController');
const messageController = require('../controllers/messageController');
router.get('/appointments/slots/:doctorId', appointmentController.getAvailableSlots);
router.post('/appointments/reserve', protect, appointmentController.reserveSlot);
router.post('/appointments/cancel-reservation', protect, appointmentController.cancelReservation);
router.get('/appointments/patient/dashboard', protect, patientDashboardController.getPatientDashboard);
router.get('/appointments/doctor/dashboard', protect, doctorDashboardController.getDoctorDashboard);
router.get('/appointments/patient/:patientId', protect, patientDashboardController.getPatientAppointments);



router.post('/payments/create-checkout-session', protect, paymentController.createCheckoutSession);
router.post('/payments/verify-checkout-session', protect, paymentController.verifyCheckoutSession);



router.get('/messages/:appointmentId', protect, messageController.getChatHistory);
router.post('/messages/upload', protect, upload.single('media'), messageController.uploadMediaMessage);
router.delete('/messages/:messageId', protect, messageController.deleteMessage);
router.get('/videos/signature/:appointmentId', protect, videoController.generateUploadSignature);
router.post('/videos/metadata', protect, videoController.saveVideoMetadata);
router.delete('/videos/:appointmentId', protect, videoController.deleteVideo);


router.post('/reports/analyze', protect, fileAnalyzeLimiter, upload.single('report'), aiController.analyzeReport);
router.post('/prescriptions/analyze', protect, fileAnalyzeLimiter, upload.single('prescription'), prescriptionController.analyzePrescription);
router.post('/ai/chatbot', chatbotLimiter, chatbotController.handleChatbotMessage);
router.post('/ai/chat-triage', chatbotLimiter, aiController.chatTriage);



router.get('/admin/doctors', protect, isAdmin, adminController.getPendingDoctors);
router.post('/admin/doctors/:doctorId/approve', protect, isAdmin, adminController.approveDoctor);
router.post('/admin/doctors/:doctorId/reject', protect, isAdmin, adminController.rejectDoctor);
router.post('/admin/doctors/:doctorId/suspend', protect, isAdmin, adminController.suspendDoctor);

module.exports = router;

