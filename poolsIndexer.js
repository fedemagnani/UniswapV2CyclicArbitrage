const Web3 = require('web3');
var abiContratto = (require('./abis/Lifeguard.json')).abi
const request = require('request');
const _ = require('lodash')
const HDWalletProvider = require("@truffle/hdwallet-provider");
const fs = require("fs");
var path = require('path');
var util = require('util');
var dexAddresses = require('./endpoints/indirizziDex.json');
var baseUrlsScanner = require('./endpoints/scannerAddresses.json');
var chainsEndpoint = require('./endpoints/chainsEndpoint.json'); 
var deployedContracts = require('./endpoints/deployedAddresses.json'); 
// var chain = "Celo"
// var dex = "Ubeswap"
var chain = "Polygon"
var dex = "SushiPolygon"

var indirizzoContrattoCustom = deployedContracts[chain]; //MAINNET

const url = chainsEndpoint[chain];
// const url = "http://localhost:8545"
var connection = new Web3(new Web3.providers.HttpProvider(url));

var _baseUrlScan = baseUrlsScanner[chain]
var _router = dexAddresses[dex].router
var _factory = dexAddresses[dex].factory

function getAbi(address) {
    return new Promise((resolve) => {
        var url = `${_baseUrlScan}?module=contract&action=getabi&address=${address}`
        var options = {
            'method': 'GET',
            'url': url,
            'headers': {}
        };
        console.log(url);
        request(options, function (error, response) {
            if (error) throw new Error(error);
            resolve(JSON.parse(JSON.parse(response.body).result))
        });
    })
}

function sleep(interval) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve()
        }, interval);
    })
}

; (async () => {
    var abi = await getAbi(_factory)
    var _factoryContract  = new connection.eth.Contract(abi, _factory);
    var limit = await _factoryContract.methods.allPairsLength().call()
    // limit = 20000
    var _lifeguardContract = new connection.eth.Contract(abiContratto, indirizzoContrattoCustom);

    var _forEach = 1000
    var start =0
    var pools = [];
    if(!(fs.existsSync(path.join(__dirname,"pools")))){
        fs.mkdirSync(path.join(__dirname,"pools"))
    }
    for(i=0;i<limit;i+=_forEach){
        _end = Math.min(start+_forEach,limit)
        console.log(start,_end)
        var output = await _lifeguardContract.methods.fetchAllPoolsAddress(_factory,start,_end).call()
        for(var j=0;j<output.length;j++){
            var w = {
                indirizzoToken0: output[j].tokens[0],
                indirizzoToken1: output[j].tokens[1],
                indirizzoPool: output[j].poolAddresses,
                tokens:[output[j].tokens[0], output[j].tokens[1]],
                index: start+j
            }
            pools.push(w)
        }

        await util.promisify(fs.writeFile)(path.join(__dirname, `pools/Pools${dex}.json`), JSON.stringify(pools))
        start+=_forEach
    }

    // var output = await _lifeguardContract.methods.fetchAllPoolsAddress("0x152ee697f2e276fa89e96742e9bb9ab1f2e61be3",0,1).call()
    // console.log(output)
})()
