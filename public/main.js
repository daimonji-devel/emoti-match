async function renderIndex() {
  let paragraph = document.createElement('p');
  paragraph.innerText = 'Hello Emoti ✌️😂';
  return [ paragraph ];
}


const contentElement = document.querySelector('div.content');
renderIndex()
  .then((content) => contentElement.replaceChildren(...content));
