const { TwitterApi } = require('twitter-api-v2');
const config = require('../../config');
const fs = require('fs');

const twitterClient = new TwitterApi(config.twitter);

const postToTwitter = async (text, imagePath) => {
  try {
    if (!fs.existsSync(imagePath)) {
      console.error('File does not exist:', imagePath);
      return;
    }

    // Upload media using v1.1
    const mediaId = await twitterClient.v1.uploadMedia(imagePath);

    // Create tweet with media using v2
    const tweetResponse = await twitterClient.v2.tweetThread([{ 
      text, 
      media: { media_ids: [mediaId] }
    }]);
    
    console.log('Twitter status updated:', text);
    return tweetResponse;
  } catch (err) {
    console.error('Error posting to Twitter:', err);
    throw err;
  }
};

module.exports = {
  postToTwitter
}; 