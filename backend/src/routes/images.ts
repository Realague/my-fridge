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

// Generate signed upload signature
router.post('/signature', async (req: Request, res: Response) => {
  try {
    const { folder = 'myfridge' } = req.body;
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder,
        upload_preset: 'myfridge_uploads',
      },
      process.env.CLOUDINARY_API_SECRET!
    );

    res.json({
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder,
    });
  } catch (error) {
    console.error('Error generating Cloudinary signature:', error);
    res.status(500).json({ 
      error: 'Failed to generate upload signature',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
