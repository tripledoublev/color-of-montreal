const Wallet = require('ethereumjs-wallet').default;

const wallet = Wallet.generate();

console.log("Private Key: ", wallet.getPrivateKeyString());
console.log("Address: ", wallet.getAddressString());
