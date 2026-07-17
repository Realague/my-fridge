import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads an image file to Cloudinary
 * @param imageFilePath - Path to the image file
 * @param publicId - Optional public ID for the image (defaults to filename without extension)
 * @param folder - Optional folder in Cloudinary (defaults to 'items')
 * @returns Cloudinary URL or null if upload fails
 */
export async function uploadImageToCloudinary(
  imageFilePath: string,
  publicId?: string,
  folder: string = 'items'
): Promise<string | null> {
  try {

    // Check if file exists
    if (!fs.existsSync(imageFilePath)) {
      console.warn(`Image file not found: ${imageFilePath}`);
      return null;
    }

    // Extract filename without extension for public_id if not provided
    if (!publicId) {
      const filename = path.basename(imageFilePath);
      publicId = path.parse(filename).name;
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(imageFilePath, {
      folder,
      public_id: publicId,
      overwrite: false, // Don't overwrite existing images
      resource_type: 'image',
    });

    return result.secure_url;
  } catch (error) {
    console.error(`Failed to upload image ${imageFilePath}:`, error);
    return null;
  }
}

/**
 * Uploads a remote image URL to Cloudinary. Cloudinary fetches the URL
 * server-side, so this works for logo.dev image URLs.
 * @returns Cloudinary secure URL, or null if the upload/fetch fails.
 */
export async function uploadImageFromUrl(
  imageUrl: string,
  publicId: string,
  folder: string = 'brands'
): Promise<string | null> {
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder,
      public_id: publicId,
      overwrite: false,
      resource_type: 'image',
    });
    return result.secure_url;
  } catch (error) {
    console.error(`Failed to upload image from URL ${imageUrl}:`, error);
    return null;
  }
}

/**
 * Uploads multiple images to Cloudinary in batch
 * @param imageFiles - Array of objects with filePath and optional publicId
 * @param folder - Optional folder in Cloudinary (defaults to 'items')
 * @returns Map of image filename to Cloudinary URL
 */
export async function uploadImagesBatch(
  imageFiles: Array<{ filePath: string; publicId?: string }>,
  folder: string = 'items'
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  
  // Process in batches to avoid overwhelming Cloudinary
  const batchSize = 10;
  for (let i = 0; i < imageFiles.length; i += batchSize) {
    const batch = imageFiles.slice(i, i + batchSize);
    const uploadPromises = batch.map(async ({ filePath, publicId }) => {
      const url = await uploadImageToCloudinary(filePath, publicId, folder);
      if (url) {
        const filename = path.basename(filePath);
        results.set(filename, url);
      }
      return url;
    });

    await Promise.all(uploadPromises);
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < imageFiles.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Extracts the public_id from a Cloudinary URL
 * @param imageUrl - Cloudinary image URL
 * @returns Public ID with folder path, or null if URL is invalid
 */
function extractPublicIdFromUrl(imageUrl: string): string | null {
  try {
    // Cloudinary URLs are in format:
    // https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{public_id}.{extension}
    // or: https://res.cloudinary.com/{cloud_name}/image/upload/{folder}/{public_id}.{extension}
    
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    
    // Find the index of 'upload' in the path
    const uploadIndex = pathParts.indexOf('upload');
    if (uploadIndex === -1 || uploadIndex === pathParts.length - 1) {
      return null;
    }
    
    // Get the parts after 'upload' (version and folder/public_id)
    const partsAfterUpload = pathParts.slice(uploadIndex + 1);
    
    // Remove version if present (starts with 'v' followed by numbers)
    if (partsAfterUpload.length > 0 && partsAfterUpload[0] && /^v\d+$/.test(partsAfterUpload[0])) {
      partsAfterUpload.shift();
    }
    
    if (partsAfterUpload.length === 0) {
      return null;
    }
    
    // Join remaining parts and remove file extension
    const publicIdWithExtension = partsAfterUpload.join('/');
    const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, '');
    
    return publicId || null;
  } catch (error) {
    console.error(`Failed to extract public_id from URL ${imageUrl}:`, error);
    return null;
  }
}

/**
 * Deletes an image from Cloudinary
 * @param imageUrl - Cloudinary image URL to delete
 * @returns true if deletion was successful, false otherwise
 */
export async function deleteImageFromCloudinary(imageUrl: string): Promise<boolean> {
  try {
    if (!imageUrl) {
      return false;
    }

    // Check if it's a Cloudinary URL
    if (!imageUrl.includes('cloudinary.com')) {
      console.warn(`Image URL is not a Cloudinary URL: ${imageUrl}`);
      return false;
    }

    // Extract public_id from URL
    const publicId = extractPublicIdFromUrl(imageUrl);
    if (!publicId) {
      console.warn(`Could not extract public_id from URL: ${imageUrl}`);
      return false;
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    });

    if (result.result === 'ok' || result.result === 'not found') {
      // 'not found' is acceptable - image might already be deleted
      console.log(`Successfully deleted image from Cloudinary: ${publicId}`);
      return true;
    } else {
      console.error(`Failed to delete image from Cloudinary: ${publicId}`, result);
      return false;
    }
  } catch (error) {
    console.error(`Error deleting image ${imageUrl} from Cloudinary:`, error);
    return false;
  }
}

