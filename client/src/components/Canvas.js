import React, {useRef, useEffect, useState} from 'react'
import {
    onConnect,
    socketStatus,
    onServerTick,
    emitPlayerEvent,
    onAfterStartGame,
    emitStartGame,
    onDeath
} from '../socketFile';

import "./style/canvas.css"
import {useDispatch} from "react-redux";
import {logout} from "../redux/userSlice";
import store from "../redux/store";
import {useCallback} from 'react'
import ConnectedPlayers from "./ConnectedPlayers";

//const io = require("socket.io-client");
// or with import syntax
//import { io } from "socket.io-client";

//import MapRegion from './Snake.js'
//import Player from './Snake.js'
//import Camera from './Snake.js'
//import Controls from './Snake.js'

/****/

//   _________________________________________
//  / USE THIS TO DISABLE ALL CONSOLE.LOG FOR \
//  \ BETTER PERFORMANCE                      /                                    ###
//   -----------------------------------------                                    #o###
////////////////////////////////////          \   ^__^                          #####o###
////           \  (oo)\_______                 #o#\#|#/###
//console.log = function () {}   ////              (__)\       )\/\              ###\|/#o#
////                  ||----w |                  # }|{  #
////////////////////////////////////                  ||     ||                    }|{
//////////////////////////////////////////////////////////////////////////////////////////////

function CircularQueue(n) {
    //skal bare ha n elementer, men plassene kan være tomme.
    //index 0 er det nyeste, index 4 er det gamleste
    this.elements = [];
    this.maxLength = n;
    this.length = 0;
}

CircularQueue.prototype.add = function (o) {
    //{speedVector:{vx: 1, vy:0}}
    const a = {};
    this.elements.push(o)
    a.speedVector = {}
    a.cTick = JSON.parse(JSON.stringify(o.cTick))
    a.speedVector.vx = JSON.parse(JSON.stringify(o.speedVector.vx));
    a.speedVector.vy = JSON.parse(JSON.stringify(o.speedVector.vy));
    let c = Object.assign({}, a);
    this.elements.push({...JSON.parse(JSON.stringify(o))})

    //this.elements.push(e);
    if (this.elements.length >= this.maxLength) {
        this.elements.pop()
    }
};

CircularQueue.prototype.isEmpty = function () {
    return this.elements.length === 0;
};

CircularQueue.prototype.get = function (i) {
    if (i < 0)
        return undefined;
    return this.elements[i];
};

CircularQueue.prototype.peek = function () {
    return !this.isEmpty() ? this.elements[0] : undefined;
};
let serverTickPlayerHistory = []
let inputHistory = new Set()
let inputQueue = new CircularQueue(10);
//var gameStateHistory = new CircularQueue(10);
//let inputHistory = []
let frameRate = 80 // this number has to be the same on the server. It is the updateRate and client tick rate.
let positionDiscrepancyTreshold = 9
const squareWidth = 8
const squareHeight = 8
let firstSTickNumberRecieved = 0
let cvs;
let ctx;
let isRendering = false;
let hed = new Image()
let hedrot = new Image()
let hedrotl = new Image()
let hedrotr = new Image()
hedrotl.src = 'hed45.png'
hedrotr.src = 'hed-45.png'
hedrot.src = 'hedrotated.png'
hed.src = 'hed.png'

let lastTimestamp = 0,
    maxFPS = 12.5,
    timestep = 1000 / maxFPS;


class MapRegion {
    /**The map region defines the size of the larger map*/
    constructor(img) {
        this.img = img
        this.w = img.width
        this.h = img.height


    }

    draw(ctx) {
        /**Draws the given image on the canvas´ context**/
        ctx.drawImage(this.img, 0, 0)
    }
}

class Player {
    dead = false
    reconcileY = 0
    reconcileX = 0
    //**Need to implement a speedvector to make it easier to travel diagonally*/
    speedVector = {};
    keyPressed = {};
    //topKey = false
    //rightKey = false
    //bottomKey = false
    //leftKey = false
    /*body = [{"x": 100, "y": 300},
        {"x": 130, "y": 300},
        {"x": 160, "y": 300}, {"x": 190, "y": 300}, {"x": 220, "y": 300}, {"x": 250, "y": 300}]*/
    body = [{}]

    constructor(x, y) {
        // This is where the player will spawn relative to the map
        this.body[0].x = x || squareWidth
        this.body[0].y = y || squareHeight
        // https://stackoverflow.com/a/8556180/12077635
        // Keys pressed down, object = true
        document.addEventListener('keydown', e => {
            e.preventDefault()
            this.keyPressed[e.key] = true;
        }, false);
        // Keys not pressed anymore, object = false
        document.addEventListener('keyup', e => {
            this.keyPressed[e.key] = false;
        }, false);
    }


    update(map) {
        // get keystrokes being pressed down right now and update speedVector
        this.getKeyStrokes();
        //THIS.MOVE ER EXTRAPOLATING!!!!!!
        //this.move()
        // Optional, so they don't walk out of map boundaries
        this.enclose(map)
    }

    updateSpeedVector(newSpeedVector) {
        // If this.speedVector is not equal to the direction from keypressed, update speedVector and emit
        if (JSON.stringify(this.speedVector) !== JSON.stringify(newSpeedVector)) {
            this.speedVector = newSpeedVector;
            emitPlayerEvent(this.toSocketString());
        }
    }

    getKeyStrokes() {
        // Variables are true if WASD or UP LEFT DOWN RIGHT are pressed
        let up = (this.keyPressed['W'] || this.keyPressed['w'] || this.keyPressed['ArrowUp']);
        let left = (this.keyPressed['A'] || this.keyPressed['a'] || this.keyPressed['ArrowLeft']);
        let down = (this.keyPressed['S'] || this.keyPressed['s'] || this.keyPressed['ArrowDown']);
        let right = (this.keyPressed['D'] || this.keyPressed['d'] || this.keyPressed['ArrowRight']);
        let boost = this.keyPressed[' '];

        // UP DOWN LEFT RIGHT AND DIAGONAL
        if (up && right) {
            // DIAGONAL UP RIGHT
            if (boost) this.updateSpeedVector({vx: 2, vy: -2})
            else this.updateSpeedVector({vx: 1, vy: -1});

        } else if (up && left) {
            // DIAGONAL UP LEFT
            if (boost) this.updateSpeedVector({vx: -2, vy: -2});
            else this.updateSpeedVector({vx: -1, vy: -1});

        } else if (up) {
            // UP
            if (boost) this.updateSpeedVector({vx: 0, vy: -2});
            else this.updateSpeedVector({vx: 0, vy: -1});

        } else if (down && right) {
            // DIAGONAL DOWN RIGHT
            if (boost) this.updateSpeedVector({vx: 2, vy: 2});
            else this.updateSpeedVector({vx: 1, vy: 1});

        } else if (down && left) {
            // DIAGONAL DOWN LEFT
            if (boost) this.updateSpeedVector({vx: -2, vy: 2});
            else this.updateSpeedVector({vx: -1, vy: 1});

        } else if (down) {
            // DOWN
            if (boost) this.updateSpeedVector({vx: 0, vy: 2});
            else this.updateSpeedVector({vx: 0, vy: 1});

        } else if (right) {
            // RIGHT
            if (boost) this.updateSpeedVector({vx: 2, vy: 0});
            else this.updateSpeedVector({vx: 1, vy: 0});

        } else if (left) {
            // LEFT
            if (boost) this.updateSpeedVector({vx: -2, vy: 0});
            else this.updateSpeedVector({vx: -1, vy: 0});

        }

        // Only boost pressed
        else if (boost) {
            this.boost();
        }
    }

    boost() {
        // Only used when no keys are being pressed down except assigned boost key

        // multiplier is how many times faster you go after pressing space
        let multiplier = 2;
        // maxBoost is the maximum allowed speed
        let maxBoost = 2;

        // Check if you reached max speed
        let vxBetween = ((this.speedVector["vx"] * multiplier) >= -maxBoost) && ((this.speedVector["vx"] * multiplier) <= maxBoost)
        let vyBetween = ((this.speedVector["vy"] * multiplier) >= -maxBoost) && ((this.speedVector["vy"] * multiplier) <= maxBoost)

        if (vxBetween && vyBetween) {
            this.speedVector["vx"] *= 2;
            this.speedVector["vy"] *= 2;
            emitPlayerEvent(this.toSocketString())
        }
    }

    move() {
        //hvor ofte kjøres denne??? det er spørsmålet, og hvorfor kjøres den så ofte?
        //skyldes det img.eventlistener uansett rerenderer?
        let reconcileX = 0
        let reconcileY = 0
        if (this.reconcileX !== undefined) {

        }
        if (this.reconcileY !== undefined) {

        }


        let yspeed;
        let xspeed;
        if (this.speedVector.vx === undefined) {
            xspeed = 0
        } else {
            xspeed = this.speedVector.vx
        }
        if (this.speedVector.vy === undefined) {
            yspeed = 0
        } else {
            yspeed = this.speedVector.vy
        }
        const head = {
            x: this.body[0].x + (xspeed * squareHeight),
            y: this.body[0].y + (yspeed * squareHeight)
        };
        this.body.unshift(head);
        this.body.pop();
        //const currentSpeedVector = {speedVector: {vx: this.speedVector.vx, vy: this.speedVector.vy}}
    }

    enclose(map) {
        //function for making the boundaries of the map, i.e where the map ends, the player cannot travel further.
        if (this.body[0].x < 0) {
            //console.error("dead")
            this.body[0].x = 0
        } else if (this.body[0].x > map.w - squareWidth) {
            this.body[0].x = map.w - squareWidth
            //console.error("dead")
        }

        if (this.body[0].y < 0) {
            this.body[0].y = 0
            //console.error("dead")
        } else if (this.body[0].y > map.h - squareHeight) {
            this.body[0].y = map.h - squareHeight
            // console.error("dead")
        }
    }

    /* drawSnakePart(snakePart) {

        // Set the colour of the snake part
        snakeboard_ctx.fillStyle = snake_col;
        // Set the border colour of the snake part
        snakeboard_ctx.strokestyle = snake_border;
        // Draw a "filled" rectangle to represent the snake part at the coordinates
        // the part is located
        snakeboard_ctx.fillRect(snakePart.x, snakePart.y, 10, 10);
        // Draw a border around the snake part
        snakeboard_ctx.strokeRect(snakePart.x, snakePart.y, 10, 10);
      }*/

    draw(ctx, cvs) {
        /**Draws the player*/

        for (let i = this.body.length - 1; i >= 0; i--) {
            if (i === 0) {
                /* if (this.speedVector.vy === 1 && this.speedVector.vx === 1) {
                     ctx.translate(cvs.width/2, cvs.height/2);
                     ctx.rotate(0.385);
                     ctx.drawImage(hed, -squareWidth / 2, -squareHeight / 2, squareWidth, squareHeight);
                     ctx.rotate(-0.385);
                     ctx.translate(-cvs.width/2, cvs.height/2);
                     ctx.drawImage(hed, this.body[i].x, this.body[i].y, squareWidth, squareHeight)

                 } else */
                if (this.speedVector.vy !== 0) {
                    ctx.drawImage(hed, this.body[i].x, this.body[i].y, squareWidth, squareHeight)

                } else if (this.speedVector.vx !== 0) {

                    ctx.drawImage(hedrot, this.body[i].x, this.body[i].y, squareWidth, squareHeight)

                }
            } else {
                ctx.fillStyle = `rgb(
        ${Math.floor(255 - 2.5 * i)},
        ${Math.floor(200 - 10 * i * 2)},
        0)`;
                ctx.fillRect(this.body[i].x, this.body[i].y, squareWidth, squareHeight)
            }
        }
    }

    toSocketString() {
        return {
            'id': this.id,
            'speedVector': this.speedVector,
            'cTick': this.cTick
        }
    }

    addToInputHistory() {
        //inputQueue.add({speedVector: this.speedVector, cTick: this.cTick})
        if (inputHistory.length > 10) {
            inputHistory.delete(inputHistory[0])
        }
        if (this.speedVector !== {} || this.cTick !== 0) {
            inputHistory.add(JSON.parse(JSON.stringify({speedVector: this.speedVector, cTick: this.cTick})));
        }
    }
}

class Camera {
    constructor(x, y) {
        //størrelsen på kameraet er cvs.width * cvs.height
        // x and y are top-left coordinates of the camera rectangle relative to the map.
        // This rectangle is exctaly cvs.width px wide and cvs.height px tall.
        this.x = x || 0
        this.y = y || 0
    }

    focus(cvs, map, player) {
        // Account for half of player w/h to make their rectangle centered
        this.x = this.clamp(player.body[0].x - cvs.width / 2 + squareWidth / 2, 0, map.w - cvs.width)
        this.y = this.clamp(player.body[0].y - cvs.height / 2 + squareHeight / 2, 0, map.h - cvs.height)
    }

    clamp(coord, min, max) {
        /**clamp function https://en.wikipedia.org/wiki/Clamping_(graphics)**/
        /**Limits the position to the given min max range**/

        if (coord < min) {
            return min
        } else if (coord > max) {
            return max
        } else {
            return coord
        }
    }
}

// music
let loop = new Audio('musicloop.wav');
loop.loop = true;
/// Here is the react component that renders, has game logic etc.
const Canvas = props => {
    const [playerscore, setplayerscore] = useState(0);
    const [gamestateState, setGamestateState] = useState();
    const [sound, setSound] = useState(false);

    const canvasRef = useRef(null)
    let playerFuture = null
    let gameState;
    let food;
    let map;
    const player = new Player() //tar inn username som prop eller localstorage
    const camera = new Camera()
    //const controls = new Controls(player)
    let testData = {
        data: {
            players: [
                {
                    "id": 1,
                    "name": "user1234",
                    "body": [
                        {"x": 0, "y": 300}, //head
                        {"x": 30, "y": 300},
                        {"x": 60, "y": 300}
                    ]
                },
                {
                    "id": 2,
                    "name": "Slangete spiller",
                    "body": [
                        {"x": 100, "y": 300}, //head
                        {"x": 101, "y": 300},
                        {"x": 102, "y": 300}
                    ]
                }],
            food: [
                {"type": 1, pos: {"x": 10, "y": 11}},
                {"type": 2, pos: {"x": 10, "y": 11}},
            ]
        }
    }

    function drawFood(ctx, cvs) {
        if (gameState !== undefined && food !== undefined && food.length > 0) {
            for (let i = 0; i < food.length; i++) {
                /////x koordinaten betyr øverst til venstre hjørne, dvs posisjonen er ikke midt på.. må ha litt leeway
                //skaff et eple her..
                if (food[i].type === 1) {
                    ctx.fillStyle = 'red';
                    // ctx.fillRect(food[i].pos.x, food[i].pos.y, squareWidth, squareHeight)
                    ctx.beginPath();
                    ctx.arc(food[i].pos.x + squareWidth / 2, food[i].pos.y + squareWidth / 2, 2, 0, Math.PI * 2, true); // Outer circle
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.fillStyle = 'blue';
                    // ctx.fillRect(food[i].pos.x, food[i].pos.y, squareWidth, squareHeight)
                    ctx.beginPath();
                    ctx.arc(food[i].pos.x + squareWidth / 2, food[i].pos.y + squareWidth / 2, 2, 0, Math.PI * 2, true); // Outer circle
                    ctx.closePath();
                    ctx.fill();

                }
            }
        }

    }

    function drawOtherPlayers(ctx) {
        //når andre spillere skal tegnes, tegner vi den sammeposisjonen MANGE ganger, fordi vi får bare data fra serveren hvert 250ms
        //derfor må vi oppdatere alle andre spillere
        //størrelsen på kameraet er cvs.width * cvs.height, så vi bør finne en måtee å ikke rendre de på, med mindre de er innen for dette.
        if (gameState !== undefined && gameState.players !== undefined && gameState.players.length > 0) {
            for (let i = 0; i < gameState.players.length; i++) {

                for (let j = 0; j < gameState.players[i].body.length; j++) {
                    if (gameState.players[i].id !== player.id) {
                        if (Math.abs(gameState.players[i].body[j].x - player.body[0].x) > 200 && Math.abs(gameState.players[i].body[j].y - player.body[0].y) > 200) {
                            //if the other players body part is outside of view, do not render
                        } else {

                            if (j === 0) {

                                ctx.fillStyle = `rgb(
        ${Math.floor(255 - 42.5 * i)},
        ${Math.floor(255 - 42.5 * j)},
        0)`;
                                ctx.fillRect(gameState.players[i].body[j].x, gameState.players[i].body[j].y, squareWidth, squareHeight)
                                ctx.fill()
                                ctx.fillStyle = '#000000';
                                ctx.font = "10px Arial";
                                ctx.fillText(gameState.players[i].username, gameState.players[i].body[j].x, gameState.players[i].body[j].y);

                            } else {
                                ctx.fillStyle = '#FF555F';
                                ctx.fillRect(gameState.players[i].body[j].x, gameState.players[i].body[j].y, squareWidth, squareHeight)
                            }
                        }

                    }
                }
            }
            //ctx.fillRect(this.x, this.y, this.w, this.h)
        }
    }


    function updateOtherPlayers() {

        //here we do prediction, i e we just move the players without caring about the actual gamestate at this point.
        if ((gameState !== undefined) && (gameState.players !== undefined) && gameState.players.length > 0) {
            gameState.players.forEach(p => {
                const head = {
                    x: p.body[0].x + (p.speedVector.vx * squareHeight),
                    y: p.body[0].y + (p.speedVector.vy * squareHeight)
                };
                p.body.unshift(head);
                p.body.pop();

            });
        }

    }


    /**https://gist.github.com/mhuggins/28c387ebb665c4b73db1d3af61d6dcec**/
    /**Game.prototype._loop = function(win) {
  var fpsInterval = 1000 / this.fps;
  var currentTime = Date.now();
  var elapsedTime = currentTime - this.lastTime;

  win.requestAnimationFrame(function() {
    if (elapsedTime > fpsInterval) {
      this._move();
      this._draw();
      this.lastTime = currentTime - (elapsedTime % fpsInterval);
    }

    this._loop(win);
  }.bind(this));
};**/



    let playerCopy;
    player.cTick = 0;

    function doReconcillationX() {

    }


    function doReconcillationY() {
        if (Math.abs(player.body[0].y - player.reconcileY) < 5) {
            player.body = serverTickPlayerHistory[0].tickPlayer.body
        } else {
            //todo kanskje man kan gjøre dette i move funksjonen? Altså legge til eller trekke fra en liten delta, slik at spilleren er off grid litt?
            //vil det la seg gjøre?

            if (player.reconcileY !== undefined && Math.abs(player.reconcileY[0]) < 2) {
                player.reconcileY = player.body[0].y - serverTickPlayerHistory[0].tickPlayer.body[0].y

            }
            //
            player.body[0].y = player.body[0].y - (player.reconcileY / 4)
            player.reconcileY = player.reconcileY - (player.reconcileY / 4)
        }
    }

    const img = new Image()


    function gameStart() {
        /***Her starter gameloop/skriptet**/
        img.src = '2000x2000 BACKGROUND.jpeg'

        img.addEventListener('load', () => {


            // ms for each frame
            //let lastFrameTimeMs = 0, // The last time the loop was run
            //    maxFPS = 12.5;


            requestAnimationFrame(gameLoop);
        });
    }

    function gameLoop(timestamp) {
        //requestAnimationFrame(gameLoop);
        isRendering = true;
        map = new MapRegion(img)
        if (player.body.length > 1) {

            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.clearRect(0, 0, cvs.width, cvs.height)

            // Flip the sign b/c positive shifts the canvas to the right, negative - to the left
            ctx.translate(-camera.x, -camera.y)
            if (playerFuture !== null) {
                //player.body = playerFuture.body
                if (serverTickPlayerHistory[0].player === undefined) {

                } else {
                    //player.body = serverTickPlayerHistory[0].player.body
                    serverTickPlayerHistory = []
                }
            }
            // Draw
            /*if (player.reconcileX !== undefined && player.reconcileX > 5) {
                doReconcillationX()
            }
            if (player.reconcileY !== undefined && player.reconcileY > 5) {
                doReconcillationY()
            }*/
            player.update(map)
            /*if (tickPlayers !== null) {
                gameState.players = JSON.parse(JSON.stringify(tickPlayers));
                tickPlayers = null
            }*/
            // updateOtherPlayers(map)
            map.draw(ctx)

            camera.focus(cvs, map, player)
            drawOtherPlayers(ctx)

            player.draw(ctx, cvs)
            drawFood(ctx, cvs)

            player.cTick++
            isRendering = false;
        }
    }


    function startAnimationFromServerData(data) {
        //her må vi sjekke om noe har skjedd, eller om serveren har sendt en beskjed om at noe har skjhedD?
        //todo basically her kan vi legge til et array med timestamps, slik at vi ser hvor ofte vi er inn i denne spesifikke funksjonen.
        //todo da vet vi cirka hvor lenge en gameloop er.
        //hva skjer om man kaller denne funksjonen selv om loopen går? blir det hakkete da?
        requestAnimationFrame(gameLoop)
    }

    function reconcileTry(tickPlayer) {
        if (Math.abs(player.body[0].y - tickPlayer.body[0].y) < 5) {
            player.body = tickPlayer.body
            player.reconcileY = 0
        } else {
            //todo kanskje man kan gjøre dette i move funksjonen? Altså legge til eller trekke fra en liten delta, slik at spilleren er off grid litt?
            //vil det la seg gjøre?
            if (Math.abs(player.reconcileY) < 2) {
                player.reconcileY = player.body[0].y - tickPlayer.body[0].y
            }
            player.body[0].y = player.body[0].y - (player.reconcileY / 4)
            player.reconcileY = player.reconcileY - (player.reconcileY / 4)
        }
    }

    let tickPlayers;

//klienten har 6 kroppsdeler, mens serveren lager 3.
    function updateData(tick) {
        /*Here we are dealing with 3 types of players:
        * player = the current user
        * tickplayers = the players as they are on the server
        * gamestate.players = the players as they are on the client.
        * ***/
        //console.log("dataen vi har fått fra server TICK er: " + JSON.stringify(tick.data.data))
        // try {
        if (tick.data.data.players === null || ((tick.data.data.players === undefined)) || (gameState === undefined)) {
        } else {
            if (((tick.data.data.food !== undefined))) {
                food = tick.data.data.food
            }

            gameState.players = JSON.parse(JSON.stringify(tick.data.data.players))

            setGamestateState(tick.data.data)

            if ((tick.data.data.players.length !== gameState.players.length)) {
                //gameState = tick.data.data
                //todo dette skjer når noen dør - dvs spillet oppdateres seg ordentlig,  - fins det bedre måter å gjøre dette på?
                //if (!isRendering)
                //else tickPlayers = JSON.parse(JSON.stringify(tick.data.data.players))
            }
            //setGameState(data)/***{"data":{"players":[{"id":1,"name":"user1234","body":[{"x":0,"y":300},{"x":30,"y":300},{"x":60,"y":300}],"speed":{"x":1,"y":0}},{"id":2,"name":"Slangete spiller","body":[{"x":100,"y":300},{"x":101,"y":300},{"x":102,"y":300}],"speed":{"x":1,"y":1}},{"id":2,"name":"bot1","body":[{"x":439,"y":622},{"x":469,"y":622},{"x":499,"y":622}],"speed":{"vx":-1,"vy":-1}}],"food":[{"type":1,"pos":{"x":10,"y":11},"quadrant":1},{"type":2,"pos":{"x":500,"y":400},"quadrant":2}]}}*/
            tick.data.data.players.forEach(tickPlayer => {
                //her må vi sjekke hvor langt bak spillerne fra tickdata, hvis speedvector er feil, oppdater den? Kanskje evt bare oppdater speedvector?
                gameState.players.forEach(clientPlayers => {

                    if (tickPlayer.id === player.id) {
                        player.score = tickPlayer.score
                        // update score and send it to sessionStorage
                        setplayerscore(parseInt(tickPlayer.score))
                        sessionStorage.setItem("score", JSON.stringify(tickPlayer.score))

                        player.body = JSON.parse(JSON.stringify(tickPlayer.body))
                    }
                    /* if (tickPlayer.id === player.id) {
                         if (Math.abs(player.body[0].x - tickPlayer.body[0].x) > 9) {
                             //Todo gjør dette gradvis på en eller annen måte?
                             //altså sjekk hvor langt OFF spilleren er først, så kan man bytte body...
                             //denne blir alt for off??? WHY?
                             player.reconcileX = Math.abs(player.body[0].x - tickPlayer.body[0].x)
                             //alert(JSON.stringify(tickPlayer))
                             serverTickPlayerHistory.push(tickPlayer)
                             player.body = tickPlayer.body
                             //playerFuture = tickPlayer
                             //todo denne er bare for debugging - klienten må sende en liste hvert tick, ellers blir det ikke riktig.
                             // player.body = tickPlayer.body
                         }
                         if (Math.abs(player.body[0].y - tickPlayer.body[0].y) > 9) {
                             //Todo  HVORDAN GJØRE DETTE GRADVIS???????gjør dette gradvis på en eller annen måte?
                             //altså sjekk hvor langt OFF spilleren er først, så kan man bytte body...
                             //denne blir alt for off??? WHY?
                             //TODO DU ER INNE PÅ NOE HER!!!! DETTE ER EN MÅTE Å SNAPPE GRADVIS PÅ, MEN HVA SKJER MED FREMTIDIG GAMESTATES?????
                             //TODO MEN DETTE KAN IKKE GJØRES INNE I HER, DET MÅ GJØRES I UPDATE. INNE I HER ER VI BARE HVERT 200MS
                             player.reconcileY = player.reconcileY + (player.body[0].y - tickPlayer.body[0].y)
                             //alert(player.reconcileY)
                             player.body = tickPlayer.body
                             serverTickPlayerHistory.push({player: tickPlayer, sTick: tick.data.data.sTick})
                             //alert(JSON.stringify(tickPlayer))
                             //playerFuture = tickPlayer
                             //reconcileTry(tickPlayer);

                         }
                     }

                     if (tickPlayer.id === player.id && player.body.length < tickPlayer.body.length) {


                         //altså sjekk hvor langt OFF spilleren er først, så kan man bytte body...
                         // player.body = tickPlayer.body
                     }*/
                    //Checks if speedvector differs from the server, since the client only goes in the direction the last tick went in.
                    if ((tickPlayer.id !== player.id) && (tickPlayer.id === clientPlayers.id)) {
                        //todo HERE WE RECONCILE OTHER PLAYERS
                        /* if ((tickPlayer.speedVector !== clientPlayers.speedVector)) {
                             clientPlayers.speedVector = tickPlayer.speedVector
                             // console.error("NÅ ENDRER VI PÅ EN SPEEDVECTOR")
                         }*/
                        //må gjøre litt server reconcilliation nå.....
                        //hvordan kan man gjøre det gradvis ??? altså flytte LITT og LITT?
                        //lage et globalt flagg av typen (WORKINGONPOSITION=false)
                        //sett det her hvis det er off....

                        if ((Math.abs(tickPlayer.body[0].x - clientPlayers.body[0].x) > positionDiscrepancyTreshold) || Math.abs(tickPlayer.body[0].y - clientPlayers.body[0].y) > positionDiscrepancyTreshold) {
                            //HER, IKKE BARE SETT DEN LIK, MEN SETT DEN LITT MER LIK.
                            /*** todo: finn en måte å ikke bare SNAPPE her, men gjør det gradvis
                             *
                             * altså dette kan skape et hopp på x positionDiscrepancyTreshold
                             * https://en.wikipedia.org/wiki/Client-side_prediction
                             * Feks hvis tickPlayers.body[0].x er 20 foran, vil det otherplayer hoppe 20 units frem
                             *
                             *  Usually, the desync is corrected when the client receives the updated game state,
                             *  but as instantaneous correction would lead to "snapping", there are usually some "smoothing" algorithms involved.
                             *  For example, one common smoothing algorithm would be to check each visible object's client-side location to see
                             *  if it is within some error epsilon of its server-side location.
                             *  If not, the client-side's information is updated to the server-side directly
                             *  (snapped because of too much desynchronization).
                             *  However, if the client-side location is not too far,
                             *  a new position between the client-side and server-side is interpolated;
                             *  this position is set to be within some small step delta from the client-side location,
                             *  which is generally judged to be "small enough" to be unintrusive to the user.

                             Another solution to the desynchronization issue, commonly used in conjunction with client-side prediction,
                             is called server reconciliation.[2] The client includes a sequence number in every input sent to the server,
                             and keeps a local copy. When the server sends an authoritative update to a client,
                             it includes the sequence number of the last processed input for that client.
                             The client accepts the new state, and reapplies the inputs not yet processed by the server,
                             completely eliminating visible desynchronization issues in most cases.
                             *
                             *
                             *
                             *
                             * */

                            /*clientPlayers.body.forEach(clientbodyPart => {
                                tickPlayers.body.forEach(serverbodyPart =>{
                                    clientbodyPart.x = serverbodyPart.x
                                    clientbodyPart.y = serverbodyPart.y

                                    //smoothing algoritme!!!!! ????

                                })
                            })*/
                            /***Denne linja SNAPPER bodien, hvis den er litt off:*/
                            //fordi tickPlayers ligger litt bak, vil det være dumt å oppdatere asap ?
                            //hva kan man gjøre hvis serveren har en historie over
                            //clientPlayers.body = tickPlayer.body

                            // console.error("NÅ RETTER VI OPP EN SPILLER")
                            //console.error(Date.now)
                        }
                    }
                })
            });
            //gameState = data.data.data
            startAnimationFromServerData(tick.data.data)
        }
    }

    function startData(param) {

        console.log("dataen vi har fått fra AFTER START GAME er: " + JSON.stringify(param))

    }


    function checkDeath(data) {
        if (data.data.dead === player.id) {
            player.dead = true
            //denne reloaden bør byttes ut med bare en boolean
            window.location.reload()
        } else {
            //console.log(data.data.dead + " døde. Dermed kan vi gi poeng til den som drepte ? 0o ")
        }
    }

    useEffect(() => {


        onAfterStartGame((err, data) => function () {
            player.id = data.userid
            player.body = data.spawnLocation
            gameState = data.gamestate
            //gameStateHistory.append(gameState)
            player.cTick = data.gamestate.sTick + 5
        }({}));

    }, [onAfterStartGame])


    useEffect(() => {
        onDeath((err, data) => checkDeath({
            data
        }));
    }, [onDeath])


    useEffect(() => {
        onServerTick((err, data) => updateData({
            data
        }));
    }, [onServerTick])

    useEffect(() => {
        emitStartGame(store.getState().user.user.username)
        cvs = canvasRef.current
        ctx = cvs.getContext('2d');
        gameStart();
    }, []);

    const dispatch = useDispatch();


    const handleClick = (e) => {
        e.preventDefault();
        dispatch(logout({
            user: null,
        }));
        window.location.reload()
    }

    // music
    function handleSound(e) {
        e.preventDefault();
        // because setSound is async and too slow
        const newSound = !sound;
        // set sound to opposite
        setSound(state => !state);

        if (newSound && loop) {
            loop.play();
        } else if (loop) {
            loop.pause();
        }
    }

    return <div className="canvas_game">
        <h2>
            <button className='btnSound'
                    type="button"
                    onClick={(e) => handleSound(e)}>{sound ? "🔊 ON" : "🔈 OFF"}
            </button>
            May the odds be ever in your favor, {store.getState().user.user.username} &#128013;
            <button className='btnLogout'
                    type="button"
                    onClick={handleClick}>EXIT
            </button>
            <p>Score: {playerscore}</p>
        </h2>

        <ConnectedPlayers gamestate={gamestateState}/>
        <canvas style={{
            objectFit: "contain",
        }} ref={canvasRef} {...props}/>

    </div>
}

export default Canvas;