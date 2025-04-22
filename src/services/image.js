import http from "http";
import https from "https";
import sharp from 'sharp';
import { Image, createCanvas } from "canvas";
import { getColor, findNearest, hex } from "../../tools.js";
import config from '../config/index.js';
import { promises as fs } from 'fs';
import { updateMetadata } from './metadata.js';
import FtpClient from 'ftp';
import path from 'path';

const ftpConfig = {
  host: process.env.FTP_HOST,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  port: process.env.FTP_PORT || 21
};

const streamToBuffer = (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
};

const uploadToFtp = (filePath) => {
  return new Promise((resolve, reject) => {
    const client = new FtpClient();
    
    client.on('ready', () => {
      // Get just the filename since we want to upload to root
      const filename = path.basename(filePath);
      
      // Upload the file to the root directory
      client.put(filePath, `./${filename}`, (err) => {
        if (err) {
          client.end();
          reject(err);
          return;
        }
        client.end();
        resolve();
      });
    });

    client.on('error', (err) => {
      client.end();
      reject(err);
    });

    client.connect(ftpConfig);
  });
};

const getImage = (timestamp) => {
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

            // new dimensions based on visual analysis
            const overlayWidth = img.width * 0.1392;     // wider
            const overlayHeight = img.height * 0.4427;   // same
            const startX = (img.width - overlayWidth) / 2;
            const startY = img.height * 0.45;      

            // Get the color data
            const tempCanvas = createCanvas();
            const tempCtx = tempCanvas.getContext("2d");
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            tempCtx.drawImage(img, 0, 0);
            const data = tempCtx.getImageData((img.width / 12) * 5, (img.height / 24) * 1, (img.width / 12) * 6, (img.height / 12) * 2).data;
            const color = [data[0], data[1], data[2]];
            const hexValue = hex(color);
            const name = findNearest(color);

            // Fill the overlay with the hex color
            ctx.fillStyle = `#${hexValue}`;
            ctx.fillRect(startX, startY, overlayWidth, overlayHeight);

            const pngStream = canvas.createPNGStream();

            // Use the provided timestamp for the filename
            const filename = `archive/${timestamp}__${hexValue}.webp`;

            // Convert the PNG stream to WebP using sharp and save it to a file
            await sharp(await streamToBuffer(pngStream)).webp().toFile(filename);

            console.log('Image saved to archive: ', filename);

            // Upload the image to FTP
            try {
              await uploadToFtp(filename);
              console.log('Image uploaded to FTP: ', filename);
            } catch (err) {
              console.error('Error uploading image to FTP:', err);
            }

            // Save the PNG version as a temporary file
            const tempFilename = "output.png";
            console.log('saved output');
            await sharp(await streamToBuffer(canvas.createPNGStream())).png().toFile(tempFilename);

            resolve({ 
              imgData: pngImage, 
              location: config.camera.location,
              color: {
                name,
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

export {
  getImage
}; 