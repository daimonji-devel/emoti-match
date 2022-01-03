async function renderIndex() {
  let name = data['name'];
  if (!name) {
    return renderUserInput();
  }
  let paragraph = document.createElement('p');
  paragraph.innerText = `Hello ${name} ✌️😂`;
  return [ paragraph ];
}

async function renderUserInput() {
  let label = document.createElement('label');
  label.setAttribute('for', 'name');
  label.textContent = "your name or nickname";

  let input = document.createElement('input');
  input.setAttribute('name', 'name');
  input.setAttribute('minlength', 2);
  input.setAttribute('maxlength', 10);
  input.addEventListener('input', onUserInput);

  let button = document.createElement('button');
  button.setAttribute('type', 'submit');
  button.innerText = 'send'

  let form = document.createElement('form');
  form.addEventListener('submit', onUserInputSubmit);
  form.appendChild(label);
  form.appendChild(document.createElement('br'));
  form.appendChild(input);
  form.appendChild(button);
  return [ form ];
}

async function onUserInputSubmit(event) {
  event.preventDefault();
  let formData = new FormData(event.target);
  data['name'] = formData.get('name');
  await renderPage();
}

function onUserInput() {
}

async function renderPage() {
  let content = await renderIndex();
  contentElement.replaceChildren(...content);
}


const contentElement = document.querySelector('div.content');
let data = {};
renderPage();
