/**
 * representation of a player.
 */
class Player {
  #socket;
  #name;

  /**
   * constructor.
   * @param {Object} socket socket object used for communicating with player. 
   * @param {String} name player name.
   */
  constructor(socket, name) {
    this.#socket = socket;
    this.#name = name;
  }

  /**
   * @returns {Object} the socket object used for communicating with player.
   */
  socket() {
    return this.#socket;
  }

  /**
   * @returns {String} the name of the player.
   */
  name() {
    return this.#name;
  }

  /**
   * @returns {String} a string representing the player.
   */
  toString() {
    return `Player "${this.#name}"`;
  }

  /**
   * @returns {Object} an object with the public information of the player.
   */
   publicInfo() {
    return {name: this.#name};
  }

}


export { Player };
