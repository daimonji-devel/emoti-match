import express from 'express';
import * as socketIo from 'socket.io';
import http from 'http';
import path from 'path';
import url from 'url';
import { EmotiMatchServer } from './model/EmotiMatchServer.js';
import { RoomHandler } from './model/RoomHandler.js';
import { Player } from './model/Player.js';


const errorCategories = {
  'createRoomError': 'Cannot create room',
  'enterRoomError': 'Cannot enter room',
  'destructRoomError': 'Cannot destruct room',
  'leaveRoomError': 'Cannot leave room',
  'startGameError': 'Cannot start game',
  'checkSolutionError': 'Cannot check solution',
  'unspecificError': 'Cannot proceed'
}

const errorTypes = {
  'playerNameError': 'Player name is not accepted',
  'maxRoomsError': 'Maximum number of rooms reached. Please try again later',
  'roomIdError': 'Incorrect room ID. Please try with a correct one',
  'maxPlayersError': 'Maximum number of players reached. Please try in a different room',
  'permissionError': 'Player does not have permission for this operation',
  'playerNotFoundError': 'Cannot find player in room',
  'gameOngoingError': 'Cannot interrupt ongoing game',
  'gameFinishedError': 'Game has already finished',
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

async function onCreateRoom(socket, data) {
  let userName = data['name'];
  if (!userName) {
    processError(socket, 'createRoomError', 'playerNameError');
  }
  else if (rooms.isFull()) {
    processError(socket, 'createRoomError', 'maxRoomsError');
  }
  else {
    try {
      let room = await rooms.createNewRoom();
      let player = new Player(socket, userName);
      room.addPlayer(player);
      console.log(`${player} created room ${room.id()}`);
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
    processError(socket, 'enterRoomError', 'playerNameError');
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
    console.log(`${newPlayer} entered room ${room.id()}`);
  }
}

async function destructRoom(room) {
  rooms.removeRoom(room.id());
  let roomInfo = room.publicInfo();
  for (let player of room.playerIterator()) {
    player.socket().emit('roomDestructed', roomInfo);
  }
}

async function onDestructRoom(socket, data) {
  let roomId = data['roomId'];
  let room = await rooms.getRoom(roomId);
  if (!room) {
    // send a positive confirmation if room does not exist (e.g. server has restarted)
    socket.emit('roomDestructed', {id: roomId});
    return;
  }
  let [ playerId, player ] = room.findSocketPlayer(socket);
  if (playerId != 0) {
    processError(socket, 'destructRoomError', 'permissionError');
  }
  else {
    destructRoom(room);
    console.log(`${player} destructed room ${room.id()}`);
  }
}

async function onLeaveRoom(socket, data) {
  let roomId = data['roomId'];
  let room = await rooms.getRoom(roomId);
  if (!room) {
    // send a positive confirmation if room does not exist (e.g. server has restarted)
    socket.emit('leftRoom', {id: roomId});
    return;
  }
  let [ formerPlayerId, formerPlayer ] = room.findSocketPlayer(socket);
  if (formerPlayerId < 0) {
    // send a positive confirmation if player was not in the room (e.g. a former leave failed)
    socket.emit('leftRoom', {id: roomId});
  }
  else if (formerPlayerId == 0) {
    // if the owner leaves, room needs to be destructed.
    destructRoom(room);
    console.log(`${formerPlayer} destructed room ${room.id()}`);
  }
  else {
    room.removePlayer(formerPlayer);
    let roomInfo = room.publicInfo();
    roomInfo['formerPlayer'] = formerPlayer.publicInfo();
    socket.emit('leftRoom', roomInfo);
    for (let player of room.playerIterator()) {
      player.socket().emit('playerLeft', roomInfo);
    }
    console.log(`${formerPlayer} left room ${room.id()}`);
  }
}

async function onStartGame(socket, data) {
  let roomId = data['roomId'];
  let room = await rooms.getRoom(roomId);
  if (!room) {
    processError(socket, 'startGameError', 'roomIdError');
    return;
  }
  else if (!room.isGameFinished()) {
    processError(socket, 'startGameError', 'gameOngoingError');
    return;
  }
  let playerId = room.findSocketPlayer(socket)[0];
  if (playerId != 0) {
    processError(socket, 'startGameError', 'permissionError');
  }
  else {
    let game = new EmotiMatchServer(room.size());
    room.setGame(game);
    game.start(
      (gameInfos) => sendGameStatus(room, 'gameStarted', gameInfos),
      (gameInfos) => sendGameStatus(room, 'roundPrepared', gameInfos),
      (gameInfos) => sendGameStatus(room, 'roundStarted', gameInfos),
      (gameInfos) => sendGameStatus(room, 'roundFinished', gameInfos),
      (gameInfos) => sendGameStatus(room, 'gameFinished', gameInfos)
    );
  }
}

async function sendGameStatus(room, status, gameInfos) {
  let roomInfo = room.publicInfo();
  let pid = 0;
  for (let player of room.playerIterator()) {
    if (gameInfos) {
      let gameInfo = gameInfos[pid];
      player.socket().emit(status, roomInfo, gameInfo);
    }
    else {
      player.socket().emit(status, roomInfo);
    }
    pid++;
  }
}

async function onCheckSolution(socket, data) {
  let roomId = data['roomId'];
  let room = await rooms.getRoom(roomId);
  if (!room) {
    processError(socket, 'checkSolutionError', 'roomIdError');
    return;
  }
  else if (room.isGameFinished()) {
    processError(socket, 'checkSolutionError', 'gameFinishedError');
    return;
  }
  let [ playerId, player ] = room.findSocketPlayer(socket);
  if (playerId < 0) {
    processError(socket, 'checkSolutionError', 'playerNotFoundError');
  }
  else {
    let game = room.game();
    game.messageFromPlayer(playerId, data, (answer) => {
      socket.emit('solutionChecked', answer);
    });
  }
}

async function onConnection(socket) {
  socket.on('createRoom', (data) => onCreateRoom(socket, data));
  socket.on('enterRoom', (data) => onEnterRoom(socket, data));
  socket.on('destructRoom', (data) => onDestructRoom(socket, data));
  socket.on('leaveRoom', (data) => onLeaveRoom(socket, data));
  socket.on('startGame', (data) => onStartGame(socket, data));
  socket.on('checkSolution', (data) => onCheckSolution(socket, data));
}

const maxRooms = 9;
const maxPlayers = 9;
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
