# import tracemalloc
# import os
# import psutil
import os
from sys import path
from math import floor, ceil
from random import randrange, randint
from time import time
from eventlet import wsgi
from eventlet.hubs.timer import Timer
from flask import Flask, render_template
from flask_restful import Api, abort
from flask_socketio import SocketIO
from flask_cors import CORS
from flask import request
from eventlet import sleep, wrap_ssl, listen
from coolname import generate
from werkzeug.middleware.dispatcher import DispatcherMiddleware

# import argparse
import argparse

path.append("server")
try:
    from mongoAdaptor import getTopPlayers, addToDatabase
except Exception as e:
    print(e)

""""Argument parsing"""
"""
parser = argparse.ArgumentParser(
    description="Flask + SocketIO server. Run as python[3] app.py [-v] [-nb number of bots]")

parser.add_argument("-v", "--verbose", dest='verbose', help="Sets output to verbose (may reduce performance)",
                    action='store_true')
parser.add_argument("-nb", "--numberofbots", dest='numbots', help="Specifies the number of bots", type=int, default=20)

args = parser.parse_args()

print(args.numbots)
if args.verbose:
    print("Verbose is set to on")
"""
# s = Summary('request_latency_seconds', 'Description of summary')
# s.observe(4.7)  # Observe 4.7 (seconds in this case)

hasFoodChanged = False
# warnings.filterwarnings('error', OpenSSL.SSL.Error)
# https://eventlet.net/doc/patching.html
from OpenSSL import SSL

# eventlet.monkey_patch()
app = Flask(__name__)
app.config.update(
    CELERY_BROKER_URL='amqp://admin:admin@localhost:5672/vhost',
    CELERY_RESULT_BACKEND='rpc://'
)

api = Api(app)
CORS(app)
# Session(redux)
port = '5000'
host = '0.0.0.0:5000'
# redux = redux.socketio.WSGIApp(sio)
socketio = SocketIO(app, cors_allowed_origins="*",
                    async_mode='eventlet')


# Routes
@app.route('/')
def index():
    return render_template("index.html", flask_token="Hello   world")


# app".route because leaderboard is a str and not a dict
@app.route('/api/leaderboard/')
def leaderboard():
    # Get and return leaderboard if server is up
    try:
        lboard = getTopPlayers(10)
        if lboard:
            return lboard
        else:
            # 503 Service Unavailable
            return abort(503, description="Database is not connected")
    except Exception as e:
        print(e)


# all, will be deleted in production
@app.route('/api/all/')
def leaderboard2():
    # Get and return leaderboard if server is up
    try:
        lboard = getTopPlayers(10000)
        if lboard:
            return lboard
        else:
            # 503 Service Unavailable
            return abort(503, description="Database is not connected")
    except Exception as e:
        print(e)


minFood = 1000

"""Game constants"""

foodIDStartNumber = 4000

print(os.environ['NUMBOTS'])
# If there is less real players than minPlayers, make bots so it is the correct amount of players
if os.environ['NUMBOTS'] is not None:
    minPlayers = int(os.environ['NUMBOTS'])
    print("number of bots is : " + str(minPlayers))
else:
    minPlayers = 20

#minPlayers = 20

# constants for tracking events.
serverTickRate = 0.09
framerate = 0.09

# size of a block, i e size of head and body parts
blockSize = squareWidth = squareSize = squareHeight = 8

# dimensions of board
gameW = mapH = 2000
gameH = mapW = 2000

# size of edibles
foodSize1 = 3
foodSize2 = 6

sTickNumber = 0

"""Global gamestate"""
# grid that holds objects ids, to make them easier to detect when checking for collisions.
numCells = ceil(mapH / squareSize)  # 500 cells, 500 x 500
cell_width = floor(gameW / numCells)  # 8 , det samme som square width
cell_height = floor(gameH / numCells)
grid = [[set() for i in range(numCells)] for j in range(numCells)]

LnumCells = ceil(mapH / (squareSize * 4))  # 125 cells, 125 x 125
Lcell_width = floor(gameW / LnumCells)  # 32, større celle.
Lcell_height = floor(gameH / LnumCells)
Lgrid = [[set() for p in range(LnumCells)] for q in range(LnumCells)]

# global gamestate. Could also be implemented as a singleton class.
gamestate = {
    "numClients": 0,
    "sTick": sTickNumber,
    "players": [],
    "food": [
    ]
}


class Player:
    def __init__(self, name: str, ID=None, bot=False, sid=None):
        if sid is not None:
            self.sid = sid
        if ID is None:
            self.id = createUserId()
        else:
            self.id = ID

        if bot:
            self.bot = bot
        self.username = name
        self.body, self.speedVector = spawnPlayer()
        gridPositions = set()
        LgridPositions = set()
        row, col = addBodyPartToGrid(self.body[0], self.id)
        gridPositions.add((row, col))
        lrow, lcol = addBodyPartToLGrid(self.body[0], self.id)
        LgridPositions.add((lrow, lcol))

        self.gridPositions = gridPositions
        self.LgridPositions = LgridPositions

        if bot:
            self.speedVector['vx'] = 1
            # Count the moves for a bot. If it reaches a certain count, it will change direction in encloseBots(bot) method
            self.count = 0
            # At which count the bot should move
            # 1 second = 10, example 80 = 8 seconds
            self.whenToMove = randint(60, 90)
        # print(str(self.__dict__) + " ble netopp lagd")
        self.score = 0


def makeBodyLonger(psnap):
    """Adds a block to the end of the player if the player has eaten food."""
    index = binSearchForID(gamestate['players'], 0, len(gamestate['players']) - 1, psnap['id'])
    if index == -1:
        return False
    op = gamestate['players'][index]
    if len(op['body']) < 15:
        newPart = op['body'][-1]
        # spørs dette på hvilken retning den er i ? 0o
        newPart['x'] = newPart['x'] + abs(squareSize * op['speedVector']['vx'])
        newPart['y'] = newPart['y'] + abs(squareSize * op['speedVector']['vy'])
        op['body'].append(newPart)


def checkFoodProximity(food, xp, yp):
    """Returns a food id the food is near xp, yp, else returns None"""
    if (food['pos']['x'] > xp - 250 and food['pos']['y'] > yp - 250) \
            and food['pos']['x'] < xp + 250 and food['pos']['y'] < yp + 250:
        return {"id": food['id'], "pos": food['pos'],
                "type": food['type']}


def createFoodListNearPlayer(p):
    """Creates a list of food within 250 units of the player"""
    xp = p['body'][0]['x']
    yp = p['body'][0]['y']
    foodregistry = [y for y in (checkFoodProximity(food, xp, yp) for food in gamestate['food']) if y is not None]

    return foodregistry


def playersToSocket():
    """Generates a player dict meant to be sent to the client"""
    players = []
    for player in gamestate['players']:
        pl = {"id": player['id'], "username": player['username'], "body": player['body'],
              "speedVector": player['speedVector'], "score": player['score']}
        players.append(pl)
    return players


def gamestateToSocket(p=None):
    """Generates gamestate"""
    return {"sTick": sTickNumber,
            "players": playersToSocket(),
            "food": createFoodListNearPlayer(p),
            }


def getLGridPosition(x, y):
    """Find the position in the grid, based off worldcoordinates"""
    if x >= mapW:
        # print(Lcell_width)
        x = floor(mapW - Lcell_width)
    if y >= mapH:
        # print(Lcell_width)
        y = floor(mapW - Lcell_width)
    if x < 0:
        x = 0
    if y < 0:
        y = 0
    grid_row = floor(x // Lcell_width)
    grid_column = floor(y // Lcell_height)
    if grid_row >= len(Lgrid[0]):
        grid_row = len(Lgrid[0]) - 1
    if grid_column >= len(Lgrid[0]):
        grid_column = len(Lgrid[0]) - 1
    return grid_row, grid_column


def getGridPosition(x, y):
    """Find the position in the large grid, based off worldcoordinates"""
    if x >= mapW:
        x = mapW - cell_width
    if y >= mapH:
        y = mapH - cell_width
    if x < 0:
        x = 0
    if y < 0:
        y = 0
    grid_row = floor(x // cell_width)
    grid_column = floor(y // cell_height)
    return grid_row, grid_column


def spawnPlayer():
    """Returns a free spot in the game area, i.e where no other player currently is"""
    j = 5
    i = 5
    whileCount = 0
    while len(grid[i][j]) > 0:
        i = randrange(4, numCells - 4, 1)
        j = randrange(4, numCells - 4, 1)
        sleep(0.004)
        whileCount += 1
        if whileCount > 10:
            break

    if (i == 0 or j == 0):
        xpos = 0
        ypos = 0
    else:
        xpos = floor(i * cell_width)
        ypos = floor(j * cell_height)

    x = randrange(xpos, xpos + cell_width, squareSize)
    x = x - x % squareSize
    y = randrange(ypos, ypos + cell_width, squareSize)
    y = y - y % squareSize
    return [{"x": x, "y": y},  # // "head"
            {"x": x + blockSize, "y": y},
            {"x": (x + blockSize * 2), "y": y},
            {"x": (x + blockSize * 3), "y": y},
            {"x": (x + blockSize * 4), "y": y},
            {"x": (x + blockSize * 5), "y": y}], {"vx": 0, "vy": 0}


def removeFoodFromGS(food, posx, posy):
    """Removes the given food item from gamestate and grid"""

    ##0 0 0
    ##0 x 0
    ##0 0 0
    if food['id'] in grid[posx][posy]:
        grid[posx][posy].remove(food['id'])

    if posx > 2:
        ##0 0 0
        ##x 0 0
        ##0 0 0
        if food['id'] in grid[posx - 1][posy]:
            grid[posx - 1][posy].remove(food['id'])

            if posy > 2:
                ##0 0 0
                ##0 0 0
                ##x 0 0
                if food['id'] in grid[posx - 1][posy - 1]:
                    grid[posx - 1][posy - 1].remove(food['id'])

    if posx < numCells - 1:
        ##0 0 0
        ##0 0 x
        ##0 0 0
        if food['id'] in grid[posx + 1][posy]:
            grid[posx + 1][posy].remove(food['id'])

        if posy < numCells - 1:
            ##0 0 x
            ##0 0 0
            ##0 0 0
            if food['id'] in grid[posx + 1][posy + 1]:
                grid[posx + 1][posy + 1].remove(food['id'])

    if posy > 2:
        ##0 0 0
        ##0 0 0
        ##0 x 0
        if food['id'] in grid[posx][posy - 1]:
            grid[posx][posy - 1].remove(food['id'])
            if posx < numCells - 1:
                ##0 0 0
                ##0 0 0
                ##0 0 x
                if food['id'] in grid[posx + 1][posy - 1]:
                    grid[posx + 1][posy - 1].remove(food['id'])

    if posy < numCells - 1:
        ##0 x 0
        ##0 0 0
        ##0 0 0
        if food['id'] in grid[posx][posy + 1]:
            grid[posx][posy + 1].remove(food['id'])

        if posx > 2:
            ##x 0 0
            ##0 0 0
            ##0 0 0
            if food['id'] in grid[posx - 1][posy + 1]:
                grid[posx - 1][posy + 1].remove(food['id'])

    # hasFoodChanged = True
    gamestate['food'].remove(food)


def binSearchForID(arr, low, high, x):
    """Utility search function"""
    if high >= low:

        mid = (high + low) // 2

        if arr[mid]['id'] == x:
            return mid

        elif arr[mid]['id'] > x:
            return binSearchForID(arr, low, mid - 1, x)

        else:
            return binSearchForID(arr, mid + 1, high, x)

    else:

        return -1


def checkForFood(p, lastX=None, lastY=None):
    """Runs through the player p's current gridpositions, checks if there is a food item in the players current grid cell."""
    if 'gridPositions' in p:
        for playerposition in p['gridPositions']:
            if len(grid[playerposition[0]][playerposition[1]]) > 1:
                for ID in grid[playerposition[0]][playerposition[1]].copy():
                    if checkCellForFood(ID, p, playerposition[0], playerposition[1]):
                        return

                    if playerposition[0] > 3 and len(grid[playerposition[0] - 1][playerposition[1]]) > 1:
                        for ID in grid[playerposition[0] - 1][playerposition[1]].copy():
                            if checkCellForFood(ID, p, playerposition[0], playerposition[1], lastX, lastY):
                                return
                    if playerposition[1] > 3 and len(grid[playerposition[0]][playerposition[1] - 1]) > 1:
                        for ID in grid[playerposition[0]][playerposition[1] - 1].copy():
                            if checkCellForFood(ID, p, playerposition[0], playerposition[1], lastX, lastY):
                                return
                    if playerposition[0] < numCells - 1:
                        for ID in grid[playerposition[0] + 1][playerposition[1]].copy():
                            if checkCellForFood(ID, p, playerposition[0], playerposition[1], lastX, lastY):
                                return
                    if playerposition[1] < numCells - 1:
                        for ID in grid[playerposition[0]][playerposition[1] + 1].copy():
                            if checkCellForFood(ID, p, playerposition[0], playerposition[1], lastX, lastY):
                                return


def increaseScore(p, food):
    p['score'] = p['score'] + food['type']


def checkIDForCollision(p, x, y, _gamestate, ID):
    """Checks for collisions between players"""
    if ID != p['id']:
        pheadx = p['body'][0]['x']
        pheady = p['body'][0]['y']
        index = binSearchForID(_gamestate['players'], 0, len(_gamestate['players']) - 1, int(ID))
        if index == -1:
            pass
        else:
            op = _gamestate['players'][index]
            if (abs(pheadx - op['body'][0]['x']) < 170
                and abs(pheady - op['body'][0]['y']) <= 170) \
                    or (abs(pheadx - op['body'][-1]['x']) < 170
                        and abs(pheady - op['body'][-1]['y']) <= 170):
                for bp in op['body']:
                    if abs(pheadx - bp['x']) < 8 \
                            and abs(pheady - bp['y']) < 8:
                        return True


def checkCellForCollision(p, cell, _gamestate):
    """Iterates through all IDs in the player's vicinity """
    # Covering a 3x3 square of grid to be sure of the edge cases.
    # Still is still much faster than brute force.

    for ID in Lgrid[cell[0]][cell[1]].copy():
        ##0 0 0
        ##0 x 0
        ##0 0 0
        if checkIDForCollision(p, cell[0], cell[1], _gamestate, ID):
            return True

    if cell[0] > 1:
        ##0 0 0
        ##0 0 0
        ##0 x 0
        for ID in Lgrid[cell[0] - 1][cell[1]].copy():
            if checkIDForCollision(p, cell[0] - 1, cell[1], _gamestate, ID):
                return True
        if cell[1] > 1:
            ##0 0 0
            ##0 0 0
            ##x 0 0
            for ID in Lgrid[cell[0] - 1][cell[1] - 1].copy():
                if checkIDForCollision(p, cell[0] - 1, cell[1] - 1, _gamestate, ID):
                    return True

    if cell[0] < LnumCells - 1:
        ##0 x 0
        ##0 0 0
        ##0 0 0
        for ID in Lgrid[cell[0] + 1][cell[1]].copy():
            if checkIDForCollision(p, cell[0] + 1, cell[1], _gamestate, ID):
                return True

        if cell[1] > 1:
            ##x 0 0
            ##0 0 0
            ##0 0 0
            for ID in Lgrid[cell[0] + 1][cell[1] - 1]:
                if checkIDForCollision(p, cell[0] + 1, cell[1] - 1, _gamestate, ID):
                    return True

    if cell[1] > 1:
        ##0 0 0
        ##x 0 0
        ##0 0 0
        for ID in Lgrid[cell[0]][cell[1] - 1].copy():
            if checkIDForCollision(p, cell[0], cell[1] - 1, _gamestate, ID):
                return True

    if cell[1] < LnumCells - 1:
        ##0 0 0
        ##0 0 x
        ##0 0 0
        for ID in Lgrid[cell[0]][cell[1] + 1].copy():
            if checkIDForCollision(p, cell[0], cell[1] + 1, _gamestate, ID):
                return True

        if cell[0] < LnumCells - 1:
            ##0 0 x
            ##0 0 0
            ##0 0 0
            for ID in Lgrid[cell[0] + 1][cell[1] + 1].copy():
                if checkIDForCollision(p, cell[0] + 1, cell[1] + 1, _gamestate, ID):
                    return True

        if cell[0] > 1:
            ##0 0 0
            ##0 0 0
            ##0 0 x
            for ID in Lgrid[cell[0] - 1][cell[1] + 1].copy():
                if checkIDForCollision(p, cell[0] - 1, cell[1] + 1, _gamestate, ID):
                    return True

    return False


def checkForCollision(p):
    """Goes through the player p's gridpositions, and checks if there are other ids"""
    if 'LgridPositions' in p:
        # print(p['LgridPositions'])
        for cell in p['LgridPositions']:
            if len(Lgrid[cell[0]][cell[1]]) > 1:
                return checkCellForCollision(p, cell, gamestate)


def removePlayerFromGamestate(ID=None, p=None):
    """Removes player from gamestate and grid"""
    pindex = 0
    if ID is not None:
        pindex = binSearchForID(gamestate['players'], 0, len(gamestate['players']) - 1, ID)
        if pindex == -1:
            # print("er det noen vi ikke finner???")
            return False
        if 'gridPositions' in gamestate['players'][pindex]:
            for pos in gamestate['players'][pindex]['gridPositions']:
                if ID in grid[pos[0]][pos[1]]:
                    # print("fjerner i RPFGS:")
                    # print(grid[pos[0]][pos[1]])
                    grid[pos[0]][pos[1]].remove(ID)
                    # print(grid[pos[0]][pos[1]])

        if 'LgridPositions' in gamestate['players'][pindex]:
            for lpos in gamestate['players'][pindex]['LgridPositions']:
                if ID in Lgrid[lpos[0]][lpos[1]]:
                    # print("fjerner i RPFGS:")
                    # print(Lgrid[lpos[0]][lpos[1]])
                    Lgrid[lpos[0]][lpos[1]].remove(ID)
                    # print(Lgrid[lpos[0]][lpos[1]])
                if ID in Lgrid[lpos[1]][lpos[0]]:
                    Lgrid[lpos[1]][lpos[0]].remove(ID)

        socketio.start_background_task(purgeGrid, ID)

        socketio.start_background_task(purgeLGrid, ID)

    elif p is not None:
        pindex = gamestate['players'].index(p)
        if 'gridPositions' in p:
            for pos in p['gridPositions']:
                if p['id'] in grid[pos[0]][pos[1]]:
                    # print("fjerner i RPFGS:")
                    # print(grid[pos[0]][pos[1]])
                    grid[pos[0]][pos[1]].remove(p['id'])
                    # print(grid[pos[0]][pos[1]])
                if p['id'] in grid[pos[1]][pos[0]]:
                    grid[pos[1]][pos[0]].remove(p['id'])

        if 'LgridPositions' in p['LgridPositions']:
            for Lpos in p:
                if p['id'] in Lgrid[Lpos[0]][Lpos[1]]:
                    # print("fjerner i RPFGS:")
                    # print(Lgrid[Lpos[0]][Lpos[1]])
                    Lgrid[Lpos[0]][Lpos[1]].remove(ID)
                if p['id'] in Lgrid[Lpos[1]][Lpos[0]]:
                    Lgrid[Lpos[1]][Lpos[0]].remove(ID)
                    # print(Lgrid[Lpos[0]][Lpos[1]])

        socketio.start_background_task(purgeGrid, p['id'])

        socketio.start_background_task(purgeLGrid, p['id'])

    del gamestate['players'][pindex]
    # print("DELETED" + str(ID))


def purgeLGrid(pID):
    for k in range(0, len(Lgrid) - 1):
        for m in range(0, len(Lgrid[0]) - 1):
            sleep(0.008)
            if pID in Lgrid[k][m]:
                Lgrid[k][m].remove(pID)


def purgeGrid(ID):
    for k in range(0, len(grid) - 1):
        for m in range(0, len(grid[0]) - 1):
            sleep(0.008)
            if ID in grid[k][m]:
                grid[k][m].remove(ID)


def checkCellForFood(ID, p, positionx, positiony, lastX=None, lastY=None):
    """Checks for collision between player p's head and a food item"""
    if int(ID) >= foodIDStartNumber:
        index = binSearchForID(gamestate['food'], 0, len(gamestate['food']) - 1, ID)
        if index == -1:
            return False
        food = gamestate['food'][index]
        if abs(p['body'][0]['x'] - food['pos']['x']) == 0 \
                and abs(p['body'][0]['y'] - food['pos']['y']) == 0:
            increaseScore(p, food)
            removeFoodFromGS(food, positionx, positiony)
            makeBodyLonger(p)
            return True
        elif abs(p['body'][2]['x'] - food['pos']['x']) == 0 \
                and abs(p['body'][2]['y'] - food['pos']['y']) == 0:
            increaseScore(p, food)
            removeFoodFromGS(food, positionx, positiony)
            makeBodyLonger(p)
            return True

        else:
            return False
    return False


def checkForEnclosure(playerSnapShot):
    """Checks wether the player has hit a wall"""
    if (
            playerSnapShot['body'][0]['x'] >= (gameW - 2 * squareWidth) or
            playerSnapShot['body'][0]['x'] < (2 * squareWidth) or
            playerSnapShot['body'][0]['y'] >= (gameH - (2 * squareWidth)) or
            playerSnapShot['body'][0]['y'] < (2 * squareWidth)
    ):
        # player might have hit wall and died
        return True
    else:
        return False


def updateGamestate(playerSnapShot):
    """Updates the gamestate with the client sent keypress"""
    if 'data' in playerSnapShot and 'id' in playerSnapShot['data'] and isinstance(playerSnapShot['data']['id'], int):
        currentID = playerSnapShot['data']['id']
        ind = binSearchForID(gamestate['players'], 0, len(gamestate['players']) - 1, currentID)
        if gamestate['players'][ind]['id'] == currentID:
            gamestate['players'][ind]['speedVector'] = playerSnapShot['data']['speedVector']


@socketio.on('playerevent')
def playerevent(data):
    updateGamestate(data)


def findIDInClientList(sid):
    for c in gamestate['players']:
        if 'sid' in c and c['sid'] == sid:
            return c['id']


@socketio.on('start game')
def createNewPlayer(username):
    newID = createUserId()
    if 'username' in username:
        newPlayer = Player(username['username'], ID=newID, sid=str(request.sid))
    else:
        newPlayer = Player(username, ID=newID, sid=str(request.sid))

    socketio.start_background_task(initPlayer, newID, newPlayer)
    sleep(0)


def initPlayer(newID, newPlayer):
    """Initializes a new player into the gamestate. Sends out the start location and id"""
    gamestate['players'].append(newPlayer.__dict__)
    gamestate['numClients'] = gamestate['numClients'] + 1
    socketio.emit('after start game',
                  {'userid': newID, 'spawnLocation': newPlayer.body[0],
                   'gamestate': gamestateToSocket(newPlayer.__dict__)},
                  to=newPlayer.__dict__['sid'])
    sleep(0)


@socketio.on('disconnect')
def disconnect():
    # print("DISCONNECT SID ER: " + request.sid)
    ID = findIDInClientList(request.sid)
    gamestate['numClients'] = gamestate['numClients'] - 1

    if ID != None:
        removePlayerFromGamestate(ID=ID)


IDCOUNTER = 0
FOODIDCOUNTER = 4000


def createFoodId():
    global FOODIDCOUNTER
    FOODIDCOUNTER += 1
    return FOODIDCOUNTER


def createUserId():
    global IDCOUNTER
    IDCOUNTER = IDCOUNTER + 1
    return IDCOUNTER


def broadCastDeath(p):
    """Sends a message to connected clients regarding someones death"""
    # print(str(p['id']) + "has died")
    removePlayerFromGamestate(p=p)
    socketio.emit('death', {'dead': p['id']})


@socketio.on('connect')
def connect():
    pass


def broadcastMessage():
    """Sends out gamestate, customized for each connectied client. Sends out data to one client"""
    if len(gamestate['players']) > 0:
        players = playersToSocket()
        for c in gamestate['players']:
            if 'sid' in c:
                socketio.emit('tick', {'data': {"sTick": sTickNumber,
                                                "players": players,
                                                "food": createFoodListNearPlayer(c),
                                                }}, to=c['sid'])


lastFrameTime = time()

FPS = 1000 / framerate


def updatePositionsWhile():
    """Main game loop for clients"""
    while 1:
        starttime = time()

        for p in gamestate['players']:
            if 'bot' not in p:
                updatePlayers(p)
                sleep(0)
        endtime = ((time() - starttime) % framerate)
        # sleeping the rest of the duration of the frame.
        sleep(framerate - endtime)


def updatePlayers(p):
    """Drives the game. Moves the players, checks for collisions."""
    global gamestate
    lastHeadx = p['body'][0]['x']
    lastHeady = p['body'][0]['y']
    move(p)
    checkForFood(p, lastHeadx, lastHeady)
    if checkForEnclosure(p) or checkForCollision(p):
        gamestate['numClients'] = gamestate['numClients'] + 1
        spawnFoodAfterDeath(p)
        # print("DEAD")
        broadCastDeath(p)
        # Database handling
        try:
            x = addToDatabase(p)
            if x[1]:
                socketio.emit('update leaderboard', {})
        except Exception as e:
            print(e)


def updateBotPosition():
    """Main game loop for bots"""

    while 1:
        starttime = time()
        for b in gamestate['players']:
            if 'bot' in b:
                updateBots(b)
                sleep(0)
        endtime = ((time() - starttime) % framerate)
        sleep(framerate - endtime)


def updateBots(bot):
    """Driver for bots. Moves the bots, checks for collisions."""

    setBotDirection(bot)
    move(bot)
    if checkForCollision(bot):
        spawnFoodAfterDeath(bot)
        broadCastDeath(bot)
        # Database handling
        try:
            x = addToDatabase(bot)
            if x[1]:
                socketio.emit('update leaderboard', {"x": "y"})
        except Exception as e:
            print(e)
    checkForFood(bot)


def setBotDirection(b):
    """Sets the bots speedvector depending on where it is. """
    if 'bot' in b and b['bot']:
        if b['body'][0]['x'] < blockSize * 5:  # far left
            # resets count so it won't randomly crash into the wall again
            b['count'] = 0
            if b['speedVector']['vx'] == -1:
                b['speedVector'] = {"vx": 0, "vy": 1}
            else:
                b['speedVector'] = {"vx": 1, "vy": 0}
        elif b['body'][0]['x'] > gameW - blockSize * 5:  # far right
            # resets count so it won't randomly crash into the wall again
            b['count'] = 0
            if b['speedVector']['vx'] == 1:
                b['speedVector'] = {"vx": 0, "vy": 1}
            else:
                b['speedVector'] = {"vx": -1, "vy": 0}

        elif b['body'][0]['y'] < blockSize * 5:  # far top
            # resets count so it won't randomly crash into the wall again
            b['count'] = 0
            if b['speedVector']['vy'] == -1:
                b['speedVector'] = {"vx": 1, "vy": 0}
            else:
                b['speedVector'] = {"vx": 0, "vy": 1}

        elif b['body'][0]['y'] > gameH - blockSize * 5:  # far bottom
            # resets count so it won't randomly crash into the wall again
            b['count'] = 0
            if b['speedVector']['vy'] == 1:
                b['speedVector'] = {"vx": -1, "vy": 0}
            else:
                b['speedVector'] = {"vx": 0, "vy": -1}
        else:
            # New direction if the bot is standing still or has moved the same direction for x amount of count
            b['count'] += 1
            # 1 count is approx 100ms right now
            if b['count'] >= b['whenToMove'] or (b['speedVector']['vx'] == 0 and b['speedVector']['vy'] == 0):
                # Sets new random speedVector
                b['speedVector'] = {"vx": randint(-1, 2), "vy": randint(-1, 2)}
                # resets count
                b['count'] = 0


def tick():
    """Main loop for broadcasting data to clients.
    In its own function and not in the update function to be able to still send data if bottlenecks happen elsewhere"""
    while 1:
        starttime = time()
        broadcastMessage()
        endtime = ((time() - starttime) % framerate)
        # sleeping the rest of the duration of the frame.
        sleep(framerate - endtime)


def addBodyPartToLGrid(bodypart, ID):
    """Adds a player's body part to the large grid"""
    lcol, lrow = getLGridPosition(bodypart['x'], bodypart['y'])
    Lgrid[lcol][lrow].add(ID)
    return lcol, lrow


def addBodyPartToGrid(bodypart, ID):
    """Adds a player's body part to the small grid"""
    grid_row, grid_column = getGridPosition(bodypart['x'], bodypart['y'])
    grid[grid_row][grid_column].add(ID)
    return grid_row, grid_column


def verifySpeedVector(player):
    """Anti hack measurements, sets vector to max if speedvector is above the legal limit"""
    if player['speedVector']['vx'] > 2:
        player['speedVector']['vx'] = 2
    if player['speedVector']['vx'] < -2:
        player['speedVector']['vx'] = -2
    if player['speedVector']['vy'] > 2:
        player['speedVector']['vy'] = 2
    if player['speedVector']['vy'] < -2:
        player['speedVector']['vy'] = -2


def move(player):
    """Moves the current player by removing the tail and inserting a new item at a new position for the head"""
    if player['speedVector'] == {}:
        pass
    else:
        verifySpeedVector(player)
        head = {
            'x': player['body'][0]['x'] + (player['speedVector']['vx'] * blockSize),
            'y': player['body'][0]['y'] + (player['speedVector']['vy'] * blockSize)
        }
        if head['x'] < 0:
            head['x'] = 0
        if head['y'] < 0:
            head['y'] = 0

        player['body'].insert(0, head)
        player['body'].pop()

    # removing old grid positions
    if 'gridPositions' in player:
        for punkt in player['gridPositions']:
            if player['id'] in grid[punkt[0]][punkt[1]]:
                # print("fjerner i move:")
                # print(grid[punkt[0]][punkt[1]])
                grid[punkt[0]][punkt[1]].remove(player['id'])
                # print(grid[punkt[0]][punkt[1]])
    if 'LgridPositions' in player:
        for punkt in player['LgridPositions']:
            if player['id'] in Lgrid[punkt[0]][punkt[1]]:
                # print("fjerner i move:")
                # print(Lgrid[punkt[0]][punkt[1]])
                Lgrid[punkt[0]][punkt[1]].remove(player['id'])
                # print(Lgrid[punkt[0]][punkt[1]])

    # adding new positions
    gridPositions = set()
    LgridPositions = set()
    for bp in player['body']:
        row, col = addBodyPartToGrid(bp, player['id'])
        gridPositions.add((row, col))
        lrow, lcol = addBodyPartToLGrid(bp, player['id'])
        LgridPositions.add((lrow, lcol))

    player['gridPositions'] = gridPositions
    player['LgridPositions'] = LgridPositions


def spawnFoodAfterDeath(p):
    for bp in p['body']:
        addOneFood(bp['x'], bp['y'])


def spawnFood():
    for i in range(0, minFood):
        if len(gamestate['food']) >= minFood:
            break
        addOneFood()


def addOneFood(x=None, y=None):
    """Adds one food to the gamestate and grid."""
    if x is None:
        x = randrange(squareSize * 3, mapW - squareWidth * 3, squareSize)
        y = randrange(squareSize * 3, mapH - squareWidth * 3, squareSize)

    foodID = createFoodId()
    grid_row, grid_column = getGridPosition(x, y)

    newfood = {"id": foodIDStartNumber + foodID, "type": randint(1, 3),
               "pos": {"x": x, "y": y}, "gridPositions": None}
    gridPositions = set()
    grid[grid_row][grid_column].add(newfood['id'])
    gridPositions.add((grid_row, grid_column))

    # Adding food to "nearby" grid positions, incase some of them are on the edge.

    if grid_row > 1:
        grid[grid_row - 1][grid_column].add(newfood['id'])
        gridPositions.add((grid_row - 1, grid_column))
        if grid_column > 1:
            grid[grid_row - 1][grid_column - 1].add(newfood['id'])
            gridPositions.add((grid_row - 1, grid_column - 1))

    if grid_row < numCells - 1:
        grid[grid_row + 1][grid_column].add(newfood['id'])
        gridPositions.add((grid_row + 1, grid_column))
        if grid_column < numCells - 1:
            grid[grid_row + 1][grid_column + 1].add(newfood['id'])
            gridPositions.add((grid_row + 1, grid_column + 1))

    if grid_column > 1:
        grid[grid_row][grid_column - 1].add(newfood['id'])
        gridPositions.add((grid_row, grid_column - 1))
        if grid_row < numCells - 1:
            grid[grid_row + 1][grid_column - 1].add(newfood['id'])
            gridPositions.add((grid_row + 1, grid_column - 1))

    if grid_column < numCells - 1:
        grid[grid_row][grid_column + 1].add(newfood['id'])
        gridPositions.add((grid_row, grid_column + 1))
        if grid_row > 1:
            grid[grid_row - 1][grid_column + 1].add(newfood['id'])
            gridPositions.add((grid_row - 1, grid_column + 1))

    # if (x % cell_width) >= 30 or (x % cell_height) <= 10:

    newfood['gridPositions'] = gridPositions
    # global hasFoodChanged
    # hasFoodChanged = True
    gamestate['food'].append(newfood)


def createWorld():
    """Function that creates food and bots. """
    while len(gamestate['players']) < minPlayers:
        # generate random name
        arr = generate()[0:2]
        newBot = Player(''.join(x.capitalize() for x in arr), bot=True)
        sleep(0.4)
        gamestate['players'].append(newBot.__dict__)

    spawnFood()


"""
def debug():
    while 1:
        snapshot = tracemalloc.take_snapshot()
        top_stats = snapshot.statistics('lineno')

        print("[ Top 10 ]")
        for stat in top_stats[:10]:
            print(stat)
        print(len(gamestate['food']))
        print(len(gamestate['players']))
        # gives a single float value
        print(psutil.cpu_percent())
        print(dict(psutil.virtual_memory()._asdict()))
        # print alle grid positions som ikke er tomme::
        for i in range(len(Lgrid)):
            for j in range(len(Lgrid[0])):
                if len(Lgrid[i][j]) > 0:
                    print(i, j)
                    print(Lgrid[i][j])

        # print(Lgrid)

        sleep(3)
"""

debugMode = False


def runObjectUpdate():
    while True:
        if len(gamestate['players']) < minPlayers or len(gamestate['food']) < minFood:
            createWorld()

        if len(gamestate['food']) > 100 + minFood:
            pass
            # remove a 100 foods from the game.
        socketio.sleep(20)


def status():
    while 1:
        print("Connected players/bots in total: " + str(len(gamestate['players'])))
        print("Connected clients: " + str(gamestate['numClients']))
        print("Number of food objects: " + str(len(gamestate['food'])))
        # print(gamestate['players'][0]['gridPositions'])
        # print(gamestate['players'][0]['LgridPositions'])
        i = 0
        sleep(0.5)
        # print(len(Lgrid))
        # print(len(Lgrid[0]))
        # print("ey")
        for k in range(0, len(Lgrid) - 1):
            for j in range(0, len(Lgrid[0]) - 1):
                # print(k, j)
                sleep(0.000055)
                if len(Lgrid[k][j]) > 0:
                    i = i + 1
                    # print(i, j)
                    # print(Lgrid[i][j])
                    print(Lgrid[k][j])
        print("Amount of Large-gridcells that are not empty: " + str(i))

        i = 0
        for m in range(0, len(grid) - 1):
            for n in range(0, len(grid[0]) - 1):
                # print(k, j)
                sleep(0.000055)
                if len(grid[m][n]) > 0:
                    i = i + 1
                    # print(i, j)

        print("Amount of Small-gridcells that are not empty: " + str(i))

        sleep(0.5)
        sleep(2)


# if args.verbose:
#    tracemalloc.start()

# tracemalloc.start()

# initializing green threads to run the game

socketio.start_background_task(runObjectUpdate)
socketio.start_background_task(updatePositionsWhile)
socketio.start_background_task(updateBotPosition)
socketio.start_background_task(tick)

# socketio.start_background_task(debug)
"""
if args.verbose:
    print("VERBOSE MODE")
    socketio.start_background_task(debug)
"""

if __name__ == "__main__":
    context = ('server.crt', 'server.key')  # certificate and key files

    wsgi.server(wrap_ssl(listen(('0.0.0.0', 8000)),
                         certfile='server.crt',
                         keyfile='server.key',
                         server_side=True),
                app)
