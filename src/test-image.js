const { getImage } = require('./services/image');
const { getSleepInterval } = require('./services/timing');
const config = require('./config');
const fs = require('fs').promises;
const path = require('path');
const suncalc = require('suncalc');

const testImage = async () => {
  try {
    console.log('\n=== Starting Image Test ===');
    console.log('Fetching image from:', config.camera.url);
    
    const { color, location } = await getImage();
    
    console.log('\n=== Image Processing Results ===');
    console.log('Color name:', color.name);
    console.log('Hex value:', color.hex);
    console.log('Location:', location);
    
    // Check output files
    console.log('\n=== File Information ===');
    const outputPng = 'output.png';
    const outputPngStats = await fs.stat(outputPng);
    console.log(`Output PNG size: ${(outputPngStats.size / 1024).toFixed(2)} KB`);
    
    // Find the most recent WebP file in archive
    const archiveDir = 'archive';
    const files = await fs.readdir(archiveDir);
    const webpFiles = files.filter(f => f.endsWith('.webp'));
    const latestWebp = webpFiles.sort().pop();
    
    if (latestWebp) {
      const webpPath = path.join(archiveDir, latestWebp);
      const webpStats = await fs.stat(webpPath);
      console.log(`Latest WebP file: ${latestWebp}`);
      console.log(`WebP file size: ${(webpStats.size / 1024).toFixed(2)} KB`);
      
      // Verify filename format
      const [timestamp, hexValue] = latestWebp.split('__');
      console.log('\n=== Filename Format Verification ===');
      console.log('Timestamp part:', timestamp);
      console.log('Hex value part:', hexValue.replace('.webp', ''));
      console.log('Format matches expected pattern:', /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z$/.test(timestamp));
    }
    
    // Check metadata file
    console.log('\n=== Metadata Information ===');
    const metadataPath = 'home-metadata.json';
    if (await fs.access(metadataPath).then(() => true).catch(() => false)) {
      const metadataStats = await fs.stat(metadataPath);
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      console.log(`Metadata file size: ${(metadataStats.size / 1024).toFixed(2)} KB`);
      console.log(`Number of entries: ${metadata.images.length}`);
      console.log('Latest entry:', metadata.images[metadata.images.length - 1]);
    }

    // Sun timing information
    console.log('\n=== Sun Timing Information ===');
    const currentDate = new Date();
    const times = suncalc.getTimes(currentDate, config.coordinates.lat, config.coordinates.lon);
    
    console.log('Current time:', currentDate.toISOString());
    console.log('Sunrise:', times.sunrise.toISOString());
    console.log('Sunset:', times.sunset.toISOString());
    console.log('Dawn:', times.dawn.toISOString());
    console.log('Dusk:', times.dusk.toISOString());
    
    const sleep = getSleepInterval(currentDate);
    const nextPostTime = new Date(currentDate.getTime() + sleep);
    console.log('\nNext post would be at:', nextPostTime.toISOString());
    console.log(`Sleep duration: ${sleep/1000} seconds (${sleep/1000/60} minutes)`);
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error("\n=== Error in test ===");
    console.error("Error message:", error.message);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
  }
};

// Run the test
testImage(); 