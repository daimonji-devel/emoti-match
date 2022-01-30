import { EmotiMatchClient } from './EmotiMatchClient.js';
import { io } from './socket.io/socket.io.esm.min.js';

/* ****************************************************************************
 * rendering
 */

async function renderIndex() {
  let name = myData['name'];
  if (!name) {
    return renderUserInput();
  }
  if (myData['roomInfo']) {
    return [ await renderRoom() ];
  }
  let roomInputPromise = renderRoomInput();
  let roomCreatePromise = renderRoomCreate();
  let paragraph = document.createElement('p');
  paragraph.innerText = `Hello ${name} ✌️😂`;
  let [ roomInput, focusElement ] = await roomInputPromise;
  return [ [paragraph, ...roomInput, ...(await roomCreatePromise)], focusElement ];
}

async function renderUserInput() {
  let label = document.createElement('label');
  label.setAttribute('for', 'name');
  label.textContent = "your name or nickname";

  let input = document.createElement('input');
  input.setAttribute('name', 'name');
  input.setAttribute('required', null);
  input.setAttribute('minlength', 2);
  input.setAttribute('maxlength', 10);
  input.addEventListener('input', onUserInput);

  let button = document.createElement('button');
  button.setAttribute('type', 'submit');
  button.innerText = 'send';

  let form = document.createElement('form');
  form.addEventListener('submit', onUserInputSubmit);
  form.appendChild(label);
  form.appendChild(document.createElement('br'));
  form.appendChild(input);
  form.appendChild(button);
  return [ [ form ], input ];
}

async function renderRoomInput() {
  let text = document.createTextNode('Enter an existing game room');

  let label = document.createElement('label');
  label.setAttribute('for', 'roomId');
  label.textContent = "ID";

  let input = document.createElement('input');
  input.setAttribute('name', 'roomId');
  input.setAttribute('required', null);
  input.setAttribute('minlength', 6);
  input.setAttribute('maxlength', 10);
  input.addEventListener('input', onRoomInput);

  let button = document.createElement('button');
  button.setAttribute('type', 'submit');
  button.innerText = 'enter room';

  let form = document.createElement('form');
  form.addEventListener('submit', onRoomInputSubmit);
  form.appendChild(label);
  form.appendChild(input);
  form.appendChild(button);

  let paragraph = document.createElement('p');
  paragraph.appendChild(text);
  paragraph.appendChild(document.createElement('br'));
  paragraph.appendChild(form);
  return [ [ paragraph ], input ];
}

async function renderRoomCreate() {
  let text = document.createTextNode('Create a new game room');

  let button = document.createElement('button');
  button.setAttribute('type', 'submit');
  button.innerText = 'create new room';

  let form = document.createElement('form');
  form.addEventListener('submit', onRoomCreateSubmit);
  form.appendChild(button);

  let paragraph = document.createElement('p');
  paragraph.appendChild(text);
  paragraph.appendChild(document.createElement('br'));
  paragraph.appendChild(form);
  return [ paragraph ];
}

async function renderRoomLeave() {
  let verb, action;
  if (myData['amCreator']) {
    verb = 'Destruct';
    action = onRoomDestructSubmit;
  }
  else {
    verb = 'Leave';
    action = onRoomLeaveSubmit;
  }

  let text = document.createTextNode(`${verb} game room`);
  let button = document.createElement('button');
  button.setAttribute('type', 'submit');
  button.innerText = verb;
  let form = document.createElement('form');
  form.addEventListener('submit', action);
  form.appendChild(button);

  let paragraph = document.createElement('p');
  paragraph.appendChild(text);
  paragraph.appendChild(document.createElement('br'));
  paragraph.appendChild(form);
  return [ paragraph ];
}

async function renderGameStart() {
  let text = document.createTextNode('Everyone joined? Ready to start the game?');

  let button = document.createElement('button');
  button.setAttribute('type', 'submit');
  button.innerText = 'Start game';

  let form = document.createElement('form');
  form.addEventListener('submit', onGameStartSubmit);
  form.appendChild(button);

  let paragraph = document.createElement('p');
  paragraph.appendChild(text);
  paragraph.appendChild(document.createElement('br'));
  paragraph.appendChild(form);
  return [ paragraph ];
}

async function renderRoomForms() {
  let roomLeave = renderRoomLeave();
  let gameStart = myData['amCreator'] ? renderGameStart() : [];
  let roomForms = [...(await roomLeave), ...(await gameStart)];

  let div = document.createElement('div');
  div.setAttribute('class', 'roomForms');
  for (let element of roomForms) {
    div.appendChild(element);
  }
  return [ div ]
}

async function renderRoom() {
  let paragraph = document.createElement('p');
  paragraph.setAttribute('class', 'room');
  await updateRoom(paragraph);
  let roomForms = await renderRoomForms();
  return [ paragraph, ...roomForms ];
}

async function updateRoom(paragraph) {
  if (!paragraph) {
    paragraph = contentElement.querySelector('p.room');
  }
  if (paragraph) {
    let roomInfo = myData['roomInfo'];
    let names = roomInfo['players'].map((player) => player.name).join(', ');
    paragraph.innerText = `room ${roomInfo['id']} with players ${names}`;
  }
}

async function renderEnteringRoom(roomId) {
  let paragraph = document.createElement('p');
  paragraph.innerText = `entering room ${roomId}...`;
  return [ paragraph ];
}

async function renderCreatingRoom() {
  let paragraph = document.createElement('p');
  paragraph.innerText = 'creating a new room ...';
  return [ paragraph ];
}

async function deleteMessage(id) {
  if (id == messageId && messageElement) {
    messageElement.innerText = '';
  }
}

async function renderMessage(message) {
  if (messageElement) {
    let id = Date.now();
    messageId = id;
    messageElement.innerText = message;
    window.setTimeout(() => deleteMessage(id), messageDeleteTime);
  }
}

async function renderContent(content) {
  contentElement.replaceChildren(...content);
}

async function renderPage() {
  let [ content, focusElement ] = await renderIndex();
  await renderContent(content);
  if (focusElement) {
    focusElement.focus()
  }
}

/* ****************************************************************************
 * user events
 */

async function onUserInputSubmit(event) {
  event.preventDefault();
  let formData = new FormData(event.target);
  myData['name'] = formData.get('name');
  await renderPage();
}

function onUserInput() {
}

async function onRoomInputSubmit(event) {
  event.preventDefault();
  let formData = new FormData(event.target);
  let roomId = formData.get('roomId');
  let contentPromise = renderEnteringRoom(roomId);
  socket.emit('enterRoom', {name: myData['name'], roomId: roomId});
  renderContent(await contentPromise);
}

function onRoomInput() {
}

async function onRoomCreateSubmit(event) {
  event.preventDefault();
  let contentPromise = renderCreatingRoom();
  socket.emit('createRoom', {name: myData['name']});
  renderContent(await contentPromise);
}

async function onRoomDestructSubmit(event) {
  event.preventDefault();
  socket.emit('destructRoom', {roomId: myData['roomInfo']['id']});
}

async function onRoomLeaveSubmit(event) {
  event.preventDefault();
  socket.emit('leaveRoom', {roomId: myData['roomInfo']['id']});
}

async function onGameStartSubmit(event) {
  event.preventDefault();
  socket.emit('startGame', {roomId: myData['roomInfo']['id']});
}

/* ****************************************************************************
 * events from server
 */

async function onRoomCreated(data) {
  console.log(`room ${data['id']} created`);
  myData['amCreator'] = true;
  myData['roomInfo'] = data;
  await renderContent(await renderRoom());
  renderMessage('You have created a new room');
}

async function onCreateRoomError(data) {
  await renderPage();
  onUnspecificError(data);
}

async function onRoomEntered(data) {
  console.log(`entered room ${data['id']}`);
  myData['roomInfo'] = data;
  await renderContent(await renderRoom());
  renderMessage('You have entered the room');
}

async function onEnterRoomError(data) {
  await renderPage();
  onUnspecificError(data);
}

async function onNewPlayer(data) {
  myData['roomInfo'] = data;
  updateRoom();
  renderMessage(`new player "${data['newPlayer']['name']}" has entered the room`);
}

async function onRoomDestructed(data) {
  console.log(`destructed room ${data['id']}`);
  myData['amCreator'] = false;
  delete myData['roomInfo'];
  await renderPage();
  renderMessage(`your room has finished`);
}

async function onDestructRoomError(data) {
  onUnspecificError(data);
}

async function onLeftRoom(data) {
  console.log(`left room ${data['id']}`);
  myData['amCreator'] = false;
  delete myData['roomInfo'];
  await renderPage();
  renderMessage(`you have left the room`);
}

async function onPlayerLeft(data) {
  myData['roomInfo'] = data;
  updateRoom();
  renderMessage(`player "${data['formerPlayer']['name']}" has left the room`);
}

async function onLeaveRoomError(data) {
  onUnspecificError(data);
}

async function onUnspecificError(data) {
  console.log(`${data.type} ${data.message}`);
}

async function sendSolution(solution) {
  socket.emit('checkSolution', {roomId: myData['roomInfo']['id'], solution: solution});
}

async function onGameStarted(roomInfo, gameInfo) {
  gameClient = new EmotiMatchClient(contentElement, renderMessage, sendSolution, onGameFinished);
  gameClient.onGameStarted(roomInfo, gameInfo);
}

async function onStartGameError(data) {
  onUnspecificError(data);
}

/**
 * this function will be called from the game client when the game is finished for the client.
 */
async function onGameFinished() {
  console.log('game finished');
  renderPage();
}

function splitPath() {
  let path = document.location.pathname;
  let splitIndex = path.lastIndexOf('/') + 1;
  return [ path.slice(0, splitIndex), path.slice(splitIndex) ];
}

const pathPrefix = splitPath()[0];
console.log(pathPrefix);

var socket = io({path: pathPrefix + 'socket.io'});
socket.on('roomCreated', onRoomCreated);
socket.on('createRoomError', onCreateRoomError);
socket.on('roomEntered', onRoomEntered);
socket.on('enterRoomError', onEnterRoomError);
socket.on('newPlayer', onNewPlayer);
socket.on('roomDestructed', onRoomDestructed);
socket.on('destructRoomError', onDestructRoomError);
socket.on('leftRoom', onLeftRoom);
socket.on('playerLeft', onPlayerLeft);
socket.on('leaveRoomError', onLeaveRoomError);
socket.on('gameStarted', onGameStarted);
socket.on('startGameError', onStartGameError);
socket.on('unspecificError', onUnspecificError);

socket.on('roundPrepared', (...args) => {
  if (gameClient) gameClient.onRoundPrepared(...args);
});
socket.on('roundStarted', (...args) => {
  if (gameClient) gameClient.onRoundStarted(...args);
});
socket.on('solutionChecked', (...args) => {
  if (gameClient) gameClient.onSolutionChecked(...args);
});
socket.on('checkSolutionError', (...args) => {
  if (gameClient) gameClient.onCheckSolutionError(...args);
});
socket.on('roundFinished', (...args) => {
  if (gameClient) gameClient.onRoundFinished(...args);
});
socket.on('gameFinished', (...args) => {
  if (gameClient) gameClient.onGameFinished(...args);
});

/* ****************************************************************************
 * initialization
 */

const contentElement = document.querySelector('div.content');
const messageElement = document.querySelector('div.message');

var myData = {};
var messageId = null;
var messageDeleteTime = 5000;
var gameClient;
renderPage();
