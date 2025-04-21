const sharp = require('sharp');
const fs = require('fs').promises;

const MAX_FILE_SIZE = 1000000; // 1MB in bytes
const QUALITY_STEP = 5; // Decrease quality by 5% each iteration

const optimizeImage = async (inputPath, outputPath) => {
  try {
    let quality = 100;
    let currentSize = 0;
    
    do {
      // Convert to WebP with current quality
      await sharp(inputPath)
        .webp({ quality })
        .toFile(outputPath);
      
      // Check file size
      const stats = await fs.stat(outputPath);
      currentSize = stats.size;
      
      // If still too large, reduce quality
      if (currentSize > MAX_FILE_SIZE) {
        quality -= QUALITY_STEP;
        if (quality <= 0) {
          throw new Error('Could not compress image to acceptable size');
        }
      }
    } while (currentSize > MAX_FILE_SIZE);
    
    console.log(`Image optimized to ${(currentSize / 1024).toFixed(2)}KB with quality ${quality}%`);
    return outputPath;
  } catch (error) {
    console.error('Error optimizing image:', error);
    throw error;
  }
};

module.exports = {
  optimizeImage
}; 