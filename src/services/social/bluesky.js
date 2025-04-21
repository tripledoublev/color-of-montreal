const { BskyAgent } = require('@atproto/api');
const config = require('../../config');
const fs = require('fs').promises;

const blueskyAgent = new BskyAgent({
  service: 'https://bsky.social'
});

const initBluesky = async () => {
  try {
    await blueskyAgent.login({
      identifier: config.bluesky.handle,
      password: config.bluesky.password
    });
    console.log('Bluesky session initialized');
  } catch (err) {
    console.error('Error initializing Bluesky session:', err);
    throw err;
  }
};

const postToBluesky = async (text, imagePath) => {
  try {
    // Read and upload image
    const imageBuffer = await fs.readFile(imagePath);
    const uploadResponse = await blueskyAgent.uploadBlob(imageBuffer, {
      encoding: 'image/png'
    });

    // Create post with image
    const postResponse = await blueskyAgent.post({
      text,
      embed: {
        $type: 'app.bsky.embed.images',
        images: [{
          image: uploadResponse.blob,
          alt: text
        }]
      },
      createdAt: new Date().toISOString()
    });

    console.log('Bluesky status updated:', text);
    return postResponse;
  } catch (err) {
    console.error('Error posting to Bluesky:', err);
    throw err;
  }
};

module.exports = {
  initBluesky,
  postToBluesky
}; 