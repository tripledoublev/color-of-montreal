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
    await agent.login({
      identifier: config.bluesky.username,
      password: config.bluesky.password
    });

    const imageBuffer = await fs.readFile(imagePath);
    const imageUpload = await agent.uploadBlob(imageBuffer, {
      encoding: 'image/webp'
    });

    await agent.post({
      text,
      embed: {
        $type: 'app.bsky.embed.images',
        images: [{
          image: imageUpload.blob,
          alt: 'Color of Montreal'
        }]
      }
    });

    console.log('Posted to Bluesky successfully');
  } catch (err) {
    console.error('Error posting to Bluesky:', err);
    throw err;
  }
};

export {
  initBluesky,
  postToBluesky
}; 