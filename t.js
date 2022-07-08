// var mock = require('./mock.json')
// var otherTokens = Object.keys(mock["0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83"])
// console.log(otherTokens.filter((item, index) => otherTokens.indexOf(item) != index))
// hashCode = s => s.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)
// console.log(hashCode("i"))
// var request = require('request');

// function getPriceDebank(_chain, _pace){
//     return new Promise((resolve)=>{
//         var options = {
//             'method': 'GET',
//             'url': `https://api.debank.com/chain/gas_price_dict_v2?chain=${_chain}`,
//             'headers': {
//             }
//         };
//         request(options, function (error, response) {
//             if (error) throw new Error(error);
//             try{
//                 resolve(JSON.parse(response.body).data[_pace].price);
//             }catch(e){resolve(null)}
//         });
//     })
    

// }
// ;(async()=>{
//     while(true) {
//         console.log(await getPriceDebank("ftm","fast"))
//     }
// })()
// var finalPoolsPaths = require("./monitorUtils/finalPoolsPathsUbeswap.json")
// console.log(poolZ)
// console.log(process.pid)

 var url = "https://fragrant-damp-dew.fantom.quiknode.pro/ef9a913eb4c5f4a1abe6706f00f57e497dc7b035/"