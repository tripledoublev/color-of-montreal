import { BskyAgent } from '@atproto/api';
import { promises as fs } from 'fs';
import config from '../../config/index.js';
import sharp from 'sharp';

const agent = new BskyAgent({
  service: 'https://bsky.social'
});

const initBluesky = async () => {
  try {
    console.log('Initializing Bluesky session...');
    console.log('Using handle:', config.bluesky.handle);
    await agent.login({
      identifier: config.bluesky.handle,
      password: config.bluesky.password
    });
    console.log('Bluesky session initialized successfully');
  } catch (err) {
    console.error('Error initializing Bluesky session:', err);
    if (err.response) {
      console.error('Response data:', err.response.data);
      console.error('Response status:', err.response.status);
    }
    throw err;
  }
};

const postToBluesky = async (text, imagePath) => {
  try {
    console.log('Attempting Bluesky login with:', {
      handle: config.bluesky.handle,
      password: config.bluesky.password ? 'present' : 'missing'
    });
    
    await agent.login({
      identifier: config.bluesky.handle,
      password: config.bluesky.password
    });
    console.log('Bluesky login successful');

    const imageBuffer = await fs.readFile(imagePath);
    
    // Check file size limit (1MB)
    if (imageBuffer.length > 1000000) {
      throw new Error(`Image file size too large. 1000000 bytes maximum, got: ${imageBuffer.length}`);
    }
    
    console.log('Image loaded successfully, size:', imageBuffer.length);
    
    // Get image dimensions for aspect ratio
    const metadata = await sharp(imageBuffer).metadata();
    const aspectRatio = {
      width: metadata.width,
      height: metadata.height
    };
    
    // Upload the image with explicit MIME type
    const imageUpload = await agent.uploadBlob(imageBuffer, {
      encoding: 'image/webp',
      headers: {
        'Content-Type': 'image/webp'
      }
    });
    
    if (!imageUpload?.data?.blob) {
      console.error('Upload response:', imageUpload);
      throw new Error('Image upload failed - no blob returned');
    }
    
    console.log('Image uploaded successfully, blob:', imageUpload.data.blob);

    const postData = {
      text,
      embed: {
        $type: 'app.bsky.embed.images',
        images: [{
          image: imageUpload.data.blob,
          alt: 'Color of Montreal',
          aspectRatio
        }]
      }
    };

    await agent.post(postData);
    console.log('Posted to Bluesky successfully');
  } catch (err) {
    console.error('Detailed Bluesky error:', {
      message: err.message,
      code: err.code,
      status: err.status,
      data: err.data,
      errors: err.errors,
      response: err.response
    });
    throw err;
  }
};

export {
  initBluesky,
  postToBluesky
}; 