const { fork } = require("child_process");

// const child = fork("tchild.js");
var chain="Celo"
var dexes=["Ubeswap"]
var finalPoolPaths= (require(`./monitorUtils/finalPoolsPaths${dexes.join("_")}.json`))
var limit=finalPoolPaths.length
var _forEach = 100//50
var start =0

function launchAndListen(oggetto){
    const child = fork("tmonitor.js");    
    child.send(oggetto);
    child.on('message', function(message) { //every time we will receive a message from the child process we will assume that it committed suicide, so we start it again
        setTimeout(()=>{
            //we wait one second in order to prevent EACCES error
            launchAndListen(message)
        },1000)
    })
}

for(i=0;i<limit;i+=_forEach){
    var _end = Math.min(start+_forEach,limit)
    var oggetto={
        chain:chain,
        dexes:dexes,
        from:start,
        to:_end
    }
    console.log("Launching process with pools (from,to):",start,_end)
    launchAndListen(oggetto)
    start+=_forEach
}


