lucide.createIcons();
import { FileChunkReader } from "./parseFile.js";
import { QRCode } from './qrim.module.js';
import * as ZXing from 'https://esm.run/@zxing/library';
import moment from 'https://cdn.jsdelivr.net/npm/moment@2.30.1/+esm'

function setStatus(msg) {
    document.getElementById("statustext").innerHTML = msg;
    document.getElementById("statuswindow").style.display = "flex";
}
function setSubStatus(msg) {
    document.getElementById("substatus").innerHTML = msg;
    document.getElementById("statuswindow").style.display = "flex";
}
function hideStatus() {
    document.getElementById("statuswindow").style.display = "none";
}
document.getElementById('share').addEventListener('change', function (ev) {
    let file = ev.target.files[0];
    let chunkcount = file.size / 512000;
    const socket = io("https://qsh.ech0.dev");
    socket.on("connect_error", (err) => {
        // the reason of the error, for example "xhr poll error"
        console.log(err.message);

        // some additional description, for example the status code of the initial HTTP response
        console.log(err.description);

        // some additional context, for example the XMLHttpRequest object
        console.log(err.context);
    });
    socket.on("getConnectionType", () => {
        setStatus("sending connection type")
        socket.emit("fufillConnectionType", "send")
        socket.on("setTransferPassword", (pass) => {
            setStatus("password granted")
            document.getElementById("home").style.display = "none";
            document.getElementById("sharegrid").style.display = "grid";
            if (navigator.userAgent.match(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i)) {
                document.getElementById("sharegrid").style.display = "flex";
                document.getElementById("sharegrid").style.flexDirection = "column";
                document.getElementById("sharegrid").style.justifyContent = "space-between";

            }
            new QRCode(document.getElementById("shareQrcode"), {
                text: "https://qsh.ech0.dev/" + pass,
                size: 128,
                colorLight: "#1A1A1A",
                colorDark
                    : "#808080",
                style: QRCode.Styles.Blob,
            });
            document.getElementById("sharePass").innerHTML = pass;
            hideStatus();
            socket.on("ok", () => {
                setStatus("transferring...");
                console.log("connected to reciever");
                socket.emit("transfer", pass, "metadata", file.name, chunkcount);
                let sent = 0;
                let start, end;
                var reader = new FileChunkReader(file, 512 * 1024, true, function (ch) { socket.emit("transfer", pass, "chunk", ch); sent++; console.log(`sent chunk ${sent} out of ${chunkcount}`) }, function () { }, function () { socket.emit("transfer", pass, "done"); });
                var times = []
                start = Date.now();
                socket.on("getNextChunk", () => {
                    if (sent < chunkcount) {
                        end = Date.now();
                        times.push((end - start) / 1000)
                        setSubStatus(`${sent} out of ${chunkcount} chunks sent, approx ${moment.duration((Math.ceil((eval(times.join('+')) / times.length) * (chunkcount - sent))), 'seconds').humanize()}`)
                        reader.nextChunk();
                        start = Date.now()
                    }
                })
                socket.on("saved", () => {
                    socket.disconnect();
                    window.location.reload();
                })
            })
        })
    })
})

document.getElementById("inputPass").addEventListener("click", function () {
    receive(prompt('enter password'))
})

function stringToByteArray(binaryString) {
    let byteArray = [];
    for (let i = 0; i < binaryString.length; i++) {
        byteArray.push(binaryString.charCodeAt(i)); // Get the byte value
    }
    return byteArray;
}
function receive(pass) {
    // CommonJS
    const socket = io("https://qsh.ech0.dev");
    socket.on("connect_error", (err) => {
        // the reason of the error, for example "xhr poll error"
        console.log(err.message);

        // some additional description, for example the status code of the initial HTTP response
        console.log(err.description);

        // some additional context, for example the XMLHttpRequest object
        console.log(err.context);
    });
    socket.on("getConnectionType", () => {
        setStatus("sending connection type")
        socket.emit("fufillConnectionType", "receive")
        socket.on("getTransferPassword", () => {
            setStatus("sending password")
            socket.emit("fufillTransferPassword", pass);
            socket.on("ok", () => {
                console.log("connected to sender");
                setStatus("connected; waiting for metadata")
                socket.on("metadata", function (metadata) {
                    let name = metadata.split("/")[0];
                    let chunkcount = parseFloat(metadata.split("/")[1]);
                    setStatus("receiving")
                    socket.emit("transfer", pass, "getNextChunk");
                    console.log(name);
                    let arrayBuffers = [];
                    let times = [];
                    let received = 0;
                    let start, end;
                    start = Date.now();
                    socket.on("chunk", (chunkdata) => {
                        console.log("got a chunk");
                        end = Date.now();
                        arrayBuffers.push(stringToByteArray(chunkdata));
                        received++;
                        setStatus(`receiving`)
                        times.push((end - start) / 1000)
                        setSubStatus(`${received} out of ${chunkcount} chunks received, approx ${moment.duration((Math.ceil((eval(times.join('+')) / times.length) * (chunkcount - received))), 'seconds').humanize()}`)
                        start = Date.now();
                        socket.emit("transfer", pass, "getNextChunk");
                    })
                    socket.on("done", () => {
                        console.log("finished, making a blob")
                        const blobs = arrayBuffers.map(buffer => new Blob([buffer]));
                        const blob = new Blob(blobs);
                        console.log("done making blob")
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = name;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        socket.emit("transfer", pass, "saved");
                        hideStatus();
                        window.location.href = window.location.origin;
                    })
                })
            })
        })
    })
}
const lastchars = window.location.toString().split("/");
if (lastchars[lastchars.length - 1].length == 8) {
    console.log("qr scanned, " + lastchars[lastchars.length - 1])
    receive(lastchars[lastchars.length - 1])
}