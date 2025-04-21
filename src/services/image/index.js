import axios from 'axios';
import { promises as fs } from 'fs';
import { getColor } from '../../../tools.js';
import config from '../../config/index.js';

const getImage = async () => {
  try {
    // Fetch image from camera
    const response = await axios.get(config.camera.url, {
      responseType: 'arraybuffer'
    });
    
    // Save the image temporarily
    const tempPath = './output.png';
    await fs.writeFile(tempPath, response.data);
    
    // Detect the dominant color
    const color = await getColor(tempPath);
    
    return {
      imgData: response.data,
      location: config.camera.location,
      color
    };
  } catch (error) {
    console.error('Error fetching or processing image:', error);
    throw error;
  }
};

export { getImage }; 