var Web3 = require('web3');
var abiContratto = (require('./abis/Lifeguard.json')).abi
const Discord = require('./DiscordWebhooks.js')
const discord = new Discord()
const _ = require('lodash')
const HDWalletProvider = require("@truffle/hdwallet-provider");
const fs = require("fs");
var path = require('path');
var util = require('util');
const mnemonic = fs.readFileSync(".secret").toString().trim(); //mnemonic phrase o chiave privata 
var chainsEndpoint = require('./endpoints/chainsEndpoint.json');
var webhooksEndpoint = require('./endpoints/discordWebs.json'); 
var dexAddresses = require('./endpoints/indirizziDex.json');
var chain = "Fantom"
var dexes =["SpiritSwap","SpookySwap","SushiFTM"]
var indirizzoContrattoCustom = (require('./endpoints/deployedAddresses.json'))[chain]
var poolZ = (require(`./monitorUtils/snipedPools${dexes.join("_")}.json`))
var finalPoolsPaths = (require(`./monitorUtils/finalPoolsPaths${dexes.join("_")}.json`))
var finalTokenPaths = (require(`./monitorUtils/finalTokenPaths${dexes.join("_")}.json`))
var finalRouterPaths = (require(`./monitorUtils/finalDexesPaths${dexes.join("_")}.json`))

const url = chainsEndpoint[chain];
// url = "http://localhost:8545"
var w_endpoint = webhooksEndpoint["general"]
// var _router = dexAddresses[dex].router
// var _factory = dexAddresses[dex].factory

var filterOut = true;
var thresholdGain = 0.0002

const HTTP_PROVIDER_LINK = new HDWalletProvider(mnemonic, url);
var connection = new Web3(HTTP_PROVIDER_LINK,);

function getAmountOut(_amountIn, _reserveIn, _reserveOut, swapFee,_decimalsIn,_decimalsOut){
    _amountIn=_amountIn*(10**_decimalsIn)
    swapFee=swapFee*10
    if((_reserveIn+(_amountIn*(1-swapFee)))==0){
        return 0
    }
    var amountOut = (_amountIn*(1000-swapFee)*_reserveOut)/(_reserveIn*1000+(_amountIn*(1000-swapFee)))
    return amountOut/(10**_decimalsOut)
}

function getAmountOutPaper(_amountIn, _reserveIn, _reserveOut, swapFee,_decimalsIn,_decimalsOut){
    _amountIn=_amountIn*(10**_decimalsIn)
    swapFee=swapFee/100
    if((_reserveIn+(_amountIn*(1-swapFee)))==0){
        return 0
    }
    var amountOut = (_amountIn*(1-swapFee)*_reserveOut)/(_reserveIn+(_amountIn*(1-swapFee)))
    return amountOut/(10**_decimalsOut)
}

function doesExistArbitrageWithLog(_orderedReserves,_orderedDecimals, _swapFee){
    var n =  _orderedReserves.length/2
    if(_orderedReserves.indexOf(0)>-1){
        return false
    }
    [R0s,R1s]=_orderedReserves.map((x)=>{return Math.log(x)}).reduce((a,c,i)=>(a[i%2]+=c,a),[0,0]);
    var lhs = n*Math.log(1-(_swapFee)/100)+R1s-R0s
    return lhs>0
}

function computeAmountsOut(_orderedReserves,_orderedDecimals,swapFee,input){
    out = input
    outArray = []
    for (var j=1;j<_orderedReserves.length;j+=2){
        out = getAmountOut(out,_orderedReserves[j-1],_orderedReserves[j],swapFee,_orderedDecimals[j-1],_orderedDecimals[j])
        outArray.push(out)
    }
    return outArray
}

function subArray(array,start, end) {
    if (!end) { end = -1; } 
    return array.slice(start, array.length + 1 - (end * -1));
};

function optimalInput(_orderedReserves,_orderedDecimals,swapFee){
    var n =  _orderedReserves.length/2
    var reservesIn = []
    var reservesOut = []
    for(var i=0;i<_orderedReserves.length;i++){
        if(i%2===0){
            reservesIn.push(_orderedReserves[i]/(10**_orderedDecimals[i]))
        }else{
            reservesOut.push(_orderedReserves[i]/(10**_orderedDecimals[i]))
        }
    }
    var delta = reservesIn.reduce((a, b)=> a*b, 1)
    var beta = reservesOut.reduce((a, b)=> a*b, 1)
    var epsilon = 1-(swapFee/100)
    var w = 1 
    for(var i = n-1; i > 0; i--){
        w = subArray(reservesIn,i).reduce((a, b)=> a*b, 1) + (epsilon*reservesOut[i-1]*w)
    }
    xStar= (-delta+Math.pow(Math.pow(epsilon,n)*beta*delta,0.5))/(epsilon*w)
    return xStar
}

async function shoot(_tokens,_amount,poolPath,_contract){
    // var swappa = _contract.methods.multipleSwapUniCelo(_tokens,_router,true)
    // var swappa = chain == "Celo"?_contract.methods.multipleSwapUniCelo(_tokens,_router,true):_contract.methods.multipleSwapUni(_tokens,_router,true)
    // var swappa = _contract.methods.multipleSwapOnlyPools(_tokens,poolPath,true)
    var swappa = chain == "Celo"?_contract.methods.multipleSwapOnlyPools(_tokens,poolPath,false,true):_contract.methods.multipleSwapOnlyPools(_tokens,poolPath,true,true)


    // console.log(_tokens,_amount,_routers,_contract)
    var encodedABI = swappa.encodeABI()
    var tx = {
        // gasPrice:600000000,
        // gas:372718,
        from: "0xD59488d45304b2C7DC593f491F7206073602854B",//(await connection.eth.personal.getAccounts())[0], //
        to: indirizzoContrattoCustom,
        data: encodedABI,
        value:  Math.floor(_amount*(10**18))
    };
    console.log(tx)
    const signPromise = await connection.eth.signTransaction(tx, tx.from);
    console.log(signPromise)
    const sentTx = await connection.eth.sendSignedTransaction(signPromise.raw || signPromise.rawTransaction);
    console.log(sentTx)
}

var contrattoLifeguard = new connection.eth.Contract(abiContratto, indirizzoContrattoCustom);
var swapFee = 0.3
var hashes = []
var blackList = ["0x49B8990F14C0b85f528d798Fc618B97bc3299C35","0x4510104CF2CC3Be071F171Be7C47b8d6bEabA234","0x22401536505dd5d85F7d57f8B37172feDa8f499d","0xD90BBdf5904cb7d275c41f897495109B9A5adA58"]

;(async()=>{
    try{
        var ethAmount =0.003090475997064518
        // // console.log(await connection.eth.getAccounts())
        // for(var i=0;i<finalTokenPaths.length;i++){
        //     var bools = await contrattoLifeguard.methods.qualityCheck([finalTokenPaths[i]],_router).call({ from: (await connection.eth.getAccounts())[0],value: Web3.utils.toWei(String(ethAmount), 'ether'), gas:5000000 })
        //     var justTrue = bools
        //     console.log(justTrue)
        // }
        var i = 100
        var tokenPath = finalTokenPaths[i]
        var poolPath = finalPoolsPaths[i]
        // tokenPath.pop()
        // poolPath.pop()
        console.log(tokenPath,poolPath)
        // var path = ["0x471EcE3750Da237f93B8E339c536989b8978a438", "0xd954C4c006189d967507b8ba758605364eB660D2", "0x765DE816845861e75A25fCA122bb6898B8B1282a", "0x471EcE3750Da237f93B8E339c536989b8978a438"] 
        // ["0x471EcE3750Da237f93B8E339c536989b8978a438", "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787", "0x4510104CF2CC3Be071F171Be7C47b8d6bEabA234", "0x471EcE3750Da237f93B8E339c536989b8978a438"]
        
        await shoot(tokenPath,ethAmount,poolPath,contrattoLifeguard)
        
        // for(var i =0;;i++){
        //     bools=[]
        //     // try{
        //         bools = await contrattoLifeguard.methods.multipleSwapUniCelo(path,_router,true).call({ from: (await connection.eth.getAccounts())[0],value: Web3.utils.toWei(String(ethAmount), 'ether'), gas:5000000 })
        //     // }catch(e){}
        //     console.log(bools)
        // }
    }catch(e){
        console.log(e)
        console.log("Me so impallato nattimo")
    }
})()

process.on('uncaughtException', function (err) {
    console.log(err)
});