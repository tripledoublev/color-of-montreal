const fs = require('fs').promises;
const path = require('path');
const FtpClient = require('ftp');

const config = {
  host: process.env.FTP_HOST,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  port: process.env.FTP_PORT || 21
};

const METADATA_FILE = 'home-metadata.json';

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
    // Read the current file
    const content = await fs.readFile(METADATA_FILE, 'utf8');
    
    // Parse the JSON
    const metadata = JSON.parse(content);
    
    // Add new entry with the WebP filename
    metadata.images.push({
      fileName: path.basename(imageData.filename), // This will be timestamp__hexvalue.webp
      location: "chez moi",
      color: `#${imageData.color.hex}`,
      name: imageData.color.name,
      timestamp: new Date().toISOString()
    });
    
    // Write back to file
    await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
    
    // Upload both metadata and WebP image to FTP
    await Promise.all([
      uploadToFtp(METADATA_FILE),
      uploadToFtp(imageData.filename) // This is the WebP file
    ]);

    return metadata;
  } catch (err) {
    console.error('Error updating metadata:', err);
    throw err;
  }
};

module.exports = {
  updateMetadata
}; 