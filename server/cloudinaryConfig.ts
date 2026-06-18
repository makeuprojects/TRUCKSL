import './sanitizeEnv';
import { v2 as cloudinary } from 'cloudinary';

// Support CLOUDINARY_URL or broken-down credentials
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    secure: true
  });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
    api_key: process.env.CLOUDINARY_API_KEY || 'demo_key',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'demo_secret',
    secure: true
  });
}

console.log('[Cloudinary Config] Configured with Cloud Name:', cloudinary.config().cloud_name);

export default cloudinary;
