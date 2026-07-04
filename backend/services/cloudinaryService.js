const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadFromBuffer = (fileBuffer, originalName, folder = 'telemedicine_verification_docs') => {
  return new Promise((resolve, reject) => {
    const ext = originalName.split('.').pop().toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg'].includes(ext);
    const isVideo = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'flv', 'mkv', 'mp3', 'wav'].includes(ext);
    const resourceType = isImage ? 'image' : (isVideo ? 'video' : 'raw');

    const cleanName = originalName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const publicId = resourceType === 'raw'
      ? `${cleanName}_${Date.now()}.${ext}`
      : `${cleanName}_${Date.now()}`;

    const options = {
      folder: folder,
      resource_type: resourceType,
      public_id: publicId,
    };

    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        return reject(error);
      }
      resolve(result);
    });

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

module.exports = {
  cloudinary,
  uploadFromBuffer
};
