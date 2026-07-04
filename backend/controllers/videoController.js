const { cloudinary } = require('../services/cloudinaryService');
const Video = require('../models/Video');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');

const generateUploadSignature = async (req, res) => {
  try {
    const userId = req.user.id;
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const payment = await Payment.findOne({ appointmentId, paymentStatus: 'paid' });
    const start = payment ? payment.createdAt : appointment.createdAt;
    const expiresAt = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (new Date() >= expiresAt) {
      return res.status(403).json({ error: 'Consultation Period Expired' });
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const publicId = `telemedicine-videos/${appointmentId}/${userId}_${timestamp}`;

    const uploadParams = {
      timestamp: timestamp,
      public_id: publicId,
    };

    const signature = cloudinary.utils.api_sign_request(
      uploadParams,
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      signature,
      timestamp,
      public_id: publicId,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      upload_url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to generate upload signature' });
  }
};

const saveVideoMetadata = async (req, res) => {
  try {
    const {
      appointmentId,
      cloudinaryPublicId,
      secureUrl,
      duration,
    } = req.body;

    const userId = req.user.id;

    const cloudinaryResource = await cloudinary.api.resource(
      cloudinaryPublicId,
      { resource_type: 'video' }
    );

    if (!cloudinaryResource) {
      return res.status(400).json({
        error: 'Video not found on Cloudinary',
      });
    }

    const video = await Video.create({
      appointmentId,
      userId,
      cloudinaryPublicId,
      secureUrl,
      duration: cloudinaryResource.duration || duration,
      format: cloudinaryResource.format,
      resourceType: 'video'
    });

    res.status(201).json({
      message: 'Video metadata saved successfully',
      video: {
        id: video._id,
        duration: video.duration,
        uploadedAt: video.createdAt,
        secureUrl: video.secureUrl
      },
    });

  } catch (error) {
    res.status(500).json({
      error: 'Something went wrong',
    });
  }
};

const deleteVideo = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user.id;

    const video = await Video.findOneAndDelete({ appointmentId });
    if (!video) {
      return res.status(404).json({
        error: 'Video not found',
      });
    }

    await cloudinary.uploader.destroy(
      video.cloudinaryPublicId,
      {
        resource_type: 'video',
        invalidate: true,
      }
    );

    res.json({
      message: 'Video deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete video',
    });
  }
};

module.exports = {
  generateUploadSignature,
  saveVideoMetadata,
  deleteVideo
};
