/**
 * Representation of a game room. A room has an id and a number of players.
 */
class Room {
  #id;
  #maxSize;
  #players;
  #scores;
  #game;
  #gameCount;

  /**
   * constructor.
   * @param {String} id: unique ID of the game room. 
   * @param {Number} maxSize: maximum size of room (number of players allowed).
   */
  constructor(id, maxSize) {
    this.#id = id;
    this.#maxSize = maxSize;
    this.#players = [];
    this.#scores = [];
    this.#game = null;
    this.#gameCount = 0;
  }

  /**
   * finds a player with a socket in a room.
   * @param {'Socket'} socket player socket to look for.
   * @returns Array<Number|Player> [player id, player] id is -1 if player was not found.
   */
  findSocketPlayer(socket) {
    let playerId = 0;
    for (let player of this.playerIterator()) {
      if (player.socket() == socket) {
        return [ playerId, player ];
      }
      playerId++;
    }
    return [ -1, null ];
  }

  /**
   * add a player to the room. players with the same socket already in the room will be replaced.
   * @param {Player} player player to be added.
   * @returns whether player was added (or the room was full already).
   */
  addPlayer(player) {
    if (this.size() >= this.#maxSize) {
      return false;
    }
    let playerId = this.findSocketPlayer(player.socket())[0];
    if (playerId < 0) {
      // new player is added at end
      this.#players.push(player);
      this.#scores.push(0);
    }
    else {
      // existing player is replaced - score is kept
      this.#players.splice(playerId, 1, player);
    }
    return true;
  }

  /**
   * remove a player from the room.
   * @param {Player} player player to be removed. 
   * @returns whether player was removed (or has not been in the room in the first place).
   */
  removePlayer(player) {
    let i = this.#players.indexOf(player);
    if (i < 0) {
      return false;
    }
    this.#players.splice(i, 1);
    this.#scores.splice(i, 1);
    return true;
  }

  /**
   * @returns iterator through all players.
   */
  playerIterator() {
    return this.#players.values();
  }

  /**
   * @returns {Array<Number>} the array of player scores. this is not a copy. all changes done to
   * this array will be reflected.
   */
  scores() {
    return this.#scores;
  }

  /**
   * @returns {Number} current size of room (number of players).
   */
  size() {
    return this.#players.length;
  }

  /**
   * @returns {Boolean} whether room is full (i.e. maximum number of players is reached).
   */
  isFull() {
    return this.size() >= this.#maxSize;
  }

  /**
   * @returns {String} the room id assigned during creation of this room.
   */
  id() {
    return this.#id;
  }

  /**
   * @returns {Object} an object with the public information of the room and its players.
   */
  publicInfo() {
    let players = this.#players.map(player => player.publicInfo());
    return {id: this.#id, players: players, scores: this.#scores, gameCount: this.#gameCount};
  }

  /**
   * sets a new game to the room. this is only possible if the previous game has finished.
   * @param {Game} game game to set.
   * @returns {Boolean} whether game is set (or the previous game is still ongoing).
   */
  setGame(game) {
    if (this.isGameFinished()) {
      this.#game = game;
      if (game) {
        this.#gameCount++;
      }
      return true;
    }
    return false;
  }

  /**
   * unsets the game. this is only possible if the game has finished already.
   * this function is only for saving space as a finished game is treated the same as no game.
   * @returns {Boolean} whether the game is unset.
   */
  unsetGame() {
    return this.setGame(null);
  }

  /**
   * @returns {Game} current game or null if there is no ongoing game.
   */
  game() {
    if (this.isGameFinished()) {
      return null;
    }
    return this.#game;
  }

  /**
   * @returns {Boolean} whether there is no ongoing game.
   */
  isGameFinished() {
    return !this.#game || this.#game.isFinished();
  }

}


export { Room };
