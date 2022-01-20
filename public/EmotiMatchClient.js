const sqrt3 = Math.sqrt(3);
const heightWidthRatio = 2 / (sqrt3 + 1);
const heightWidthLogFactor = Math.PI / 12 / Math.log(heightWidthRatio);


class EmotiMatchClient {
  #parentElement;
  #contentWidth;
  #contentHeight;
  #renderMessage;
  #sendSolution;
  #gameFinished;
  #resizeObserver;
  #cardInfos;
  #egoPid;
  #notMineSize = 0.9; // ratio of ego player card to other player's cards
  #symbolSize = 0.8;  // size of symbols where 1 is the maximum without overlaps

  constructor(parentElement, renderMessage, sendSolution, gameFinished) {
    this.#parentElement = parentElement;
    this.#renderMessage = renderMessage;
    this.#sendSolution = sendSolution;
    this.#gameFinished = gameFinished;

    this.#resizeObserver = new ResizeObserver(this.onResize.bind(this));
    this.#resizeObserver.observe(this.#parentElement);

    this.#cardInfos = null;
    this.#egoPid = null;
  }

  #renderContent(content) {
    this.#parentElement.replaceChildren(...content);
  }

  #cssStyle(x, y, r) {
    return `left: ${x-r}px; top: ${y-r}px; width: ${r*2}px; height: ${r*2}px`;
  }

  /**
   * arranges the symbols of a card.
   * @param {Array<HTMLElement>} symbolElements array of symbol elements belonging to one card.
   * @param {Number} r radius of card.
   */
  async #arrangeSymbols(symbolElements, r) {
    let sin = Math.sin(Math.PI / Math.max(6, symbolElements.length));
    let rm = r / (1 + sin);
    let r2 = (r - rm) * this.#symbolSize;
    let a = Math.PI * 0.5;
    let ad = 2 * Math.PI / symbolElements.length;
    for (let symbolElement of symbolElements) {
      let x2 = r + Math.cos(a) * rm;
      let y2 = r + Math.sin(a) * rm;
      let symbolStyle = this.#cssStyle(x2, y2, r2);
      symbolElement.setAttribute('style', symbolStyle);
      a += ad;
    }
  }

  /**
   * arranges a card and its contents.
   * @param {Object} cardInfo info object of the card to arrange.
   * @param {Number} x x-coordinate of card center.
   * @param {Number} y y-coordinate of card center. 
   * @param {Number} r radius of card.
   */
  async #arrangeCard(cardInfo, x, y, r) {
    let cardStyle = this.#cssStyle(x, y, r);
    let cardElement = cardInfo['cardElement'];
    cardElement.setAttribute('style', cardStyle);
    if (cardInfo['r'] == r) {
      // do not re-arrange symbols if radius has not changed
      return;
    }
    cardInfo['r'] = r;
    await this.#arrangeSymbols(cardInfo['symbolElements'], r);
  }

  /**
   * arranges the card deck along the corners of the bounding box. This is only possible for a
   * maximum of 5 cards, the ego player's card in the middle and the others in the corners.
   * @param {Number} width width of bounding box.
   * @param {Number} height height of bounding box. 
   */
  async #arrangeCornerDeck(width, height) {
    let r1, xd, yd;
    if ((width * heightWidthRatio) >= height) {
      // width is so large that height determines radius (angle is 30 degs).
      r1 = height * 0.25;
      xd = r1 * sqrt3;
      yd = r1;
    }
    else if (width <= (height * heightWidthRatio)) {
      // height is so large that width determines radius (angle is 60 degs).
      r1 = width * 0.25;
      xd = r1;
      yd = r1 * sqrt3;
    }
    else {
      // width and height are similar. there is an space-optimum angle between 30 and 60 degs.
      // due to that the math is a bit complex, we approximates the reverse-function of
      // width/height = (2 * Math.cos(a) + 1) / (2 * Math.sin(a) + 1) with a log function.
      // deviation is less than 0.2%.
      let a = Math.log(width / height) * heightWidthLogFactor + Math.PI * 0.25;
      xd = width / (2 + 1 / Math.cos(a));
      yd = height / (2 + 1 / Math.sin(a));
      r1 = Math.sqrt(xd * xd + yd * yd) * 0.5;
    }
    let r2 = r1 * this.#notMineSize;
    let xOffset = width / 2;
    let yOffset = height / 2;
    let cornerFactors = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
    let cornerId = 0;
    for (let cardInfo of this.#cardInfos) {
      if (cardInfo['isEgo']) {
        await this.#arrangeCard(cardInfo, xOffset, yOffset, r1);
      }
      else {
        let [ xf, yf ] = cornerFactors[cornerId++];
        let x = xOffset + xd * xf;
        let y = yOffset + yd * yf;
        await this.#arrangeCard(cardInfo, x, y, r2);
      }
    }
  }

  /**
   * arranges the card deck in a circle, the ego player's card in the middle and the other cards
   * around it.
   * @param {Number} width width of bounding box.
   * @param {Number} height height of bounding box. 
   */
   async #arrangeCircleDeck(width, height) {
    let sin = Math.sin(Math.PI / Math.max(6, this.#cardInfos.length - 1));
    let r0 = Math.min(width, height) * 0.5;
    let r1 = r0 / 3;
    let rm = r0 / (1 + sin);
    let r2 = (r0 - rm) * this.#notMineSize;
    let xOffset = width / 2;
    let yOffset = height / 2;
    let a = Math.PI * 0.5;
    let ad = 2 * Math.PI / (this.#cardInfos.length - 1);
    for (let cardInfo of this.#cardInfos) {
      if (cardInfo['isEgo']) {
        await this.#arrangeCard(cardInfo, xOffset, yOffset, r1);
      }
      else {
        let x = xOffset + Math.cos(a) * rm;
        let y = yOffset + Math.sin(a) * rm;
        await this.#arrangeCard(cardInfo, x, y, r2);
        a += ad;
      }
    }
  }

  /**
   * arranges a card deck by setting size and position of the cards and their contents.
   * @param {Number} width width of bounding box.
   * @param {Number} height height of bounding box.
   */
  async #arrangeDeck(width, height) {
    if (this.#cardInfos.length <= 5) {
      await this.#arrangeCornerDeck(width, height);
    }
    else {
      await this.#arrangeCircleDeck(width, height);
    }
  }

  /**
   * resizes the card deck adapting to a changed size of the parent element.
   * @param {Boolean} enforce whether to enforce resizing, even if the dimension have not changed.
   */
  async #resizeDeck(enforce=false) {
    let parent = this.#parentElement;
    let style = getComputedStyle(parent);
    let paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    let paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    let width = parent.clientWidth - paddingX;
    let height = parent.clientHeight - paddingY;
    if (enforce || (width != this.#contentWidth) || (height != this.#contentHeight)) {
      this.#contentWidth = width;
      this.#contentHeight = height;
      this.#arrangeDeck(width, height);
    }
  }

  /**
   * deletes the symbols from a cardInfo object. The symbol elements still exist but the symbol is deleted.
   * @param {Object} cardInfo card info object to delete symbols from.
   */
  async #deleteCardSymbols(cardInfo) {
    let symbolElements = cardInfo['symbolElements'];
    for (let symbolElement of symbolElements) {
      symbolElement.innerText = '';
    }
  }

  /**
   * creates a new HTML element representing a symbol.
   * @param {String} symbol symbol string. 
   * @returns {HTMLElement} symbol element created.
   */
  #createSymbolElement(symbol) {
    let symbolElement = document.createElement('div');
    symbolElement.setAttribute('class', 'symbol');
    symbolElement.innerText = symbol;
    symbolElement.addEventListener('click', event => {
      this.#sendSolution(symbolElement.innerText);
      console.log('check solution ' + symbolElement.innerText);
    });
    return symbolElement;
  }

  /**
   * renews a card info object with new symbols.
   * @param {Object} cardInfo card info object to renew.
   * @param {Array<String>} symbols array of symbols belonging to the card.
   */
  async #renewCardSymbols(cardInfo, symbols) {
    let symbolElements = cardInfo['symbolElements'];
    let minLength = Math.min(symbolElements.length, symbols.length);
    let sid = 0;
    while (sid < minLength) {
      symbolElements[sid].innerText = symbols[sid];
      sid++;
    }
    if (symbolElements.length == symbols.length) {
      return;
    }

    let cardElement = cardInfo['cardElement'];
    if (symbolElements.length < symbols.length) {
      while (sid < symbols.length) {
        let symbolElement = this.#createSymbolElement(symbols[sid]);
        symbolElements.push(symbolElement);
        cardElement.appendChild(symbolElement);
        sid++
      }        
    }
    else {
      while (symbolElements.length > symbols.length) {
        let symbolElement = symbolElements.pop();
        cardElement.removeChild(symbolElement);
      }
    }

    let r = cardInfo['r'];
    await this.#arrangeSymbols(symbolElements, r);
  }

  /**
   * prepares HTML elements for representing a card and puts them in a card info object.
   * @param {Number} pid player id of card. 
   * @param {String} name name of player. 
   * @param {Number} score initial score of player.
   * @returns {Object} card info object prepared.
   */
  async #prepareCardInfo(pid, name, score=0) {
    let isEgo = pid == this.#egoPid;
    let nameElement = document.createTextNode(name + (isEgo ? ' (you)' : ''));
    let scoreElement = document.createTextNode(score);
    let symbolElements = [];

    let cardElement = document.createElement('div');
    cardElement.setAttribute('class', 'card');
    cardElement.appendChild(nameElement);
    cardElement.appendChild(document.createTextNode(' '));
    cardElement.appendChild(scoreElement);

    return {
      isEgo: isEgo,
      cardElement: cardElement,
      nameElement: nameElement,
      scoreElement: scoreElement,
      symbolElements: symbolElements,
    }
  }

  /**
   * prepares HTML elements representing a card deck and puts them in an array of card info objects.
   * @param {Object} roomInfo: room information from server.
   * @param {Object} gameInfo: game information from server.
   * @returns {Promise<Array<Object>>} card info objects prepared.
   */
  async #prepareDeckInfo(roomInfo, gameInfo) {
    let players = roomInfo['players'];
    let cardInfos = [];
    for (let pid = 0; pid < players.length; pid++) {
      let name = players[pid]['name'];
      let score = gameInfo['scores'][pid];
      let cardInfo = await this.#prepareCardInfo(pid, name, score);
      cardInfos.push(cardInfo);
    }
    return cardInfos;
  }

  async onResize(entries) {
    this.#resizeDeck();
  }

  async onGameStarted(roomInfo, gameInfo) {
    this.#egoPid = gameInfo['playerId'];
    this.#cardInfos = await this.#prepareDeckInfo(roomInfo, gameInfo);
    this.#resizeDeck(true);
    let content = this.#cardInfos.map(cardInfo => cardInfo['cardElement']);
    this.#renderContent(content);
  }

  async onRoundPrepared(roomInfo, gameInfo) {
    let cardInfo = this.#cardInfos[this.#egoPid];
    let symbols = gameInfo['card'];
    this.#renewCardSymbols(cardInfo, symbols);
  }

  async onRoundStarted(roomInfo, gameInfo) {
    let cards = gameInfo['roundInfo']['cards'];
    for (let [ pid, symbols ] of cards.entries()) {
      let cardInfo = this.#cardInfos[pid];
      this.#renewCardSymbols(cardInfo, symbols);
    }
  }

  async onSolutionChecked(result) {
    console.log('solution checked ' + JSON.stringify(result));
  }

  async onCheckSolutionError(result) {
    console.log('check solution error ' + JSON.stringify(result));
  }

  async onRoundFinished(roomInfo, gameInfo) {
    let players = roomInfo['players'];
    let scores = gameInfo['scores'];
    for (let pid = 0; pid < players.length; pid++) {
      let cardInfo = this.#cardInfos[pid];
      this.#deleteCardSymbols(cardInfo);
      cardInfo.scoreElement.nodeValue = scores[pid];
    }
    this.#renderMessage(`round finished`);
  }

  async onGameFinished(roomInfo, gameInfo) {
    this.#resizeObserver.unobserve(this.#parentElement);
    this.#contentWidth = null;
    this.#contentHeight = null;
    this.#cardInfos = null;
    this.#egoPid = null;
    this.#gameFinished();
  }

}


export { EmotiMatchClient };