lucide.createIcons();
import { parseFile } from "./parseFile.js";
import { QRCode } from './qrim.module.js';
import * as ZXing from 'https://esm.run/@zxing/library';
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
document.getElementById('share').addEventListener('change', function (ev) {
    let file = ev.target.files[0];
    const socket = io("https://qsh.ech0.dev");
    socket.on("getConnectionType", () => {
        socket.emit("fufillConnectionType", "send")
        socket.on("setTransferPassword", (pass) => {
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
                    var transmit = Quiet.transmitter({ profile: "audible-7k-channel-0" });
                    transmit.transmit(Quiet.str2ab(pass));
                });
            })
            socket.on("ok", () => {
                console.log("connected to reciever");
                socket.emit("transfer", pass, "name", file.name);
                socket.on("getNextChunk", () => {
                    parseFile(file, { chunkSize: 1024 * 1024, binary: true, onChunkRead: function (ch) { socket.emit("transfer", pass, "chunk", ch); }, success: function () { socket.emit("transfer", pass, "done"); } })

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
        decodeContinuously(codeReader, devices[0].deviceId)
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
                profile: "audible-7k-channel-0", onReceive: function (recvPayload) {
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
    socket.on("getConnectionType", () => {
        socket.emit("fufillConnectionType", "receive")
        socket.on("getTransferPassword", () => {
            socket.emit("fufillTransferPassword", pass);
            socket.on("ok", () => {
                if (rec) {
                    rec.destroy();
                }
                document.getElementById("receiveQuiet").style.color = "#808080";
                console.log("connected to sender");
                socket.on("name", function (name) {
                    socket.emit("transfer", pass, "getNextChunk");
                    console.log(name);
                    let arrayBuffers = [];
                    socket.on("chunk", (chunkdata) => {
                        console.log("got a chunk");
                        arrayBuffers.push(chunkdata);
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

                    })
                })
            })
        })
    })
}
