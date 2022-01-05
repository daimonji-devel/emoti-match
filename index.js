import express from 'express';
import * as socketIo from 'socket.io';
import http from 'http';
import path from 'path';
import url from 'url';
import { RoomHandler } from './model/RoomHandler.js';
import { Player } from './model/Player.js';


const errorCategories = {
  'createRoomError': 'Cannot create room',
  'enterRoomError': 'Cannot enter room',
  'unspecificError': 'Cannot proceed'
}

const errorTypes = {
  'userNameError': 'User name is not accepted',
  'maxRoomsError': 'Maximum number of rooms reached. Please try again later',
  'roomIdError': 'Incorrect room ID. Please try with a correct one',
  'maxPlayersError': 'Maximum number of players reached. Please try in a different room',
  'unknownError': 'Reasons unknown'
}

function errorMessage(category, type) {
  let categoryMessage = errorCategories[category in errorCategories ? category : 'unspecificError'];
  let typeMessage = errorTypes[type in errorTypes ? type: 'unknownError'];
  return `${categoryMessage}. ${typeMessage}.`;
}

async function processError(socket, category, type) {
  let message = errorMessage(category, type);
  socket.emit(category, {type: type, message: message});
  console.log(`${category} ${type} ${message}`);
}

async function onConnection(socket) {
  socket.on('createRoom', (data) => onCreateRoom(socket, data));
  socket.on('enterRoom', (data) => onEnterRoom(socket, data));
}

async function onCreateRoom(socket, data) {
  let userName = data['name'];
  if (!userName) {
    processError(socket, 'createRoomError', 'userNameError');
  }
  else if (rooms.isFull()) {
    processError(socket, 'createRoomError', 'maxRoomsError');
  }
  else {
    try {
      let room = await rooms.createNewRoom();
      let player = new Player(socket, userName);
      room.addPlayer(player);
      console.log(`player "${userName}" created room ${room.id()}`);
      socket.emit('roomCreated', room.publicInfo());
    }
    catch (error) {
      processError(socket, 'createRoomError');
    }
  }
}

async function onEnterRoom(socket, data) {
  let userName = data['name'];
  if (!userName) {
    processError(socket, 'enterRoomError', 'userNameError');
    return
  }
  let roomId = data['roomId'];
  let room = await rooms.getRoom(roomId);
  if (!room) {
    processError(socket, 'enterRoomError', 'roomIdError');
  }
  else if (room.isFull()) {
    processError(socket, 'enterRoomError', 'maxPlayersError');
  }
  else {
    let newPlayer = new Player(socket, userName);
    room.addPlayer(newPlayer);
    let roomInfo = room.publicInfo();
    roomInfo['newPlayer'] = newPlayer.publicInfo();
    for (let player of room.playerIterator()) {
      if (player == newPlayer) {
        socket.emit('roomEntered', roomInfo);
      }
      else {
        player.socket().emit('newPlayer', roomInfo);
      }
    }
    console.log(`player "${userName}" entered room ${room.id()}`);
  }
}

const maxRooms = 5;
const maxPlayers = 5;
const rooms = new RoomHandler(maxRooms, maxPlayers);

const app = express();

const modulePath = url.fileURLToPath(import.meta.url);
const publicPath = path.join(path.dirname(modulePath), 'public');
app.use(express.static(publicPath));

const port = process.env.PORT || 3000;
const httpServer = http.createServer(app);
const socketIoServer = new socketIo.Server(httpServer);

socketIoServer.on('connection', onConnection);
httpServer.listen(port, () => console.log('emoti-match listens on port ' + port));
