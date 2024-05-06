const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    maxHttpBufferSize: 1e10
});
var generator = require('generate-password');

app.use(express.static('web'))

io.on('connection', (socket) => {
    console.log('user connected');
    socket.emit("getConnectionType");
    socket.on("fufillConnectionType", (type) => {
        if (type == "send") {
            let pass = generator.generate({ length: 8, numbers: true, excludeSimilarCharacters: true, strict: true });
            socket.emit("setTransferPassword", pass)
            socket.join(pass);
        } else if (type == "receive") {
            socket.emit("getTransferPassword");
            socket.on("fufillTransferPassword", (pass) => {
                if (io.sockets.adapter.rooms.has(pass)) {
                    socket.join(pass);
                    io.to(pass).emit("ok");
                }
            })
        }
    })
    socket.on("transfer", (pass, command, arg) => {
        console.log(`handing over ${pass} ${command} ${arg}`)
        if (io.sockets.adapter.rooms.has(pass)) {
            io.to(pass).emit(command, arg)
        }
    })
});

server.listen(3192, () => {
    console.log('listening on *:3192');
});