import os
from bson.json_util import dumps, loads
import pymongo
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError

# DOCKER VARIABLE:
client = MongoClient(f"mongodb://{os.environ['MONGODB_HOSTNAME']}:27017/")

# NON-DOCKER VARIABLE:
#client = MongoClient(f"mongodb://127.0.0.1:27017/")

# Make database 'leaderboard'
db = client.leaderboard
# Make collection 'leaderboard'
collection = db.leaderboard
# If player scores better than top ten, socketio.emit('update leaderboard')
topTenPlayers = []


def addToDatabase(player):
    """
    Adds player to leaderboard collection if players username is not in the database or
    the player improved their score.
    Return True in [0] if player got a higher score than the last player with the same username,
    and the player is successfully added to the collection.
    Return True in [1] if player is added to top 10 leaderboard, so we can
    emit 'update leaderboard' in app.py for react to update state.
    """

    # Check if player already exists in collection
    if getPlayer(player):
        oldPlayer = getPlayer(player)
        # If the players name already exists, check if the score is better
        if oldPlayer["score"] < player["score"]:
            # If the score is better, update database
            collection.update_one({'username': player['username']}, {'$set': {"score": player["score"]}})
            # import from outer scope
            global topTenPlayers
            # update global topTenPlayers
            getTopPlayers(10)
            # Check if player is in top ten
            for i in topTenPlayers:
                if player['username'] in i['username']:
                    # Player is in top ten, return True in
                    # tuple [1]. True = socketio.emit('update leaderboard') in app.py so react component update
                    return True, True
        else:
            return False, False
    # Player not in database, insert player to collection
    else:
        collection.insert_one({"username": player["username"], "score": player["score"]})
        # If players score is larger than tenth place
        if player['score'] > topTenPlayers[9]['score']:
            return True, True
        # If database length is less than 10, update leaderboard in react
        if collection.estimated_document_count() <= 10:
            return True, True

    # Player successfully added to database
    return True, False


def getTopPlayers(amountOfPlayers):
    """Choose how many players sorted by highest score you want to retrieve.
    Returns a list of the length specified of the highest scoring players in descending order."""
    # Find top players in database
    try:
        topPlayers = collection.find().sort("score", pymongo.DESCENDING).limit(amountOfPlayers)
        # BSON dump so it is valid BSON for flask
        dump = dumps(topPlayers)
        # import and set global topTenPlayers for comparison in addToDatabase
        global topTenPlayers
        # convert topPlayers dump to list through bson loads, list(topPlayers) doesn't work
        topTenPlayers = loads(dump)
        # return BSON dump
        return dump
    # Server is down, return false
    except ServerSelectionTimeoutError:
        return False


def getPlaceInLeaderboard(player):
    """Returns players current place at the leaderboard of how many total players with unique names.
    The players place will be calculated with "total documents with greater score than player" + 1.
    Example for usage: Your place at the leaderboard: {place} / {totalPlayers}"""
    place = collection.count_documents({"score": {"$gt": player["score"]}}) + 1
    totalPlayers = collection.estimated_document_count()
    # If the players place at the leaderboard is lower than totalPlayers, set place = totalPlayers
    if place > totalPlayers:
        totalPlayers = place

    return place, totalPlayers


def resetDatabase():
    """Deletes every document in collection leaderboard in database leaderboard"""
    collection.delete_many({})
    print("db.leaderboard in mongoDB reset successfully...")


def getPlayer(username):
    """Get player by username. Also used to see if player already is in the database.
       Returns player if found and False if not found in the collection."""
    try:
        if isinstance(username, str):
            result = collection.find_one({"username": username})
            if result is not None:
                return result

        elif isinstance(username, dict):
            result = collection.find_one({"username": username["username"]})
            if result is not None:
                return collection.find_one({"username": username["username"]})
        # Database returned 0 or invalid parameter input
        return False
    except KeyError:
        # "username" not found in username, return not found => False
        return False


def runDemo():
    """Shows a demo of addToDatabase and getPlaceInLeaderboard"""
    d1 = {"username": "Ola", "score": 100}
    d2 = {"username": "Tom", "score": 300}
    d3 = {"username": "Hajin", "score": 500}
    d4 = {"username": "Superwoman", "score": 1000}
    print("---------------------")
    print("addToDatabase(player) returns True if player successfully added, "
          "and False if player already  exists in database with an equal or lower score.\n")
    print(f'{d1} added to the database!') if addToDatabase(d1) else print(f'{d1} NOT added to the database!')
    print(f'{d2} added to the database!') if addToDatabase(d2) else print(f'{d2} NOT added to the database!')
    print(f'{d3} added to the database!') if addToDatabase(d3) else print(f'{d3} NOT added to the database!')
    print(f'{d4} added to the database!') if addToDatabase(d4) else print(f'{d4} NOT added to the database!')
    print("---------------------")
    print(
        "getPlaceInLeaderboard(player) returns at [0] the players current placement at the leaderboard, "
        "and at [1] total amount of players at the leaderboard.\n")
    print(
        f'{d1["username"]} placed {getPlaceInLeaderboard(d1)[0]} out of {getPlaceInLeaderboard(d1)[1]} in the leaderboard!')
    print(
        f'{d2["username"]} placed {getPlaceInLeaderboard(d2)[0]} out of {getPlaceInLeaderboard(d2)[1]} in the leaderboard!')
    print(
        f'{d3["username"]} placed {getPlaceInLeaderboard(d3)[0]} out of {getPlaceInLeaderboard(d3)[1]} in the leaderboard!')
    print(
        f'{d4["username"]} placed {getPlaceInLeaderboard(d4)[0]} out of {getPlaceInLeaderboard(d4)[1]} in the leaderboard!')
    print("---------------------")
    print(
        "getPlayer(username) returns player dict if username is found, and you can provide a string or dict as a parameter. "
        "Function return False if the database returns None, which means the player doesn't exist in the database.\n")
    print(f'getPlayer(\"Ola\") returns {getPlayer("Ola")}')
    print(f'getPlayer(d1) also returns {getPlayer(d1)}')
    print(f'getPlayer("asdasdasda") returns {getPlayer("asdasdasda")}')
    print("---------------------")


def isConnected():
    """Returns if client is connected to mongodb backend"""
    try:
        return True
    except ServerSelectionTimeoutError:
        return False


def addExamplePlayers():
    addToDatabase({"username": {"username": "Ola"}, "score": 10})
    addToDatabase({"username": "Tom", "score": 90})
    addToDatabase({"username": "Hajin", "score": 90})
    addToDatabase({"username": "Superwoman", "score": 100})
    addToDatabase({"username": "Superman", "score": 12})
    addToDatabase({"username": "Ant-Man", "score": 31})
    addToDatabase({"username": "Iron Man", "score": 78})
    addToDatabase({"username": "Black Panther", "score": 21})
    addToDatabase({"username": "Wonder woman", "score": 77})
    addToDatabase({"username": "Meaning of Life", "score": 42})
    print("addExamplePlayers done")
