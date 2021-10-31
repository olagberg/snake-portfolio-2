import socketio

# standard Python

import urllib3

urllib3.disable_warnings()
import logging

# logging.getLogger('socketIO-client').setLevel(logging.DEBUG)
# logging.basicConfig()
sio = socketio.Client(ssl_verify=False)
sio.connect('https://127.0.0.1:8000')

print('my sid is', sio.sid)


@sio.event("connect")
def connect():
    print("I'm connected!")


@sio.event("after start game")
def connect(data):
    print("I'm connected!" + str(data))



def emitStartGame():
    sio.emit('start game', 'User123')

@sio.event
def connect_error(data):
    print("The connection failed!")


@sio.event
def disconnect():
    print("I'm disconnected!")
