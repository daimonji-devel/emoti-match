import { io } from './socket.io/socket.io.esm.min.js';


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
  input.setAttribute('minlength', 8);
  input.setAttribute('maxlength', 8);
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

async function renderCreatingRoom() {
  let paragraph = document.createElement('p');
  paragraph.innerText = 'creating a new room ...';
  return [ paragraph ];
}

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
  console.log(`${formData.get('roomId')}`);
  // await renderPage();
}

function onRoomInput() {
}

async function onRoomCreateSubmit(event) {
  event.preventDefault();
  let contentPromise = renderCreatingRoom();
  socket.emit('createRoom', data);
  renderContent(await contentPromise);
}

async function onRoomCreated(room) {
  console.log(`room ${room.id} created`);
}

async function onCreateRoomError(data) {
  console.log(`createRoomError ${data.message}`);
}

async function renderContent(content) {
  contentElement.replaceChildren(...content);
}

async function renderPage() {
  let content = await renderIndex();
  renderContent(content);
}


var socket = io();
socket.on('roomCreated', onRoomCreated);
socket.on('createRoomError', onCreateRoomError);

const contentElement = document.querySelector('div.content');
let data = {};
renderPage();
