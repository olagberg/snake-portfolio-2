import openSocket from 'socket.io-client';
// ipaddress is 'https://127.0.0.1:8000/' because docker expose port 8000 to the host,
// so the host send GET requests to 127.0.0.1:8000

//for å kjøre docker, bruk denne::::
let ipaddress = 'https://127.0.0.1:8000/';

//i development, per nå, kjør denne:
//let ipaddress = 'https://0.0.0.0:8000/';

function getSocketIP() {
    return ipaddress;
}

function setSocketIP(newIP) {
    ipaddress = "https://"+ newIP;
    // Close old socket
    socket.close();
    // make new socket
    socket = openSocket(getSocketIP(), {
        // RejectUnauthorized is set to false when in development
        "rejectUnauthorized": false
    })
}


let socket = openSocket(getSocketIP(), {
    // RejectUnauthorized is set to false when in development
    "rejectUnauthorized": false
})

function socketStatus() {
    return socket.connected;
}

//en subscribe metode, som
//Når skal klienten sende brukernavn og kanskje IP?
function onConnect(callback) {
    //getClientsIP:
    //This should run once per game, at the start
    socket.on('connect', function () { // 'connect' matcher det som er satt opp på serveren
        console.log('Connected with the server through the socket');
        //her må klienten sende username og id.
    });
}

function onDeath(callback) {
    socket.on('death', data => {
        callback(null, data)
    });
}

function onAfterStartGame(callback) {
    socket.on('after start game', data => {
        callback(null, data)
    });
}

function onServerTick(callback) {
    socket.on('tick', data => {
        //console.log("KOMMER VI INN HIT TIL TICK?")

        callback(null, data)
    });
}

//This runs often
function emitPlayerEvent(playerData) {
    socket.emit('playerevent', {data: playerData})
}

//This should run once per game, at the start
function emitStartGame(usernameIn) {
    socket.emit('start game', {username: usernameIn})
    console.warn("usernamein:", usernameIn)
}

function updateLeaderboard(callback) {
    socket.on('update leaderboard', data => {
        console.log("UPDATE LB")
        callback(null, data)
    });
}

export {
    socketStatus,
    getSocketIP,
    setSocketIP,
    onDeath,
    onConnect,
    onServerTick,
    emitPlayerEvent,
    emitStartGame,
    onAfterStartGame,
    updateLeaderboard
}
