// CommonJS
const io = require("socket.io-client");
const socket = io("http://127.0.0.1:3000");
const fs = require('fs')
const args = process.argv.slice(2);

socket.on("getConnectionType", () => {
    socket.emit("fufillConnectionType", "receive")
    socket.on("getTransferPassword", () => {
        socket.emit("fufillTransferPassword", args[0]);
        socket.on("ok", () => {
            console.log("connected to sender");
            socket.emit("transfer", args[0], "getNextChunk");
            socket.on("chunk", (chunkdata) => {
                fs.appendFile("samplefile_out", chunkdata, (err) => {
                    if(err){
                        console.error(err);
                        return;
                    }
                })
            })
            socket.on("done", () => {
                console.log("file transferred")
            })
        })
    })
})