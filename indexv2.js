const { TwitterApi } = require('twitter-api-v2');
const http = require("http");
const https = require("https");
const sharp = require('sharp');

const { Image, createCanvas } = require("canvas");
const { getColor, findNearest, hex } = require("./tools");
const { cameras } = require("./cameras");

const fs = require("fs");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// These keys and tokens are necessary for user context authentication
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_CONSUMER_KEY,
  appSecret: process.env.TWITTER_API_CONSUMER_SECRET,
  accessToken: process.env.TWITTER_API_TOKEN,
  accessSecret: process.env.TWITTER_API_TOKEN_SECRET,
});

const LOCATION = process.env.LOCATION || "Montréal";
const SOURCE_IMAGE = process.env.SOURCE_IMAGE || 
  "https://ville.montreal.qc.ca/Circulation-Cameras/GEN547.jpeg";

const MIN_SLEEP_TIME = 1 * 60 * 60 * 1000;
const MAX_SLEEP_TIME = 1.2 * 60 * 60 * 1000;

let lastColor;

const loop = () => {
  getImage((src, imglocation) => {
    const img = new Image();
    img.src = src;
    const canvas = createCanvas();
    const color = getColor(img, canvas);
    const hexValue = hex(color);
    const name = findNearest(color);
    if (lastColor != name) {
      lastColor = name;
      updateWithImage(name, hexValue, imglocation);
    } else {
      console.error("Error tweeting color: ", name);
    }
  });

  const sleep = Math.round(
    MIN_SLEEP_TIME + Math.random() * (MAX_SLEEP_TIME - MIN_SLEEP_TIME)
  );
  console.log(
    "Bot is sleeping for " +
    sleep / 60 / 1000 +
    " minutes, will return at " +
    new Date(sleep + new Date().valueOf()).toString() +
    "."
  );
  setTimeout(loop, sleep);
};


const getImage = (callback) => {
  const randomIndex = Math.floor(Math.random() * cameras.length);
  const randomImageUrl = cameras[randomIndex][1];
  const imglocation = cameras[randomIndex][0];
  console.log('Location: ' + imglocation);
    
  const sourceUrl = new URL(randomImageUrl);  
  const get = sourceUrl.protocol === 'https:' ? https.get : http.get;

  const req = get(randomImageUrl, (res) => {
    if (res.statusCode == 200) {
      const chunks = [];
      res.on("data", (chunk) => {
        chunks.push(chunk);
      });
      res.on("end", async () => {
        const src = Buffer.concat(chunks);

        // Convert the image to PNG format using sharp
        const pngImage = await sharp(src).png().toBuffer();

        // Count black pixels
        const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
        const blackPixelCount = data.reduce((count, value, i) => count + (i % 4 < 3 && value < 50), 0);
        const blackPixelPercentage = (blackPixelCount / (info.width * info.height)) * 100;

        // If the percentage is greater than 90%, fetch and process another image
        if (blackPixelPercentage >= 90) {
          console.log(`Skipping image due to high black pixel percentage: ${blackPixelPercentage}%`);
          getImage(callback);  // Recursively call the function to process another image
          return;
        }


        const img = new Image();
        img.onload = async () => {
          const canvas = createCanvas(img.width * 2, img.height);
          const ctx = canvas.getContext("2d");

          // Draw the original image on the left half of the canvas
          ctx.drawImage(img, 0, 0);

          // Fill the right half of the canvas with the hex color
          const color = getColor(img, createCanvas());
          const hexValue = hex(color);
          ctx.fillStyle = `#${hexValue}`;
          ctx.fillRect(img.width, 0, img.width, img.height);

          // Save the image data to a file in the archive folder
          const timestamp = new Date().toISOString().replace(/:/g, '-');
          const filename = `archive/${timestamp}_${imglocation}.webp`;

          const out = fs.createWriteStream(filename);
          const pngStream = canvas.createPNGStream();

          // Convert the PNG stream to WebP using sharp and save it to a file
          await sharp(await streamToBuffer(pngStream)).webp().toFile(filename);

          console.log('Image saved to archive: ', filename);
        };
        img.onerror = err => { throw err };  // Add this line to catch any errors
        img.src = 'data:image/png;base64,' + pngImage.toString('base64');  // Convert Buffer to base64 data URL

        callback(pngImage, imglocation);
      });
    } else {
      console.error("Error fetching image from source: " + res.statusCode);
    }
  });

  req.on("error", (e) => {
    console.error("Request Error: " + e.message);
  });
};

// Helper function to convert a stream to a buffer
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

const updateWithImage = (name, hex, imglocation) => {
  const canvas = createCanvas();
  const ctx = canvas.getContext("2d");
  canvas.width = 400;
  canvas.height = 225;
  ctx.fillStyle = `#${hex}`;
  ctx.fillRect(0, 0, 400, 225);

  const dataURL = canvas.toDataURL().replace(/^data:image\/png;base64,/, "");

  return fs.writeFile("output.png", dataURL, "base64", (err) => {
    if (err) throw err;
    sendUpdate(name, hex, imglocation);
  });
};

const sendUpdate = async (name, hex, imglocation) => {
    try {
      // Upload media using v1.1
      const mediaId = await client.v1.uploadMedia("./output.png");

      // Tweet text
      const tweetText = `${name} est la couleur du ciel de ${LOCATION} au coin de ${imglocation}`;
      // Create tweet with media using v2
      const tweetResponse = await client.v2.tweetThread([{ media: { media_ids: [mediaId] }}, tweetText,
        ]);
      console.log('Status updated.');
      console.log('Tweeted', tweetText);

    } catch (err) {
      console.error('Error in sendUpdate:', err);
    }
};

loop();
