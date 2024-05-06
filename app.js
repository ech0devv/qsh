const express = require('express');
const app = express();
const https = require('https');
var generator = require('generate-password');
var privateKey = fs.readFileSync( 'key.pem' );
var certificate = fs.readFileSync( 'key.key' );

const server = https.createServer({key: privateKey, cert: certificate}, app);
const { Server } = require("socket.io");
const io = new Server(server, {
    maxHttpBufferSize: 1e10
});

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

server.listen(443, () => {
    console.log('listening');
});