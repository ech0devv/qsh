// CommonJS
const io = require("socket.io-client");
const socket = io("http://localhost:3000");
const fs = require('fs')

socket.on("getConnectionType", () => {
    socket.emit("fufillConnectionType", "send")
    socket.on("setTransferPassword", (pass) => {
        console.log("Password: " + pass)
        socket.on("ok", () => {
            console.log("connected to reciever");
            socket.on("getNextChunk", () => {
                const readStream = fs.createReadStream("./samplefile", {highWaterMark: 1024000});
                readStream.on('data', function(chunk) {
                    socket.emit("transfer", pass, "chunk", chunk);
                });
                readStream.on('end', function(){
                    socket.emit("transfer", pass, "done");
                    console.log("done");
                })
            })
        })
    })
})