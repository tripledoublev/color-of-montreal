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

const fetchMetadata = () => {
  return new Promise((resolve, reject) => {
    console.log('Fetching metadata from:', METADATA_URL);
    https.get(METADATA_URL, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('Received metadata');
        try {
          const metadata = JSON.parse(data);
          if (!metadata || !Array.isArray(metadata.images)) {
            console.error('Invalid metadata structure:', metadata);
            reject(new Error('Invalid metadata structure'));
            return;
          }
          console.log('Successfully parsed metadata with', metadata.images.length, 'entries');
          resolve(metadata);
        } catch (err) {
          console.error('Failed to parse metadata:', err);
          console.error('Raw data:', data);
          reject(new Error('Failed to parse metadata from website'));
        }
      });
    }).on('error', (err) => {
      console.error('Failed to fetch metadata:', err);
      reject(new Error('Failed to fetch metadata from website'));
    });
  });
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
    metadata.images.push({
      fileName: path.basename(imageData.filename),
      location: "chez moi",
      color: `#${imageData.color.hex}`,
      name: imageData.color.name,
      timestamp: new Date().toISOString()
    });
    
    // Write to local file
    await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
    
    // Upload both metadata and WebP image to FTP
    await Promise.all([
      uploadToFtp(METADATA_FILE),
      uploadToFtp(imageData.filename)
    ]);

    return metadata;
  } catch (err) {
    console.error('Error updating metadata:', err);
    throw err;
  }
};

export {
  updateMetadata
}; 