import dotenv from 'dotenv';

// Configure dotenv
dotenv.config();

// Sane defaults or placeholder cleanup for Cloudinary URL protocol check
if (process.env.CLOUDINARY_URL && !process.env.CLOUDINARY_URL.startsWith('cloudinary://')) {
  console.warn('[Cloudinary Warning] Invalid CLOUDINARY_URL protocol in environment. Removing it to prevent Cloudinary SDK from crashing.');
  delete process.env.CLOUDINARY_URL;
}
