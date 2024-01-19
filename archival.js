// super archival mode

const http = require("http");
const https = require("https");
const sharp = require('sharp');
const suncalc = require('suncalc');
const { Image, createCanvas } = require("canvas");
const { getColor, findNearest, hex } = require("./tools");
const { cameras } = require("./cameras");

const fs = require("fs");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const LOCATION = process.env.LOCATION || "montréal";

let lastColor;
let currentCameraIndex = 0;

// Check if a command line argument is provided for the initial index
if (process.argv.length > 2) {
  let inputIndex = parseInt(process.argv[2]);
  if (!isNaN(inputIndex) && inputIndex >= 0 && inputIndex < cameras.length) {
      currentCameraIndex = inputIndex;
  } else {
      console.error("Invalid initial index provided. Using default index 0.");
  }
}

const loop = async () => {
  if (currentCameraIndex >= cameras.length) {
    currentCameraIndex = 0;
  }
  try {
    const { imgData, location } = await getImage(currentCameraIndex);
    console.log('got image');
    const img = new Image();
    img.src = imgData;
    const canvas = createCanvas();
    const color = getColor(img, canvas);

    const name = findNearest(color);
    console.log(name);
  } catch (error) {
    console.error("Error in loop: ", error.message);
  }
  

 const currentDate = new Date();
  const times = suncalc.getTimes(currentDate, 45.508888, -73.561668);
  let sleep = 720000 / cameras.length;

  // this is the code that introduces interval variations/. it is not used in archival mode
  /* if (currentDate > times.dawn && currentDate < times.sunrise.getTime() + 30 * 60 * 1000) {
    console.log("After dawn and before sunrise Dawn: ", new Date(times.dawn), ", Sunrise: ", new Date(times.sunrise.getTime() + 30 * 60 * 1000));
    sleep = 17 * 60 * 1000;
  } else if (currentDate > times.sunrise.getTime() + 30 * 60 * 1000 && currentDate < times.sunsetStart.getTime() - 60 * 60 * 1000) {
    console.log("After sunrise and before sunsetStart. Sunrise", new Date(times.sunrise.getTime() + 30 * 60 * 1000), ", Sunset: ", new Date(times.sunsetStart.getTime() - 60 * 60 * 1000));
    sleep = 45 * 60 * 1000;
  } else if (currentDate > times.sunsetStart.getTime() - 60 * 60 * 1000 && currentDate < times.dusk + 45 * 60 * 1000) {
    console.log("After sunsetStart and before dusk. Dusk:", new Date(times.sunsetStart.getTime() - 60 * 60 * 1000), ", Dusk: ", new Date(times.dusk));
    sleep = 16 * 60 * 1000;
  } else if (currentDate > times.dusk && currentDate < times.dawn.getTime() + 24 * 60 * 60 * 1000) {
    console.log("After dusk and before dawn. Dusk: ", new Date(times.dusk), ", Dawn ", new Date(times.dawn.getTime() + 1 * 60 * 60 * 1000));
    sleep = 55 * 60 * 1000;
  } else {
    console.log("No matching interval found. Current time: ", currentDate);
    sleep = 30 * 60 * 1000;
  } */
  console.log(
    "Bot is sleeping for " +
    sleep / 60 / 1000 +
    " minutes, will return at " +
    new Date(sleep + new Date().valueOf()).toString() +
    "."
  );

  setTimeout(loop, sleep);
  currentCameraIndex++;
};


const getImage = (cameraIndex) => {
  return new Promise((resolve, reject) => {
    const randomImageUrl = cameras[cameraIndex][1];
    const imglocation = cameras[cameraIndex][0];
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
          const pngImage = await sharp(src).png().toBuffer();

           // Count black pixels
        const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });

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

// If the percentage is greater than 60%, fetch and process another image
if (blackPixelPercentage >= 60) {
  console.log(`Skipping image due to high black pixel percentage: ${blackPixelPercentage}%`);
  currentCameraIndex = (currentCameraIndex + 1) % cameras.length; // Increase the index by 1 and loop back to 0 if it exceeds the number of cameras
  return getImage(currentCameraIndex) // Recursively call the function to process the next image
    .then(resolve)
    .catch(reject);
  return;
}


        const img = new Image();
        img.onload = async () => {

          const canvas = createCanvas(img.width, img.height);
          const ctx = canvas.getContext("2d");

          const overlayPercentage = 0.4;  // 40% of the original image's dimensions
	  const overlayWidth = img.width * overlayPercentage;
	  const overlayHeight = img.height * overlayPercentage;

	  // Calculate the starting point to center the overlay
	  const startX = (img.width - overlayWidth) / 2;
	  const startY = (img.height - overlayHeight) / 2;

          // Draw the original image on the left half of the canvas
          ctx.drawImage(img, 0, 0);

          // Fill the middle of the canvas with the hex color
          const color = getColor(img, createCanvas());
          const hexValue = hex(color);
          ctx.fillStyle = `#${hexValue}`;
          ctx.fillRect(startX, startY, overlayWidth, overlayHeight);

          // Save the image data to a file in the archive folder
          const sanitizedLocation = imglocation.replace(/[\s&]/g, '_'); // Replace spaces and '&' with underscores
          const dir = `archive/${sanitizedLocation}`;
      
          if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true }); // Create the directory if it doesn't exist
          }
      
          const timestamp = new Date().toISOString().replace(/:/g, '-');
          const filename = `${timestamp}__${hexValue}.webp`;
          const filePath = `${dir}/${filename}`;
    

          // Create a write stream with the correct file path
          const out = fs.createWriteStream(filePath);
          const pngStream = canvas.createPNGStream();

          // Convert the PNG stream to WebP using sharp and save it to a file
          await sharp(await streamToBuffer(pngStream)).webp().toFile(filePath);

          console.log('Image saved to archive: ', filePath);

        };
        img.onerror = err => { reject(err) };  // Add this line to catch any errors
        img.src = 'data:image/png;base64,' + pngImage.toString('base64');  // Convert Buffer to base64 data URL
        resolve({ imgData: pngImage, location: imglocation });
    
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



loop();
