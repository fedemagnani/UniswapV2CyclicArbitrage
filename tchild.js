process.on("message", function(message) {
    setInterval(function() {
        try{
            console.log(message).length;
        }catch(e){
            process.send(message)
            process.exit()
        }
    },2000)
})