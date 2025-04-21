import 'dotenv/config';

const config = {
  location: process.env.LOCATION || "montréal",
  sourceImage: process.env.SOURCE_IMAGE,
  
  // Platform enable/disable flags
  platforms: {
    twitter: process.env.ENABLE_TWITTER === 'true',
    bluesky: process.env.ENABLE_BLUESKY === 'true',
    mastodon: process.env.ENABLE_MASTODON === 'true'
  },
  
  twitter: {
    appKey: process.env.TWITTER_API_CONSUMER_KEY,
    appSecret: process.env.TWITTER_API_CONSUMER_SECRET,
    accessToken: process.env.TWITTER_API_TOKEN,
    accessSecret: process.env.TWITTER_API_TOKEN_SECRET,
  },
  
  bluesky: {
    handle: process.env.BLUESKY_HANDLE,
    password: process.env.BLUESKY_PASSWORD,
  },
  
  mastodon: {
    instanceUrl: process.env.MASTODON_INSTANCE_URL,
    accessToken: process.env.MASTODON_ACCESS_TOKEN
  },
  
  camera: {
    url: process.env.CAMERA_URL || 'http://192.168.2.15:8888/out.jpg',
    location: 'chez moi'
  },
  
  coordinates: {
    lat: 45.508888,
    lon: -73.561668
  }
};

export default config; 