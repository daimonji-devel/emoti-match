import { io } from './socket.io/socket.io.esm.min.js';

/* ****************************************************************************
 * rendering
 */

async function renderIndex() {
  let name = myData['name'];
  if (!name) {
    return renderUserInput();
  }
  let roomInputPromise = renderRoomInput();
  let roomCreatePromise = renderRoomCreate();
  let paragraph = document.createElement('p');
  paragraph.innerText = `Hello ${name} ✌️😂`;
  return [paragraph, ...(await roomInputPromise), ...(await roomCreatePromise)];
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
  return [ form ];
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
  return [ paragraph ];
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

async function renderRoom(data) {
  let paragraph = document.createElement('p');
  paragraph.setAttribute('class', 'room');
  let names = data['players'].map((player) => player.name).join(', ');
  paragraph.innerText = `room ${data['id']} with players ${names}`;

  let roomLeave = renderRoomLeave();

  let div = document.createElement('div');
  div.appendChild(paragraph);
  for (let element of await roomLeave) {
    div.appendChild(element);
  }
  return [ div ];
}

async function updateRoom(data) {
  let paragraph = contentElement.querySelector('p.room');
  if (paragraph) {
    let names = data['players'].map((player) => player.name).join(', ');
    paragraph.innerText = `room ${data['id']} with players ${names}`;
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
  let content = await renderIndex();
  renderContent(content);
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
  socket.emit('destructRoom', {name: myData['name'], roomId: myData['roomId']});
}

async function onRoomLeaveSubmit(event) {
  event.preventDefault();
  socket.emit('leaveRoom', {name: myData['name'], roomId: myData['roomId']});
}

/* ****************************************************************************
 * events from server
 */

async function onRoomCreated(data) {
  console.log(`room ${data['id']} created`);
  myData['amCreator'] = true;
  myData['roomId'] = data['id'];
  await renderContent(await renderRoom(data));
  renderMessage('You have created a new room');
}

async function onCreateRoomError(data) {
  await renderPage();
  onUnspecificError(data);
}

async function onRoomEntered(data) {
  console.log(`entered room ${data['id']}`);
  myData['roomId'] = data['id'];
  await renderContent(await renderRoom(data));
  renderMessage('You have entered the room');
}

async function onEnterRoomError(data) {
  await renderPage();
  onUnspecificError(data);
}

async function onNewPlayer(data) {
  updateRoom(data);
  renderMessage(`new player "${data['newPlayer']['name']}" has entered the room`);
}

async function onRoomDestructed(data) {
  myData['amCreator'] = false;
  delete myData['roomId'];
  await renderPage();
  renderMessage(`your room has finished`);
}

async function onDestructRoomError(data) {
  onUnspecificError(data);
}

async function onLeftRoom(data) {
  myData['amCreator'] = false;
  await renderPage();
  renderMessage(`you have left the room`);
}

async function onPlayerLeft(data) {
  updateRoom(data);
  renderMessage(`player "${data['formerPlayer']['name']}" has left the room`);
}

async function onLeaveRoomError(data) {
  onUnspecificError(data);
}

async function onUnspecificError(data) {
  console.log(`${data.type} ${data.message}`);
}

var socket = io();
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
socket.on('unspecificError', onUnspecificError);

/* ****************************************************************************
 * initialization
 */

const contentElement = document.querySelector('div.content');
const messageElement = document.querySelector('div.message');

let myData = {};
let messageId = null;
let messageDeleteTime = 5000;
renderPage();
