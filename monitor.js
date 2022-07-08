// 1 Gwei = 10**9 Wei
// 1 ETH = 10**9 Gwei = 10**18 Wei
var Web3 = require('web3');
var abiContratto = (require('./abis/Lifeguard.json')).abi
const Discord = require('./DiscordWebhooks.js')
const discord = new Discord()
const _ = require('lodash')
const HDWalletProvider = require("@truffle/hdwallet-provider");
const fs = require("fs");
const path = require('path');
const util = require('util');
var request = require('request');
const mnemonic = fs.readFileSync(".secret").toString().trim(); //mnemonic phrase o chiave privata 
var chainsEndpoint = require('./endpoints/chainsEndpoint.json');
var webhooksEndpoint = require('./endpoints/discordWebs.json'); 
var dexAddresses = require('./endpoints/indirizziDex.json');
var chain = "Celo"
var dexes = ["Ubeswap"]

var userAddress = "0xD59488d45304b2C7DC593f491F7206073602854B"
var _gasPricePace = "slow" //fast, normal, slow
var owlAPI = (require('./endpoints/owlApi.json'))[chain]
var indirizzoContrattoCustom = (require('./endpoints/deployedAddresses.json'))[chain]
var scannerRoute = ((require('./endpoints/scannerAddresses.json'))[chain]).replace(/api./g,"").replace(/api/g,"")
var gasTracker=(require('./endpoints/owlracle.json'))[chain]
// https://docs.open.debank.com/en/reference/api-pro-reference/chain#returns-1
var poolZ = (require(`./monitorUtils/snipedPools${dexes.join("_")}.json`))
var finalPoolsPaths = (require(`./monitorUtils/finalPoolsPaths${dexes.join("_")}.json`))
var finalTokenPaths = (require(`./monitorUtils/finalTokenPaths${dexes.join("_")}.json`))
// var finalRouterPaths = (require(`./monitorUtils/finalDexesPaths${dexes.join("_")}.json`))

var url = chainsEndpoint[chain];
url=url[Math.floor(Math.random()*(url.length-1))]
// url = "http://localhost:8545"
var w_endpoint = webhooksEndpoint["General"]
var w_cop = webhooksEndpoint["Cop"]
var w_error = webhooksEndpoint["Error"]
// var _router = dexAddresses[dex].router
// var _factory = dexAddresses[dex].factory

var filterOut = true;

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

async function shoot(_tokens,_amount,_pools,_contract,_gasLimit,_gasPrice){
    // var swappa = _contract.methods.multipleSwapOnlyPools(_tokens,_pools,false)
    // var swappa = chain == "Celo"?_contract.methods.multipleSwapUniCelo(_tokens,_router,false):_contract.methods.multipleSwapUni(_tokens,_router,false)
    var swappa = chain == "Celo"?_contract.methods.multipleSwapOnlyPools(_tokens,_pools,false,false):_contract.methods.multipleSwapOnlyPools(_tokens,_pools,true,false)
    
    // console.log(_tokens,_amount,_contract)
    var encodedABI = swappa.encodeABI()
    var tx = {
        gas: Math.floor(_gasLimit),
        gasPrice:Math.floor(_gasPrice),
        from: userAddress,//(await connection.eth.personal.getAccounts())[0], //
        to: indirizzoContrattoCustom,
        data: encodedABI,
        value: Math.floor(_amount*(10**18))
    };
    // console.log(tx)
    const signPromise = await connection.eth.signTransaction(tx, tx.from);
    // console.log(signPromise)
    const sentTx = await connection.eth.sendSignedTransaction(signPromise.raw || signPromise.rawTransaction);
    console.log(sentTx)
    discord.arbWentThrough(w_cop,sentTx.transactionHash,scannerRoute);
}

// function getGasPrice(_multiplier){
//     return new Promise((resolve)=>{
//         var options = {
//             'method': 'GET',
//             'url': `https://owlracle.info/${gasTracker}/gas?apikey=${owlAPI}`,
//             'headers': {
//             }
//         };
//         request(options, function (error, response) {
//             if (error) throw new Error(error);
//             var _prices = JSON.parse(response.body).speeds
//             resolve(Math.floor(_prices[_prices.length-2].gasPrice*(10**9))*_multiplier) //Convert from Gwei to Wei
//         });
//     })
// }

function getGasPriceDebank(_chain, _pace,_multiplier){
    return new Promise((resolve)=>{
        var options = {
            'method': 'GET',
            'url': `https://api.debank.com/chain/gas_price_dict_v2?chain=${_chain}`,
            'headers': {
            }
        };
        request(options, function (error, response) {
            if (error) throw new Error(error);
            try{
                var p = Math.floor(JSON.parse(response.body).data[_pace].price)*_multiplier
                resolve(p);
            }catch(e){resolve(null)}
        });
    })
}

var contrattoLifeguard = new connection.eth.Contract(abiContratto, indirizzoContrattoCustom);
var swapFee = 0.3
var hashes = []
var blackList = [] 
var _baseTokenDecimals = 18
var _mockValue = 0.01*(10**_baseTokenDecimals) //for simulating swap in order to estimate gas limit
var excess = 0.8 //minimum gain that triggers bot is fee*excess (consider that on Celo averagely the paid fee is 65% of the expected fee)
var _gasPriceMultiplier = 1 //we estimate a gas price and a gas limit that is a x1.1 of the estimation obtained via the function
var _gasLimitMultiplier = 1.1 
var shotPaths = []
var maxPoolsWatched = -1
var _gasPrice
var _gasLimit
var _expectedNetworkFee
var thresholdGain

async function updateGasLimitAndPrice(){
    _gasPrice = await getGasPriceDebank(gasTracker,_gasPricePace,_gasPriceMultiplier) 
    //gasLimit dovrebbe essere quello della chain in questione: ricorda che abbiamo creato contrattoLifeguard a partire da connection. Meglio applicare il moltiplicatore al gas limit rispetto che al gas price
    _gasLimit = chain == "Celo"?await contrattoLifeguard.methods.multipleSwapOnlyPools(finalTokenPaths[0],finalPoolsPaths[0],false,true).estimateGas({value:_mockValue,from:userAddress}):await contrattoLifeguard.methods.multipleSwapOnlyPools(finalTokenPaths[0],finalPoolsPaths[0],true,true).estimateGas({value:_mockValue,from:userAddress})
    _gasLimit = _gasLimit *_gasLimitMultiplier
    _expectedNetworkFee = (_gasLimit*(_gasPrice/(10**_baseTokenDecimals))) // fee that will be paid if the transaction consumes 100% of the gas limit
    thresholdGain = _expectedNetworkFee*excess //we ask for a minimum gain that is at least excess% above of the expected network fee
    return thresholdGain
} 

setInterval(async()=>{
    try{
        await updateGasLimitAndPrice()
    }catch(e){}
},3000) //for staying in the api rate limit we request every 3 seconds

if(maxPoolsWatched<=0){
    maxPoolsWatched=finalPoolsPaths.length
}
// setInterval(async()=>{
//     try{
//         _gasPrice = await getGasPrice(_gasPriceMultiplier)
//     }catch(e){}
// },40000) //for staying in the api rate limit we request every 37.5 seconds

setInterval(async()=>{
    shotPaths = [] //re-initialize the array of token paths 
},60000)

function hashCode (s) {
    return s.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)
}

;(async()=>{
    await updateGasLimitAndPrice()
    for(var z=0;;z++){
        // var thresholdGain = 0.4

        // console.log("GAS Limit:", _gasLimit, "GAS price:", _gasPrice,"Expected Fee:", _expectedNetworkFee)
        if(_expectedNetworkFee==0){
            continue //sometimes, when it throws an error, se the expected network fee at zero
        }
        try{
            var outs = []
            var fullArbs = []
            var startAsk = performance.now()
            var pools = await contrattoLifeguard.methods.getPools(poolZ).call()
            var startComp = performance.now()
            orderedReserves = [] 
            orderedDecimals = []
            for(i=0;i<Math.min(finalPoolsPaths.length,maxPoolsWatched);i++){
                reservePath = []
                decimalPath = [] 
                for(j=0;j<finalPoolsPaths[i].length;j++){
                    var foundPool = pools[pools.findIndex(x=>x.pool===finalPoolsPaths[i][j])]
                    var index = foundPool.tokens.indexOf(finalTokenPaths[i][j])
                    var otherIndex = index===0?1:0
                    reservePath.push(foundPool.reserves[index],foundPool.reserves[otherIndex])
                    decimalPath.push(foundPool.decimals[index],foundPool.decimals[otherIndex])
                }
                orderedReserves.push(reservePath)
                orderedDecimals.push(decimalPath)
            }
            for(i=0;i<orderedReserves.length;i++){
                var _hashOfOpportunity = hashCode(finalTokenPaths[i]+orderedReserves[i])
                if(doesExistArbitrageWithLog(orderedReserves[i],orderedDecimals[i],swapFee)&&shotPaths.indexOf(finalTokenPaths[i])==-1&&hashes.indexOf(_hashOfOpportunity)==-1){
                    shotPaths.push(finalTokenPaths[i])
                    hashes.push(_hashOfOpportunity)
                    var commonValues = finalTokenPaths[i].filter(function(value) { 
                        return blackList.indexOf(value) > -1;
                    });
                    if(commonValues.length>0){
                        continue
                    }
                    var xStar = optimalInput(orderedReserves[i],orderedDecimals[i],swapFee)
                    var outarray = computeAmountsOut(orderedReserves[i],orderedDecimals[i],swapFee,xStar)
                    var out = outarray[outarray.length-1]
                    console.log(_hashOfOpportunity,xStar,out-xStar)
                    if(filterOut&&out<xStar+thresholdGain){
                        continue
                    }
                    hashy = "Tokens"+finalTokenPaths[i]+ "Pools"+finalPoolsPaths[i]+"Out"+out
                    outs.push(out)
                    var fullArb = {}
                    fullArb["Tokens"]=finalTokenPaths[i].join("\n")
                    fullArb["Pools"]=finalPoolsPaths[i]
                    fullArb["Reserves"]=orderedReserves[i]
                    fullArb["Decimals"]=orderedDecimals[i]
                    fullArb["Input"] = xStar
                    fullArb["Outs"]=outarray.join(" → ")
                    fullArb["Gain"]=out-xStar
                    fullArbs.push(fullArb)
                    try{
                        // await shootTest(finalTokenPaths[i],xStar,contrattoLifeguard)
                        shoot(finalTokenPaths[i], xStar,finalPoolsPaths[i],contrattoLifeguard, _gasLimit,_gasPrice)
                    }catch(e){
                        console.log(e)
                        discord.errorLogs(w_error,e)
                    }
                    // var d = dexes
                    var d = ["Dal PC"] 
                    discord.arbitrageAlert(w_endpoint,fullArb,d.join("_"))
                }
            }
            // console.log(fullArbs.sort((a, b) => a.Gain < b.Gain?1:-1))
            var endComp = performance.now()

            console.log("Fatto!", "Percorsi analizzati: ",orderedReserves.length, startComp-startAsk,endComp-startComp,"GAS Limit:", _gasLimit, "GAS price:", _gasPrice, "Expected Fee:", _expectedNetworkFee)
        }catch(e){
            console.log(e)
            console.log("Me so impallato nattimo")
            // discord.errorLogs(w_error,e)
        }
        process.on('uncaughtException', function (err) {
            console.log(err)
            // discord.errorLogs(w_error,err)
        });
    }
})()
