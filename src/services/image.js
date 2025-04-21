const http = require("http");
const https = require("https");
const sharp = require('sharp');
const { Image, createCanvas } = require("canvas");
const { getColor, findNearest, hex } = require("../../tools");
const config = require('../config');
const fs = require('fs').promises;
const { updateMetadata } = require('./metadata');

const streamToBuffer = (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
};

const getImage = () => {
  return new Promise((resolve, reject) => {
    const sourceUrl = new URL(config.camera.url);
    const get = sourceUrl.protocol === 'https:' ? https.get : http.get;

    const req = get(config.camera.url, async (res) => {
      if (res.statusCode == 200) {
        const chunks = [];
        res.on("data", (chunk) => {
          chunks.push(chunk);
        });

        res.on("end", async () => {
          const src = Buffer.concat(chunks);
          const pngImage = await sharp(src).png().toBuffer();

          console.log('new image');
          const img = new Image();
          img.onload = async () => {
            console.log('image loaded');
            const canvas = createCanvas(img.width, img.height);
            const ctx = canvas.getContext("2d");

            // Draw the original image
            ctx.drawImage(img, 0, 0);

            // Calculate overlay dimensions - 20% wide and 40% tall
            const overlayWidth = img.width * 0.2;  // 20% of width
            const overlayHeight = img.height * 0.4; // 40% of height

            // Calculate the starting point to center the overlay
            const startX = (img.width - overlayWidth) / 2;
            const startY = (img.height - overlayHeight) / 2;

            // Fill the overlay with the hex color
            const color = getColor(img, createCanvas());
            const hexValue = hex(color);
            ctx.fillStyle = `#${hexValue}`;
            ctx.fillRect(startX, startY, overlayWidth, overlayHeight);

            // Save the image data to a file in the archive folder
            const timestamp = new Date().toISOString().replace(/:/g, '-');
            const filename = `archive/${timestamp}__${hexValue}.webp`;

            const pngStream = canvas.createPNGStream();

            // Convert the PNG stream to WebP using sharp and save it to a file
            await sharp(await streamToBuffer(pngStream)).webp().toFile(filename);

            console.log('Image saved to archive: ', filename);

            // Save the PNG version as a temporary file
            const tempFilename = "output.png";
            console.log('saved output');
            await sharp(await streamToBuffer(canvas.createPNGStream())).png().toFile(tempFilename);

            // Update metadata and upload to FTP
            await updateMetadata({
              filename, // Use the WebP version for metadata and FTP
              location: config.camera.location,
              color: {
                name: findNearest(color),
                hex: hexValue
              }
            });

            resolve({ 
              imgData: pngImage, 
              location: config.camera.location,
              color: {
                name: findNearest(color),
                hex: hexValue
              }
            });
          };
          img.onerror = err => { reject(err) };
          img.src = 'data:image/png;base64,' + pngImage.toString('base64');
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

module.exports = {
  getImage
}; 