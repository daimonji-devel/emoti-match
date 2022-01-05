import { io } from './socket.io/socket.io.esm.min.js';

/* ****************************************************************************
 * rendering
 */

async function renderIndex() {
  let name = data['name'];
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

async function renderRoom(data) {
  let message = document.createElement('p');
  message.setAttribute('class', 'message');

  let paragraph = document.createElement('p');
  paragraph.setAttribute('class', 'room');
  let names = data['players'].map((player) => player.name).join(', ');
  paragraph.innerText = `room ${data['id']} with players ${names}`;

  let div = document.createElement('div');
  div.appendChild(message);
  div.appendChild(paragraph);
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
  if (id == messageId) {
    let messageElement = contentElement.querySelector('.message');
    if (messageElement) {
      messageElement.innerText = '';
    }
  }
}

async function renderMessage(message) {
  let messageElement = contentElement.querySelector('.message');
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
  data['name'] = formData.get('name');
  await renderPage();
}

function onUserInput() {
}

async function onRoomInputSubmit(event) {
  event.preventDefault();
  let formData = new FormData(event.target);
  let roomId = formData.get('roomId');
  let contentPromise = renderEnteringRoom(roomId);
  socket.emit('enterRoom', {name: data['name'], roomId: roomId});
  renderContent(await contentPromise);
}

function onRoomInput() {
}

async function onRoomCreateSubmit(event) {
  event.preventDefault();
  let contentPromise = renderCreatingRoom();
  socket.emit('createRoom', {name: data['name']});
  renderContent(await contentPromise);
}

/* ****************************************************************************
 * events from server
 */

async function onRoomCreated(data) {
  console.log(`room ${data.id} created`);
  await renderContent(await renderRoom(data));
  renderMessage('You have created a new room');
}

async function onCreateRoomError(data) {
  console.log(`createRoomError ${data.message}`);
}

async function onRoomEntered(data) {
  console.log(`entered room ${data.id}`);
  await renderContent(await renderRoom(data));
  renderMessage('You have entered the room');
}

async function onEnterRoomError(data) {
  console.log(`enterRoomError ${data.message}`);
}

async function onNewPlayer(data) {
  updateRoom(data);
  renderMessage(`new player "${data['newPlayer']['name']}" has entered the room`);
}

var socket = io();
socket.on('roomCreated', onRoomCreated);
socket.on('createRoomError', onCreateRoomError);
socket.on('roomEntered', onRoomEntered);
socket.on('enterRoomError', onEnterRoomError);
socket.on('newPlayer', onNewPlayer);

/* ****************************************************************************
 * initialization
 */

const contentElement = document.querySelector('div.content');
let data = {};
let messageId = null;
let messageDeleteTime = 5000;
renderPage();
