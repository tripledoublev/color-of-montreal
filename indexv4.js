const crypto = require('crypto');

global.crypto = {
  getRandomValues: function(buffer) {
    return crypto.randomFillSync(buffer);
  },
};
const suncalc = require('suncalc');
const { default: Web3 } = require('web3');
const HDWalletProvider = require("@truffle/hdwallet-provider");
const { TwitterApi } = require('twitter-api-v2');
const http = require("http");
const https = require("https");
const sharp = require('sharp');
const { Image, createCanvas } = require("canvas");
const { getColor, findNearest, hex } = require("./tools");
const { cameras } = require("./cameras");

const fs = require("fs");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

let provider;
let web3;
let contract; 

const ABI = require('./web3/ABI.json');
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const INFURA_URL = process.env.INFURA_URL;

// These keys and tokens are necessary for user context authentication
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_CONSUMER_KEY,
  appSecret: process.env.TWITTER_API_CONSUMER_SECRET,
  accessToken: process.env.TWITTER_API_TOKEN,
  accessSecret: process.env.TWITTER_API_TOKEN_SECRET,
});

const LOCATION = process.env.LOCATION || "Montréal";
const SOURCE_IMAGE = process.env.SOURCE_IMAGE ||
  "https://ville.montreal.qc.ca/Circulation-Cameras/GEN547.jpeg";

const MIN_SLEEP_TIME = 1 * 60 * 60 * 1000;
const MAX_SLEEP_TIME = 1.2 * 60 * 60 * 1000;

let lastColor;


const bigIntReplacer = (key, value) => {
  if (typeof value === 'bigint') {
    return value.toString() + 'n'; // indicate that this is a BigInt
  }
  return value;
}

function initializeProvider() {
    provider = new HDWalletProvider(PRIVATE_KEY, INFURA_URL);
 console.log('HDWalletProvider initialized');
    web3 = new Web3(provider, { debug: true });
console.log('Web3 initialized');
    contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);
console.log('Contract initialized');
};
const loop = () => {
  initializeProvider();
  getImage((src, imglocation) => {
    const img = new Image();
    img.src = src;
    const canvas = createCanvas();
    const color = getColor(img, canvas);
    const hexValue = hex(color);
    
const name = findNearest(color);
console.log(`Nearest color name: ${name}`);
    if (lastColor != name) {
      lastColor = name;

   // Mint NFT before tweeting
      const colorValue = "#" + hexValue;
      mintNFT(imglocation, colorValue, name).then(({ transactionHash, tokenId }) => {
        updateWithImage(name, hexValue, imglocation, { transactionHash, tokenId });
      }).catch(error => {
        console.error('Error minting NFT:', error);
      });

    } else {
      console.error("Error tweeting color: ", name);
    }
  });
  const currentDate = new Date();
  const times = suncalc.getTimes(currentDate, 45.508888, -73.561668);
  let sleep;
    if (currentDate > times.dawn && currentDate < times.sunrise.getTime() + 30 * 60 * 1000) {
    console.log("After dawn and before sunrise Dawn: ", times.dawn, ", Sunrise: ", new Date(times.sunrise.getTime() + 30 * 60 * 1000));
    sleep = 15 * 60 * 1000;
  } else if (currentDate > times.sunrise.getTime() + 30 * 60 * 1000 && currentDate < times.sunsetStart.getTime() - 60 * 60 * 1000) {
    console.log("After sunrise and before sunsetStart. Sunrise", new Date(times.sunrise.getTime() + 30 * 60 * 1000), ", Sunset: ", new Date(times.sunsetStart.getTime() - 60 * 60 * 1000));
    sleep = 65 * 60 * 1000;
  } else if (currentDate > times.sunsetStart.getTime() - 60 * 60 * 1000 && currentDate < times.dusk) {
    console.log("After sunsetStart and before dusk. Dusk:", new Date(times.sunsetStart.getTime() - 60 * 60 * 1000), ", Dusk: ", times.dusk);
    sleep = 15 * 60 * 1000;
  } else if (currentDate > times.dusk && currentDate < times.dawn.getTime() + 24 * 60 * 60 * 1000) {
    console.log("After dusk and before dawn. Dusk: ", times.dusk, ", Dawn ", new Date(times.dawn.getTime() + 1 * 60 * 60 * 1000));
    sleep = 120 * 60 * 1000;
  } else {
    console.log("No matching interval found. Current time: ", currentDate);
    sleep = 104 * 60 * 1000;
  }
  console.log(
    "Bot is sleeping for " +
    sleep / 60 / 1000 +
    " minutes, will return at " +
    new Date(sleep + new Date().valueOf()).toString() +
    "."
  );
  setTimeout(loop, sleep);
};

async function mintNFT(location, color, colorName) {
  let accounts = await web3.eth.getAccounts();
  let account = accounts[0];

console.log(`Minting NFT. Account: ${account}`);

  let gasPrice = await web3.eth.getGasPrice();
  let gasEstimate = await contract.methods.mintNFT(location, color, colorName).estimateGas({ from: account, value: web3.utils.toWei('0.0006', 'ether') });

console.log(`Gas price: ${gasPrice}`);

  let receipt = await contract.methods.mintNFT(location, color, colorName).send({ from: account, gas: gasEstimate, gasPrice: gasPrice, value: web3.utils.toWei('0.0006', 'ether') });

  console.log(`Gas estimate: ${gasEstimate}`);

  const transactionHash = receipt.transactionHash; // Get the transaction hash from the receipt
  console.log('Transaction hash: ', transactionHash);
  console.log(`Receipt: ${JSON.stringify(receipt, bigIntReplacer)}`);
  const transferEventTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  let transferLog = receipt.logs.find(
    (log) => log.topics[0] === transferEventTopic
  );

  let tokenId = '';
  if (transferLog) {
    const tokenIdHex = transferLog.topics[3]; // Assuming the `tokenId` is the fourth indexed parameter
    tokenId = parseInt(tokenIdHex, 16).toString(); // Parse as integer to remove leading zeros
    tokenId = tokenId.replace(/^0+/, ''); // Remove leading zeros
  } else {
    console.log("Transfer event not found in the logs.");
  }
   accounts.length = 0;
  account = null;
  gasPrice = null;
  gasEstimate = null;
  receipt = null;
  transferLog = null;
  provider.engine.stop();
  console.log('Token ID: ', tokenId);
  return { transactionHash, tokenId };
}


const getImage = (callback) => {
  const randomIndex = Math.floor(Math.random() * cameras.length);
  const randomImageUrl = cameras[randomIndex][1];
  const imglocation = cameras[randomIndex][0];
  console.log('Location: ' + imglocation);

  const sourceUrl = new URL(randomImageUrl);
  const get = sourceUrl.protocol === 'https:' ? https.get : http.get;

  const req = get(randomImageUrl, (res) => {
    if (res.statusCode == 200) {
      const chunks = [];
      res.on("data", (chunk) => {
        chunks.push(chunk);
      });
      res.on("end", async () => {
        const src = Buffer.concat(chunks);

        // Convert the image to PNG format using sharp
        const pngImage = await sharp(src).png().toBuffer();

        // Count black pixels
        const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
        const blackPixelCount = data.reduce((count, value, i) => count + (i % 4 < 3 && value < 50), 0);
        const blackPixelPercentage = (blackPixelCount / (info.width * info.height)) * 100;

        // If the percentage is greater than 90%, fetch and process another image
        if (blackPixelPercentage >= 90) {
          console.log(`Skipping image due to high black pixel percentage: ${blackPixelPercentage}%`);
          getImage(callback);  // Recursively call the function to process another image
          return;
        }


        const img = new Image();
        img.onload = async () => {
          const canvas = createCanvas(img.width * 2, img.height);
          const ctx = canvas.getContext("2d");

          // Draw the original image on the left half of the canvas
          ctx.drawImage(img, 0, 0);

          // Fill the right half of the canvas with the hex color
          const color = getColor(img, createCanvas());
          const hexValue = hex(color);
          ctx.fillStyle = `#${hexValue}`;
          ctx.fillRect(img.width, 0, img.width, img.height);

          // Save the image data to a file in the archive folder
          const timestamp = new Date().toISOString().replace(/:/g, '-');
          const filename = `archive/${timestamp}_${imglocation}.webp`;

          const out = fs.createWriteStream(filename);
          const pngStream = canvas.createPNGStream();

          // Convert the PNG stream to WebP using sharp and save it to a file
          await sharp(await streamToBuffer(pngStream)).webp().toFile(filename);

          console.log('Image saved to archive: ', filename);
        };
        img.onerror = err => { throw err };  // Add this line to catch any errors
        img.src = 'data:image/png;base64,' + pngImage.toString('base64');  // Convert Buffer to base64 data URL

        callback(pngImage, imglocation);
      });
    } else {
      console.error("Error fetching image from source: " + res.statusCode);
    }
  });

  req.on("error", (e) => {
    console.error("Request Error: " + e.message);
  });
};

// Helper function to convert a stream to a buffer
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

const updateWithImage = (name, hex, imglocation, transactionData) => {
  const canvas = createCanvas();
  const ctx = canvas.getContext("2d");
  canvas.width = 400;
  canvas.height = 225;
  ctx.fillStyle = `#${hex}`;
  ctx.fillRect(0, 0, 400, 225);

  const dataURL = canvas.toDataURL().replace(/^data:image\/png;base64,/, "");

  return fs.writeFile("output.png", dataURL, "base64", (err) => {
    if (err) throw err;
    sendUpdate(name, hex, imglocation, transactionData);
  });
};

const sendUpdate = async (name, hex, imglocation, { transactionHash, tokenId }) => {
    try {
      // Upload media using v1.1
      const mediaId = await client.v1.uploadMedia("./output.png");

      // Tweet text
      const tweetText = `${name} est la couleur du ciel de ${LOCATION} au coin de ${imglocation}`;
      const chainExplorerUrl = `https://optimistic.etherscan.io/tx/${transactionHash}`;
      const openSeaUrl = `https://opensea.io/assets/optimism/0x658cfa2c71F0eD3406d0a45BAd87D4C84a923E48/${tokenId}`;
      const transactionText = `COULEURS #${tokenId}: ${name} was just minted on Optimism.\nTransaction Hash:\n${transactionHash}\nEtherscan link: ${chainExplorerUrl}\nFrom ${imglocation} to OpenSea: ${openSeaUrl}`;
      //  Create tweet with media using v2
      const tweetResponse = await client.v2.tweetThread([{ media: { media_ids: [mediaId] }}, tweetText, transactionText,
        ]);
      console.log('Status updated.');
      console.log('Tweeted', tweetText);

    } catch (err) {
      console.error('Error in sendUpdate:', err);
    }
};

loop();
