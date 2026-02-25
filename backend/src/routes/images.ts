import { Router, Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { authenticateGoogleToken } from '../middleware/auth';

const router = Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Apply authentication middleware to all routes
router.use(authenticateGoogleToken);

// Generate signed upload signature for direct browser uploads
router.post('/signature', async (req: Request, res: Response) => {
  try {
    let folder: string | undefined;
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      folder = body?.folder;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid request body' });
    }
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder,
      },
      process.env.CLOUDINARY_API_SECRET!
    );

    return res.json({
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder,
    });
  } catch (error) {
    console.error('Error generating Cloudinary signature:', error);
    return res.status(500).json({ 
      error: 'Failed to generate upload signature',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Upload an image to Cloudinary from a remote URL (used for imported recipes)
router.post('/import-from-url', async (req: Request, res: Response) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const imageUrl = body?.url as string | undefined;
    const folder = body?.folder as string | undefined;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    try {
      const result = await cloudinary.uploader.upload(imageUrl, {
        folder,
      });

      return res.json({
        secureUrl: result.secure_url,
        publicId: result.public_id,
      });
    } catch (uploadError) {
      console.error('Error uploading image from URL to Cloudinary:', uploadError);
      return res.status(500).json({
        error: 'Failed to upload image from URL',
        message: uploadError instanceof Error ? uploadError.message : 'Unknown error',
      });
    }
  } catch (error) {
    console.error('Error handling import-from-url request:', error);
    return res.status(500).json({
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
