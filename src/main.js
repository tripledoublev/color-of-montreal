const { getImage } = require('./services/image');
const { getSleepInterval } = require('./services/timing');
const { postToTwitter } = require('./services/social/twitter');
const { initBluesky, postToBluesky } = require('./services/social/bluesky');
const { postToMastodon } = require('./services/social/mastodon');
const { optimizeImage } = require('./services/image/optimize');
const config = require('./config');

let lastColor;

const loop = async () => {
  try {
    const { color, location } = await getImage();
    console.log('got image');
    console.log('Color:', color.name);

    if (lastColor !== color.name) {
      lastColor = color.name;
      console.log('sending update');
      
      const text = `${color.name} est la couleur du ciel de montréal`;
      
      // Optimize image for Bluesky
      const optimizedImagePath = './output-optimized.webp';
      await optimizeImage('./output.png', optimizedImagePath);
      
      // Post to all platforms
      await Promise.all([
        postToTwitter(text, './output.png'),
        postToBluesky(text, optimizedImagePath),
        postToMastodon(text, './output.png')
      ]);
    } else {
      console.log("Color hasn't changed:", color.name);
    }
  } catch (error) {
    console.error("Error in loop: ", error.message);
  }

  const sleep = getSleepInterval(new Date());
  setTimeout(loop, sleep);
};

// Initialize and start
const start = async () => {
  try {
    await initBluesky();
    loop();
  } catch (err) {
    console.error('Failed to initialize:', err);
    process.exit(1);
  }
};

start(); 