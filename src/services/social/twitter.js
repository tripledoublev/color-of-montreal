import { TwitterApi } from 'twitter-api-v2';
import config from '../../config/index.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Twitter API Credentials:', {
  consumerKey: config.twitter.appKey ? 'present' : 'missing',
  consumerSecret: config.twitter.appSecret ? 'present' : 'missing',
  accessToken: config.twitter.accessToken ? 'present' : 'missing',
  accessTokenSecret: config.twitter.accessSecret ? 'present' : 'missing'
});

const twitterClient = new TwitterApi({
  appKey: config.twitter.appKey,
  appSecret: config.twitter.appSecret,
  accessToken: config.twitter.accessToken,
  accessSecret: config.twitter.accessSecret
});

const postToTwitter = async (text, imagePath) => {
  try {
    console.log('Attempting to post to Twitter with credentials:', {
      consumerKey: config.twitter.appKey ? 'present' : 'missing',
      consumerSecret: config.twitter.appSecret ? 'present' : 'missing',
      accessToken: config.twitter.accessToken ? 'present' : 'missing',
      accessSecret: config.twitter.accessSecret ? 'present' : 'missing'
    });
    
    // Check if file exists
    try {
      const absolutePath = path.resolve(imagePath);
      console.log('Looking for image at absolute path:', absolutePath);
      console.log('Current working directory:', process.cwd());
      console.log('File exists check for:', imagePath);
      await fs.access(imagePath);
      console.log('Image file exists:', imagePath);
      
      // Try to read the file to verify
      const stats = await fs.stat(imagePath);
      console.log('File stats:', {
        size: stats.size,
        isFile: stats.isFile(),
        permissions: stats.mode.toString(8)
      });
    } catch (err) {
      console.error('File access error:', {
        path: imagePath,
        error: err.message,
        code: err.code,
        syscall: err.syscall
      });
      throw new Error(`Image file not found: ${imagePath}`);
    }
    
    const imageBuffer = await fs.readFile(imagePath);
    console.log('Image loaded successfully, size:', imageBuffer.length);
    
    const mediaId = await twitterClient.v1.uploadMedia(imageBuffer, { mimeType: 'image/webp' });
    console.log('Media uploaded successfully, ID:', mediaId);
    
    await twitterClient.v2.tweet({
      text,
      media: { media_ids: [mediaId] }
    });
    console.log('Tweet posted successfully');
  } catch (err) {
    console.error('Detailed Twitter error:', {
      message: err.message,
      code: err.code,
      status: err.status,
      data: err.data,
      errors: err.errors
    });
    throw err;
  }
};

export { postToTwitter }; 