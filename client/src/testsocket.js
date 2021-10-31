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
console.log(ipaddress)

var obj = {};

const numberofclients = 35


let connection = new Promise(function (resolve, reject) {
    // executor (the producing code, "singer")
    for (var i = 1; i <= numberofclients; i++) {
        obj["socket" + i] = io(ipaddress, {
            // RejectUnauthorized is set to false when in development
            "rejectUnauthorized": false,
            'force new connection': true
        })
        sleep(100)
    }
    setTimeout(function () {
        //alert('first function finished');
        resolve();
    }, 1);
});

/*
function connection(callback) {
    for (var i = 1; i <= 50; i++) {
        obj["socket" + i] = io(ipaddress, {
            // RejectUnauthorized is set to false when in development
            "rejectUnauthorized": false,
            'force new connection': true
        })
    }
    setTimeout(function () {
        //alert('first function finished');
        if (typeof callback == 'function')
            callback();
    }, 1);
}
*/
console.log(obj.socket); // => 1

function onConnect() {
    for (let j = 1; j <= numberofclients; j++) {
        obj["socket" + j].on('connect', function (task) {
            console.log(j + " Is connected")
        });
        sleep(100)
        obj["socket" + j].on("after start game", data => {
            //console.log("KOMMER VI INN HIT TIL TICK?")
            console.log(data)
            obj["socket" + j].id = data.userid
        });
        sleep(100)
    }
    setTimeout(function () {
        //alert('first function finished');
        //obj["socket" + j].emit("start game", "socketTest")
    }, 1);
}

connection.then(function () {
    for (let j = 1; j <= numberofclients; j++) {
        obj["socket" + j].on('connect', function (task) {
            console.log(j + " Is connected")
            obj["socket" + j].on("after start game", data => {
                //console.log("KOMMER VI INN HIT TIL TICK?")
                let id;
//console.log(data)
                obj["socket" + j].id = data.userid
                for (let s = 1; s <= numberofclients; s++) {
                    id = s + 1;
                    obj["socket" + s].emit("playerevent", {data: {"id": obj["socket" + s].id, "speedVector": {vx: 1, vy: 0}}})
                    console.log("emitting playerevent for " + obj["socket" + s].id)
                }
                for (let s = 1; s <= numberofclients; s++) {
                    id = s + 1;
                    obj["socket" + s].emit("playerevent", {data: {"id": obj["socket" + s].id, "speedVector": {vx: 1, vy: 0}}})
                    console.log("emitting playerevent for " + obj["socket" + s].id)
                }
                for (let s = 1; s <= numberofclients; s++) {
                    id = s + 1;
                    obj["socket" + s].emit("playerevent", {data: {"id": obj["socket" + s].id, "speedVector": {vx: 1, vy: 0}}})
                    console.log("emitting playerevent for " + obj["socket" + s].id)
                }

            });

            obj["socket" + j].emit("start game", "socketTest" + j)
        });
    }
})








