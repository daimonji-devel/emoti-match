/**
 * Representation of a game room. A room has an id and a number of players.
 */
class Room {
  #id;
  #maxSize;
  #players;

  /**
   * constructor.
   * @param {String} id: unique ID of the game room. 
   * @param {Number} maxSize: maximum size of room (number of players allowed).
   */
  constructor(id, maxSize) {
    this.#id = id;
    this.#maxSize = maxSize;
    this.#players = [];
  }

  /**
   * add a player to the room.
   * @param {Player} player player to be added.
   * @returns whether player was added (or the room was full already).
   */
  addPlayer(player) {
    if (this.size() >= this.#maxSize) {
      return false;
    }
    this.#players.push(player);
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
    return true;
  }

  /**
   * @returns iterator through all players.
   */
  playerIterator() {
    return this.#players.values();
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
    return {id: this.#id, players: players};
  }

}


export { Room };
