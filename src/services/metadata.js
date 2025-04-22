import { promises as fs } from 'fs';
import path from 'path';
import FtpClient from 'ftp';
import https from 'https';

const config = {
  host: process.env.FTP_HOST,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  port: process.env.FTP_PORT || 21
};

const METADATA_FILE = 'home-metadata.json';
const METADATA_URL = 'https://www.tripledoublev.com/couleur/at-home/home-metadata.json';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchMetadata = async (retries = MAX_RETRIES) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const metadata = await new Promise((resolve, reject) => {
        https.get(METADATA_URL, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (!parsed || !Array.isArray(parsed.images)) {
                reject(new Error('Invalid metadata structure'));
                return;
              }
              resolve(parsed);
            } catch (err) {
              reject(new Error('Failed to parse metadata'));
            }
          });
        }).on('error', (err) => {
          reject(new Error('Failed to fetch metadata'));
        });
      });
      
      console.log(`Metadata fetched successfully (${metadata.images.length} entries)`);
      return metadata;
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }
      console.log(`Retrying metadata fetch (attempt ${attempt + 1}/${retries})...`);
      await sleep(RETRY_DELAY);
    }
  }
};

const uploadToFtp = (filePath) => {
  return new Promise((resolve, reject) => {
    const client = new FtpClient();
    
    client.on('ready', () => {
      client.put(filePath, path.basename(filePath), (err) => {
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

    client.connect(config);
  });
};

const updateMetadata = async (imageData) => {
  try {
    // Fetch existing metadata from website
    let metadata = await fetchMetadata();
    
    // Add new entry
    const newColor = {
      fileName: path.basename(imageData.filename),
      location: "chez moi",
      color: `#${imageData.color.hex}`,
      name: imageData.color.name,
      timestamp: imageData.timestamp.replace(/-/g, ':') // Convert back to ISO format
    };
    metadata.images.push(newColor);
    
    // Write to local file
    await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
    
    // Upload both metadata and WebP image to FTP
    await Promise.all([
      uploadToFtp(METADATA_FILE),
      uploadToFtp(imageData.filename)
    ]);

    return metadata;
  } catch (err) {
    console.error('Error updating metadata:', err.message);
    throw err;
  }
};

export {
  updateMetadata,
  fetchMetadata
}; 