import { createRestAPIClient } from 'masto';
import config from '../../config/index.js';
import fs from 'fs/promises';

const postToMastodon = async (text, imagePath) => {
  try {
    console.log('Starting Mastodon post...');
    
    // Initialize Mastodon client
    console.log('Initializing Mastodon client with URL:', config.mastodon.instanceUrl);
    const client = createRestAPIClient({
      url: config.mastodon.instanceUrl,
      accessToken: config.mastodon.accessToken
    });
    console.log('Mastodon client initialized successfully');

    // Read image file
    console.log('Reading image file:', imagePath);
    const imageBuffer = await fs.readFile(imagePath);
    console.log('Image read successfully, size:', imageBuffer.length, 'bytes');

    // Upload media
    console.log('Uploading media to Mastodon...');
    try {
      // Create media from the image buffer
      const attachment = await client.v2.media.create({
        file: new Blob([imageBuffer]),
        description: text
      });
      console.log('Media uploaded successfully:', attachment.id);

      // Create status with media
      console.log('Creating status with text:', text);
      const status = await client.v1.statuses.create({
        status: text,
        visibility: 'public',
        media_ids: [attachment.id]
      });

      console.log('Mastodon post successful:', status.id);
      return status;
    } catch (uploadErr) {
      console.error('Error during media upload or status creation:', uploadErr);
      if (uploadErr.response) {
        console.error('Response data:', uploadErr.response.data);
        console.error('Response status:', uploadErr.response.status);
      }
      throw uploadErr;
    }
  } catch (err) {
    console.error('Error posting to Mastodon:', err);
    if (err.response) {
      console.error('Response data:', err.response.data);
      console.error('Response status:', err.response.status);
    }
    throw err;
  }
};

export { postToMastodon }; 