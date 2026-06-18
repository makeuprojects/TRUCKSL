import express from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import cloudinary from './cloudinaryConfig';

// Store files in memory so we do not clutter disk in serverless/container environment
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // max 10MB per file
  },
});

/**
 * Uploads a file buffer directly to Cloudinary via upload_stream
 */
export function uploadToCloudinary(fileBuffer: Buffer, folderName = 'fleet_comprobantes'): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folderName, resource_type: 'auto' },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary Upload Error]', error);
          return reject(error);
        }
        if (!result) {
          return reject(new Error('No upload result returned from Cloudinary.'));
        }
        resolve(result.secure_url);
      }
    );

    const stream = new Readable();
    stream.push(fileBuffer);
    stream.push(null);
    stream.pipe(uploadStream);
  });
}

/**
 * Express handler for multiple image uploads
 */
export async function handleMultipleUploads(req: express.Request, res: express.Response) {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No se subieron archivos.' });
    }

    console.log(`[Upload API] Processing execution for ${files.length} attachments...`);

    // Upload all buffers concurrently
    const uploadPromises = files.map((file) => uploadToCloudinary(file.buffer));
    const urls = await Promise.all(uploadPromises);

    res.json({
      success: true,
      urls,
    });
  } catch (error: any) {
    console.error('[Upload Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Error occurred during image upload.' });
  }
}
