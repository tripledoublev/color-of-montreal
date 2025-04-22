import { getColor, hex, findNearest } from '../tools.js';
import { postToTwitter } from './services/social/twitter.js';
import { initBluesky, postToBluesky } from './services/social/bluesky.js';
import { postToMastodon } from './services/social/mastodon.mjs';
import { optimizeImage } from './services/image/optimize.js';
import { getImage } from './services/image.js';
import config from './config/index.js';
import { getSleepInterval } from './services/timing.js';
import { updateMetadata } from './services/metadata.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const loop = async () => {
  try {
    console.log('Fetching new image...');
    // Get image and process it
    const { imgData, location, color: detectedColor } = await getImage();
    
    console.log('Image captured successfully');
    console.log('Detected color:', detectedColor);
    
    const name = detectedColor.name;
    const text = `${name} est la couleur du ciel de ${config.location}`;
    
    // Optimize image for social media
    const outputPath = path.join(rootDir, 'output.png');
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const optimizedImagePath = path.join(rootDir, `${timestamp}__${detectedColor.hex.replace(/^#/, '')}.webp`);
    console.log('Optimizing image...');
    await optimizeImage(outputPath, optimizedImagePath);
    console.log('Image optimization complete');
    
    // Add a small delay to ensure file is written
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update metadata
    console.log('Updating metadata...');
    await updateMetadata({
      filename: optimizedImagePath,
      color: {
        hex: detectedColor.hex,
        name: detectedColor.name
      }
    });
    console.log('Metadata updated successfully');
    
    // Create an array of enabled platform posts
    const platformPosts = [];
    
    if (config.platforms.twitter) {
      console.log('Twitter enabled - adding to post queue');
      platformPosts.push(postToTwitter(text, optimizedImagePath));
    }
    if (config.platforms.bluesky) {
      console.log('Bluesky enabled - adding to post queue');
      platformPosts.push(postToBluesky(text, optimizedImagePath));
    }
    if (config.platforms.mastodon) {
      console.log('Mastodon enabled - adding to post queue');
      platformPosts.push(postToMastodon(text, optimizedImagePath));
    }
    
    // Post to enabled platforms
    if (platformPosts.length > 0) {
      console.log(`Posting to ${platformPosts.length} platform(s)...`);
      await Promise.all(platformPosts);
      console.log('All posts completed successfully');
    } else {
      console.log('No platforms enabled for posting');
    }
  } catch (error) {
    console.error("Error in main loop:", error.message);
    console.error(error.stack);
  }

  const sleep = getSleepInterval(new Date());
  console.log(`Sleeping for ${Math.round(sleep/1000)} seconds...`);
  setTimeout(loop, sleep);
};

// Initialize and start
const start = async () => {
  try {
    console.log('Starting color-of-montreal with platforms:');
    console.log('- Twitter:', config.platforms.twitter ? 'enabled' : 'disabled');
    console.log('- Bluesky:', config.platforms.bluesky ? 'enabled' : 'disabled');
    console.log('- Mastodon:', config.platforms.mastodon ? 'enabled' : 'disabled');

    if (config.platforms.bluesky) {
      await initBluesky();
    }
    
    loop();
  } catch (err) {
    console.error('Failed to initialize:', err.message);
    process.exit(1);
  }
};

start(); 