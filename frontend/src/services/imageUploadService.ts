import { makeAuthenticatedApiCall } from '@/utils/apiAuth';

export const uploadImageWithSignature = async (folder: string, file: File): Promise<string> => {
  const signatureResponse = await makeAuthenticatedApiCall(
    '/api/images/signature',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { folder },
    },
    { showToast: false }
  );
  const signatureData = await signatureResponse.json();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('signature', signatureData.signature);
  formData.append('timestamp', signatureData.timestamp.toString());
  formData.append('api_key', signatureData.apiKey);
  formData.append('folder', signatureData.folder);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload image');
  }

  const uploadData = await uploadResponse.json();
  return uploadData.secure_url as string;
};

// Upload an image to Cloudinary from a remote URL (used for imported recipes)
export const uploadImageFromUrl = async (folder: string, imageUrl: string): Promise<string> => {
  const response = await makeAuthenticatedApiCall(
    '/api/images/import-from-url',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { url: imageUrl, folder },
    },
    { showToast: false }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || 'Failed to upload image from URL');
  }

  const data = await response.json();
  return data.secureUrl as string;
};

