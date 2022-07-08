const HDWalletProvider = require("@truffle/hdwallet-provider");
const fs = require("fs");
const mnemonic = fs.readFileSync(".secret").toString().trim(); //mnemonic phrase o chiave privata 
require('dotenv').config()
module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: 5777,
    },
    blockchain: { //editi l'oggetto a seconda della blockchain EVM che stai usando, teoricamente puoi mettere la key che ti pare, basta che sia la stessa che usi quando lanci il comando per deployare (vedi sotto)
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          "HTTP://127.0.0.1:7545" //url del provider (connessione RPC)
        ),
      network_id: 250, //a seconda della rete
    },
    ganachain: { //editi l'oggetto a seconda della blockchain EVM che stai usando, teoricamente puoi mettere la key che ti pare, basta che sia la stessa che usi quando lanci il comando per deployare (vedi sotto)
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          "HTTP://127.0.0.1:8545" //url del provider (connessione RPC)
        ),
      network_id: 250, //a seconda della rete
      networkCheckTimeout: 10000000,
    },
    ganachainCelo: { //editi l'oggetto a seconda della blockchain EVM che stai usando, teoricamente puoi mettere la key che ti pare, basta che sia la stessa che usi quando lanci il comando per deployare (vedi sotto)
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          "HTTP://127.0.0.1:8545" //url del provider (connessione RPC)
        ),
      network_id: 42220, //a seconda della rete
      networkCheckTimeout: 10000000,
    },
    celoMainnet:{
      provider: () => new HDWalletProvider(mnemonic,"https://forno.celo.org"),
      network_id:42220,
      gas: 5000000
    },  
    rinkeby: { //editi l'oggetto a seconda della blockchain EVM che stai usando, teoricamente puoi mettere la key che ti pare, basta che sia la stessa che usi quando lanci il comando per deployare (vedi sotto)
      // provider: () => new HDWalletProvider(mnemonic,"https://rinkeby.infura.io/v3/703bc952819c4f3994f1267658463857" ),//url del provider (connessione RPC)
      provider: () => new HDWalletProvider(mnemonic,"https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161" ),//url del provider (connessione RPC)
      network_id: 4, //a seconda della rete
      confirmations: 2,
      gas: 5500000
    },
    fantomTestnet:{
      provider: () => new HDWalletProvider(mnemonic,"https://rpc.testnet.fantom.network/"),
      network_id:4002,
      // chainId:4002
      // gas: 17000000
    },
    fantomMainnet:{
      provider: () => new HDWalletProvider(mnemonic,"https://ancient-weathered-shape.fantom.quiknode.pro/6e936749ce99aadeea743c04e0f51db10ffcde2e/" ), //"https://rpc.ftm.tools/"  "https://ancient-weathered-shape.fantom.quiknode.pro/6e936749ce99aadeea743c04e0f51db10ffcde2e/"
      network_id:250,
      // gas: 5500000
    }, 
    polygonMainnet:{
      provider: () => new HDWalletProvider(mnemonic,"https://holy-autumn-firefly.matic.quiknode.pro/81e63ecf14c0fd139f684254c35df7fe8faac505/"),
      network_id:137,
      gas: Math.floor(30000000),
      gasPrice: 170000000000
    },
    bscMainnet:{
      provider: () => new HDWalletProvider(mnemonic,"https://bsc-dataseed1.binance.org"),
      network_id:56,
      // gas: Math.floor(30000000*1.1)
      // gasPrice: 170000000000
    }, 
  },
  contracts_directory: "./contracts",
  contracts_build_directory: "./abis",
  compilers: {
    solc: {
      version: "^0.8.0", //versione di solidity che stai usando
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  db: {
    enabled: false,
  },
};