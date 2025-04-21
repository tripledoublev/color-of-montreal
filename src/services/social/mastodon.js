const Mastodon = require('mastodon-api');
const fs = require('fs').promises;
const config = require('../../config');

const mastodon = new Mastodon({
  client_key: process.env.MASTODON_CLIENT_KEY,
  client_secret: process.env.MASTODON_CLIENT_SECRET,
  access_token: process.env.MASTODON_ACCESS_TOKEN,
  api_url: process.env.MASTODON_INSTANCE_URL
});

const postToMastodon = async (text, imagePath) => {
  try {
    if (!fs.existsSync(imagePath)) {
      console.error('File does not exist:', imagePath);
      return;
    }

    // Upload the image first
    const mediaResponse = await mastodon.post('media', {
      file: await fs.readFile(imagePath)
    });

    // Then post the status with the media ID
    const statusResponse = await mastodon.post('statuses', {
      status: text,
      media_ids: [mediaResponse.data.id]
    });

    console.log('Mastodon status updated:', text);
    return statusResponse;
  } catch (err) {
    console.error('Error posting to Mastodon:', err);
    throw err;
  }
};

module.exports = {
  postToMastodon
}; 