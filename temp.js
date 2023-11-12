// v6 uses a local mjpg stream to get an image of the sky from my window

const { TwitterApi } = require('twitter-api-v2');
const http = require("http");
const https = require("https");
const sharp = require('sharp');
const suncalc = require('suncalc');
const { Image, createCanvas } = require("canvas");
const { getColor, findNearest, hex } = require("./tools");
const { cameras } = require("./cameras");

const fs = require("fs");

let isExitTimerSet = false;

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

const LOCATION = process.env.LOCATION || "montréal";
const SOURCE_IMAGE = process.env.SOURCE_IMAGE || 
  "https://ville.montreal.qc.ca/Circulation-Cameras/GEN547.jpeg";

function getTimeUntilSunrise() {
    const currentDate = new Date();
    const times = suncalc.getTimes(currentDate, 45.508888, -73.561668);
    const sunrise = times.sunrise;
    
    // Calculate the time difference (in milliseconds) between now and the sunrise time.
    const timeUntilSunrise = sunrise - currentDate;

    // If sunrise is already past, then set the delay to the next day's sunrise
    return timeUntilSunrise > 0 ? timeUntilSunrise : (24 * 60 * 60 * 1000) + timeUntilSunrise;
}

let lastColor;

const loop = async () => {
  try {
    const result = await getImage();
        if (result) {
            const { imgData, location } = result;
            console.log('got image');   
    const img = new Image();
    img.src = imgData;
    const canvas = createCanvas();
    const color = getColor(img, canvas);
    const hexValue = hex(color);
    const name = findNearest(color);
    console.log(name);
    if (lastColor != name) {
      lastColor = name;
      console.log('sending update');
      setTimeout(() => sendUpdate(name, hexValue, location), 3000);
    } else {
      console.error("Error tweeting color: ", name);
    }
 } else {
            console.log('Image skipped due to high black pixel percentage.');
            const delay = getTimeUntilSunrise();
            console.log(`Delaying next image fetch until sunrise in ${delay / 1000 / 60 / 60} hours.`);
            setTimeout(loop, delay);
            return;  // exit the loop here
        }
 } catch (error) {
    console.error("Error in loop: ", error.message);
  }
  

 const currentDate = new Date();
  const times = suncalc.getTimes(currentDate, 45.508888, -73.561668);
  let sleep;
  if (currentDate > times.dawn && currentDate < times.sunrise.getTime() + 30 * 60 * 1000) {
    console.log("After dawn and before sunrise Dawn: ", new Date(times.dawn), ", Sunrise: ", new Date(times.sunrise.getTime() + 30 * 60 * 1000));
    sleep = 17 * 60 * 1000;
  } else if (currentDate > times.sunrise.getTime() + 30 * 60 * 1000 && currentDate < times.sunsetStart.getTime() - 60 * 60 * 1000) {
    console.log("After sunrise and before sunsetStart. Sunrise", new Date(times.sunrise.getTime() + 30 * 60 * 1000), ", Sunset: ", new Date(times.sunsetStart.getTime() - 60 * 60 * 1000));
    sleep = 40 * 60 * 1000;
  } else if (currentDate > times.sunsetStart.getTime() - 90 * 60 * 1000 && currentDate < times.sunset + 60 * 60 * 1000) {
    console.log("After sunsetStart - 1.5 h and 1 hour after sunset. Sunset:", new Date(times.sunsetStart.getTime() - 60 * 60 * 1000), ", Sunset: ", new Date(times.sunset));
    sleep = 16 * 60 * 1000;
  } else if (currentDate > times.dusk && currentDate < times.dawn.getTime() + 24 * 60 * 60 * 1000) {
    console.log("After dusk and before dawn. Dusk: ", new Date(times.dusk), ", Dawn ", new Date(times.dawn.getTime() + 1 * 60 * 60 * 1000));
    sleep = 92 * 60 * 1000;
  } else {
    console.log("No matching interval found. Current time: ", currentDate);
    sleep = 30 * 60 * 1000;
  }
  console.log(
    "Bot is sleeping for " +
    sleep / 60 / 1000 +
    " minutes, will return at " +
    new Date(sleep + new Date().valueOf()).toString() +
    "."
  );

  setTimeout(loop, sleep);
};


const getImage = () => {
  return new Promise((resolve, reject) => {
    //const randomIndex = Math.floor(Math.random() * cameras.length);
    //const randomImageUrl = cameras[randomIndex][1];
    //const imglocation = cameras[randomIndex][0];
    const randomImageUrl = 'http://192.168.1.108:8085/?action=snapshot';
    const imglocation = 'chez moi';
    console.log('Location: ' + imglocation);

    const sourceUrl = new URL(randomImageUrl);
    const get = sourceUrl.protocol === 'https:' ? https.get : http.get;

    const req = get(randomImageUrl, async (res) => {
      if (res.statusCode == 200) {
        const chunks = [];
        res.on("data", (chunk) => {
          chunks.push(chunk);
        });

        res.on("end", async () => {
          const src = Buffer.concat(chunks);
          const resizedImage = await sharp(src)
    .resize(1280, 720) // resizing the image
    .jpeg({ quality: 80 }) // converting to jpeg with 80% quality for further compression
    .toBuffer();
           // Count black pixels
        const { data, info } = await sharp(resizedImage).raw().toBuffer({ resolveWithObject: true });

        console.log(`Image dimensions: ${info.width} x ${info.height}`);

        let blackPixelCount = 0;
        const threshold = 50; // You can adjust this value

        for (let i = 0; i < data.length; i += 4) {
          if (data[i] < threshold && data[i + 1] < threshold && data[i + 2] < threshold) {
            blackPixelCount++;
          }
        }

        const blackPixelPercentage = (blackPixelCount / (info.width * info.height)) * 100;

        console.log(`Black pixel count: ${blackPixelCount}`);
        console.log(`Black pixel percentage: ${blackPixelPercentage}%`);

if (blackPixelPercentage >= 60) {
    console.log(`Skipping image due to high black pixel percentage: ${blackPixelPercentage}%`);
    resolve(null);
    return;
}
	console.log('new image');
        const img = new Image();
        img.onload = async () => {
	  console.log('image loaded');
          const canvas = createCanvas(img.width, img.height);
          const ctx = canvas.getContext("2d");

          const overlayPercentage = 0.2;  // 20% of the original image's dimensions
	  const overlayHeight = img.height * overlayPercentage;
          const overlayWidth = overlayHeight;
	  // Calculate the starting point to center the overlay
	  const startX = (img.width - overlayWidth) / 2;
          const startY = ((img.height / 3) * 2) - (overlayHeight / 2);

          // Draw the original image on the left half of the canvas
          ctx.drawImage(img, 0, 0);

          // Fill the middle of the canvas with the hex color
          const color = getColor(img, createCanvas());
          const hexValue = hex(color);
          ctx.fillStyle = `#${hexValue}`;
          ctx.fillRect(startX, startY, overlayWidth, overlayHeight);

          // Save the image data to a file in the archive folder
          const timestamp = new Date().toISOString().replace(/:/g, '-');
          const filename = `archive/${timestamp}_${imglocation}.webp`;

          const out = fs.createWriteStream(filename);
          const pngStream = canvas.createPNGStream();

          // Convert the PNG stream to WebP using sharp and save it to a file
          await sharp(await streamToBuffer(pngStream)).webp().toFile(filename);

          console.log('Image saved to archive: ', filename);

          // Save the PNG version as a temporary file
          const tempFilename = "output.png";
	  console.log('saved output');
          await sharp(await streamToBuffer(canvas.createPNGStream())).png().toFile(tempFilename);

        };
        img.onerror = err => { reject(err) };  // Add this line to catch any errors
        img.src = 'data:image/jpeg;base64,' + resizedImage.toString('base64');  // Convert Buffer to base64 data URL
        resolve({ imgData: resizedImage, location: imglocation });
    
      });
    } else {
      reject(new Error("Error fetching image from source: " + res.statusCode));
    }
  });

  req.on("error", (e) => {
    reject(new Error("Request Error: " + e.message));
  });
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

  return fs.writeFile("couleurs/${timestamp}_${imglocation}.png", dataURL, "base64", (err) => {
    if (err) throw err;
    sendUpdate(name, hex, imglocation);
  });
};

const sendUpdate = async (name, hex, imglocation) => {
    try {
	console.log('will update');
      
      console.log('check if file exists');
      if (!fs.existsSync('./output.png')) {
    	console.error('File output.png does not exist.');
    	return;
      }

      // Upload media using v1.1
      const mediaId = await client.v1.uploadMedia("./output.png");

      // Tweet text
      const tweetText = `${name} est la couleur du ciel de ${LOCATION}`;
      // Create tweet with media using v2
      const tweetResponse = await client.v2.tweetThread([{ text: tweetText, media: { media_ids: [mediaId] }}]);
      console.log('Status updated.');
      console.log('Tweeted', tweetText);

    } catch (err) {
      console.error('Error in sendUpdate:', err);
    }
};

loop();
