require('dotenv').config();

module.exports = {
  location: process.env.LOCATION || "montréal",
  sourceImage: process.env.SOURCE_IMAGE,
  
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
  
  camera: {
    url: process.env.CAMERA_URL || 'http://192.168.1.108:8085/?action=snapshot',
    location: 'chez moi'
  },
  
  coordinates: {
    lat: 45.508888,
    lon: -73.561668
  }
}; 