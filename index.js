import express from 'express';
import * as socketIo from 'socket.io';
import { randomBytes } from 'crypto';
import http from 'http';
import path from 'path';
import url from 'url';


const errorCategories = {
  'createRoomError': 'Cannot create room',
  'enterRoomError': 'Cannot enter room',
  'unspecificError': 'Cannot proceed'
}

const errorTypes = {
  'userNameError': 'User name is not accepted',
  'maxRoomsError': 'Maximum number of rooms reached. Please try again later',
  'unknownError': 'Reasons unknown'
}

function errorMessage(category, type) {
  let categoryMessage = errorCategories[category in errorCategories ? category : 'unspecificError'];
  let typeMessage = errorTypes[type in errorTypes ? type: 'unknownError'];
  return `${categoryMessage}. ${typeMessage}.`;
}

async function createNewRoom() {
  for (let i = 0; i < 10; i++) {
    let id = randomBytes(4).toString('hex');
    if (!rooms.has(id)) {
      let room = {id: id, users: []};
      rooms.set(room, id);
      return room;
    }
  }
  throw new Error('cannot create new room (probably the name space is too small)');
}

async function onConnection(socket) {
  socket.on('createRoom', (data) => onCreateRoom(socket, data));
}

async function createRoomError(socket, type) {
  let category = 'createRoomError';
  let message = errorMessage(category, type);
  socket.emit(category, {message: message});
  console.log(`${category} ${message}`);
}

async function onCreateRoom(socket, data) {
  let userName = data['name'];
  if (!userName) {
    createRoomError(socket, 'userNameError');
  }
  else if (rooms.size >= maxRooms) {
    createRoomError(socket, 'maxRoomsError');
  }
  else {
    try {
      let room = await createNewRoom();
      console.log(`room ${room.id} created by "${userName}"`);
      room['users'].push(userName);
      socket.emit('roomCreated', room);
    }
    catch (error) {
      createRoomError(socket);
    }
  }
}

const maxRooms = 5;
var rooms = new Map();

const app = express();

const modulePath = url.fileURLToPath(import.meta.url);
const publicPath = path.join(path.dirname(modulePath), 'public');
app.use(express.static(publicPath));

const port = process.env.PORT || 3000;
const httpServer = http.createServer(app);
const socketIoServer = new socketIo.Server(httpServer);

socketIoServer.on('connection', onConnection);
httpServer.listen(port, () => console.log('emoti-match listens on port ' + port));
