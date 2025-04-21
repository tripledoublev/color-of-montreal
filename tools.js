import { couleurs } from './couleurs.js';
import { createCanvas, loadImage } from 'canvas';

const getColor = async (imagePath) => {
  const img = await loadImage(imagePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const data = ctx.getImageData((img.width / 12) * 5, (img.height / 24) * 1, (img.width / 12) * 6, (img.height / 12) * 2).data;
  const color = [data[0], data[1], data[2]];

  return {
    hex: '#' + hex(color),
    name: findNearest(color)
  };
};

const hex = (color) => {
  return color
    .map((c) => {
      return c.toString(16);
    })
    .join("");
};

const findNearest = (rgb) => {
  return couleurs
    .map((color) => {
      return {
        d: colorDistance(rgb, color[1]),
        name: color[0],
      };
    })
    .sort((color1, color2) => {
      return color1.d - color2.d;
    })[0].name;
};

const colorDistance = (color1, color2) => {
  return Math.sqrt(
    Math.pow(color1[0] - color2[0], 2) +
      Math.pow(color1[1] - color2[1], 2) +
      Math.pow(color1[2] - color2[2], 2)
  );
};

export {
  getColor,
  hex,
  findNearest
};
