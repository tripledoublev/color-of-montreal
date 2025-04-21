import { TwitterApi } from 'twitter-api-v2';
import config from '../../config/index.js';
import { promises as fs } from 'fs';

console.log('Twitter API Credentials:', {
  consumerKey: config.twitter.appKey ? 'present' : 'missing',
  consumerSecret: config.twitter.appSecret ? 'present' : 'missing',
  accessToken: config.twitter.accessToken ? 'present' : 'missing',
  accessTokenSecret: config.twitter.accessSecret ? 'present' : 'missing'
});

const twitterClient = new TwitterApi({
  consumerKey: config.twitter.appKey,
  consumerSecret: config.twitter.appSecret,
  accessToken: config.twitter.accessToken,
  accessTokenSecret: config.twitter.accessSecret
});

const postToTwitter = async (text, imagePath) => {
  try {
    const imageBuffer = await fs.readFile(imagePath);
    const mediaId = await twitterClient.v1.uploadMedia(imageBuffer, { mimeType: 'image/png' });
    
    await twitterClient.v2.tweet({
      text,
      media: { media_ids: [mediaId] }
    });
  } catch (err) {
    console.error('Error posting to Twitter:', err);
    throw err;
  }
};

export { postToTwitter }; 