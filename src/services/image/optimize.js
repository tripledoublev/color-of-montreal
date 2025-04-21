import sharp from 'sharp';
import { promises as fs } from 'fs';

const MAX_FILE_SIZE = 1000000; // 1MB in bytes
const QUALITY_STEP = 5; // Decrease quality by 5% each iteration

const optimizeImage = async (inputPath, outputPath) => {
  try {
    const imageBuffer = await fs.readFile(inputPath);
    const metadata = await sharp(imageBuffer).metadata();
    
    // Resize if needed
    let pipeline = sharp(imageBuffer);
    if (metadata.width > 1000 || metadata.height > 1000) {
      pipeline = pipeline.resize(1000, 1000, { fit: 'inside' });
    }
    
    // Convert to WebP with quality 80
    await pipeline
      .webp({ quality: 80 })
      .toFile(outputPath);
      
    return outputPath;
  } catch (err) {
    console.error('Error optimizing image:', err);
    throw err;
  }
};

export { optimizeImage }; 