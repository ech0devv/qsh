lucide.createIcons();
import { FileChunkReader } from "./parseFile.js";
import { QRCode } from './qrim.module.js';
import * as ZXing from 'https://esm.run/@zxing/library';
import moment from 'https://cdn.jsdelivr.net/npm/moment@2.30.1/+esm'
/*
Quiet.init({
    profilesPrefix: "/web/",
    memoryInitializerPrefix: "/web/",
    libfecPrefix: "/web/"
});
Quiet.addReadyCallback(function(){
    console.log("ready");
    var transmit = Quiet.transmitter({profile: "audible"});
    transmit.transmit(Quiet.str2ab("hiii :3"));
});
*/
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
                text: pass,
                size: 128,
                colorLight: "#1A1A1A",
                colorDark
                    : "#808080",
                style: QRCode.Styles.Blob,
            });
            document.getElementById("sharePass").innerHTML = pass;

            document.getElementById("sendquiet").addEventListener("click", function () {
                Quiet.init({
                    profilesPrefix: "/",
                    memoryInitializerPrefix: "/",
                    libfecPrefix: "/"
                });
                Quiet.addReadyCallback(function () {
                    console.log("ready");
                    var transmit = Quiet.transmitter({ profile: "audible" });
                    transmit.transmit(Quiet.str2ab(pass));
                });
            })
            hideStatus();
            socket.on("ok", () => {
                setStatus("transferring...");
                console.log("connected to reciever");
                socket.emit("transfer", pass, "metadata", { "name": file.name, "chunkcount": Math.ceil(chunkcount) });
                let sent = 0;
                var reader = new FileChunkReader(file, 512 * 1024, true, function (ch) { socket.emit("transfer", pass, "chunk", ch); sent++; console.log(`sent chunk ${sent} out of ${chunkcount}`) }, function () { }, function () { socket.emit("transfer", pass, "done"); });
                socket.on("getNextChunk", () => {
                    if (sent < chunkcount) {
                        reader.nextChunk();
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
function decodeContinuously(codeReader, selectedDeviceId) {
    codeReader.decodeFromInputVideoDeviceContinuously(selectedDeviceId, 'camera', (result, err) => {
        if (result) {
            try {
                receive(result.text);
                document.getElementById("scannercontainer").style.display = "none";
                codeReader.reset();
            } catch (err2) {
                console.log(err2);
            }
        }
    })
}
document.getElementById("activateqr").addEventListener("click", function () {
    let camera = document.getElementById("camera");
    camera.height = document.documentElement.clientHeight * 0.5;
    camera.width = document.documentElement.clientWidth * 0.5;
    document.getElementById("scannercontainer").style.display = "flex";
    const codeReader = new ZXing.BrowserQRCodeReader()
    console.log(codeReader.getVideoInputDevices())

    codeReader.getVideoInputDevices().then((devices) => {
        decodeContinuously(codeReader, devices[devices.length - 1].deviceId)

    })

})
document.getElementById("inputPass").addEventListener("click", function () {
    receive(prompt('enter password'))
})
var quietexists = false;
var rec;
document.getElementById("receiveQuiet").addEventListener("click", function () {
    if (!quietexists) {
        quietexists = true;
        document.getElementById("receiveQuiet").style.color = "#cc1111";
        Quiet.init({
            profilesPrefix: "/",
            memoryInitializerPrefix: "/",
            libfecPrefix: "/"
        });
        Quiet.addReadyCallback(function () {
            rec = Quiet.receiver({
                profile: "audible", onReceive: function (recvPayload) {
                    console.log("yay")
                    let content = new ArrayBuffer(0);
                    content = Quiet.mergeab(content, recvPayload);
                    receive(Quiet.ab2str(content));

                }
            })


        })
    } else {
        if (rec) {
            rec.destroy();
        }
        document.getElementById("receiveQuiet").style.color = "#808080";

        quietexists = false;
    }
})

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
                if (rec) {
                    rec.destroy();
                }
                document.getElementById("receiveQuiet").style.color = "#808080";
                console.log("connected to sender");
                setStatus("connected; waiting for metadata")
                socket.on("metadata", function (metadata) {
                    setStatus("receiving")
                    socket.emit("transfer", pass, "getNextChunk");
                    console.log(metadata.name);
                    let arrayBuffers = [];
                    let times = [];
                    let received = 0;
                    let start, end;
                    start = Date.now();
                    socket.on("chunk", (chunkdata) => {
                        console.log("got a chunk");
                        end = Date.now();
                        arrayBuffers.push(chunkdata);
                        received++;
                        setStatus(`receiving`)
                        times.push((end - start) / 1000)
                        setSubStatus(`${received} out of ${metadata.chunkcount} chunks received, approx ${moment.duration((Math.ceil((eval(times.join('+')) / times.length) * (metadata.chunkcount - received))), 'seconds').humanize()}`)
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
                        a.download = metadata.name;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        socket.emit("transfer", pass, "saved");
                        hideStatus();
                        window.location.reload();
                    })
                })
            })
        })
    })
}
