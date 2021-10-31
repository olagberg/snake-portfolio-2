//import openSocket from "socket.io-client";
//var rp = require('request-promise');
const io = require("socket.io-client");
//var io = require('socket.io-client');

// ipaddress is 'https://127.0.0.1:8000/' because docker expose port 8000 to the host,
// so the host send GET requests to 127.0.0.1:8000
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


//for å kjøre docker, bruk denne::::
let ipaddress = 'https://127.0.0.1:8000/';
//console.log(ipaddress)

let socket

let connection = new Promise(function (resolve, reject) {
    // executor (the producing code, "singer")
    socket = io(ipaddress, {
        // RejectUnauthorized is set to false when in development
        "rejectUnauthorized": false,
        'force new connection': true,
        "reconnection": false

    })
    setTimeout(function () {
        //alert('first function finished');
        resolve();
    }, 1);
});

connection.then(function () {
    socket.on('connect', function (task) {
        //console.log(j + " Is connected")
        socket.on("after start game", data => {
            //console.log("KOMMER VI INN HIT TIL TICK?")

            socket.id = data.userid

            socket.emit("playerevent", {
                data: {
                    "id": socket.id,
                    "speedVector": {vx: 1, vy: 0}
                }
            })

            sleep(100)
            socket.emit("playerevent", {
                data: {
                    "id": socket.id,
                    "speedVector": {vx: 0, vy: 1}
                }
            })
            //console.log("emitting playerevent for " + obj["socket" + s].id)

            sleep(100)
            socket.emit("playerevent", {
                data: {
                    "id": socket.id,
                    "speedVector": {vx: -1, vy: 0}
                }
            })
            //console.log("emitting playerevent for " + obj["socket" + s].id)


            setTimeout(
                function () {

                    socket.emit("playerevent", {
                        data: {
                            "id": socket.id,
                            "speedVector": {vx: 1, vy: 0}
                        }
                    })
                }, 4000);

            setTimeout(
                function () {

                    socket.emit("playerevent", {
                        data: {
                            "id": socket.id,
                            "speedVector": {vx: 0, vy: -1}
                        }
                    })
                }, 3600);

            setTimeout(
                function () {

                    socket.emit("playerevent", {
                        data: {
                            "id": socket.id,
                            "speedVector": {vx: -1, vy: 1}
                        }
                    })
                }, 200);
            //console.log("emitting playerevent for " + obj["socket" + s].id)

            setTimeout(
                function () {

                    socket.emit("playerevent", {
                        data: {
                            "id": socket.id,
                            "speedVector": {vx: 0, vy: 1}
                        }
                    })
                }, 400);


            setTimeout(
                function () {

                    socket.emit("playerevent", {
                        data: {
                            "id": socket.id,
                            "speedVector": {vx: 1, vy: 0}
                        }
                    })
                }, 800);


            setTimeout(
                function () {

                    socket.emit("playerevent", {
                        data: {
                            "id": socket.id,
                            "speedVector": {vx: 0, vy: -1}
                        }
                    })
                }, 1200);

            setTimeout(
                function () {

                    socket.emit("playerevent", {
                        data: {
                            "id": socket.id,
                            "speedVector": {vx: 0, vy: 1}
                        }
                    })
                }, 1600);
            //


            //console.log("emitting playerevent for " + obj["socket" + s].id)
            setTimeout(
                function () {
                    socket.emit("playerevent", {
                        data: {
                            "id": socket.id,
                            "speedVector": {vx: -1, vy: 0}
                        }
                    })
                }, 2000);
            //

            //console.log("emitting playerevent for " + obj["socket" + s].id)


            setTimeout(
                function () {
                    socket.emit("playerevent", {
                        data: {
                            "id": socket.id,
                            "speedVector": {vx: 0, vy: -1}
                        }
                    })
                }, 2500);
            //


            //console.log("emitting playerevent for " + obj["socket" + s].id)

            sleep(3000)


            setTimeout(
                function () {
                    socket.disconnect()
                }, 13000);
            //
        });

        socket.emit("start game", "socketTest" + Math.floor(Math.random() * 200));
    })
    ;

})








