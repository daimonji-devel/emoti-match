import { randomBytes } from 'crypto';
import { Room } from './Room.js';


class RoomHandler {
  #roomIdAddBytes = 3;
  #roomIdTries = 10;
  #maxSize;
  #roomMaxSizeDefault;
  #roomIdBytes;
  #rooms;

  constructor(maxSize = 5, roomMaxSizeDefault = 5, roomIdBytes = 4) {
    this.#maxSize = maxSize;
    this.#roomMaxSizeDefault = roomMaxSizeDefault;
    this.#roomIdBytes = this.#calculateRoomIdBytes(maxSize);
    this.#rooms = new Map();
  }

  /**
   * calculates the room id size in bytes (which is half of the size of the hex string). the result
   * is the number of bytes needed to represent the rooms plus a number of additional security bytes
   * for avoiding guessing a room number.
   * @param {Number} maxSize: maximum number of rooms.
   * @returns {Number} room id size in bytes.
   */
  #calculateRoomIdBytes(maxSize) {
    // log 2 is the number of bits. divided by 8 is the size in bytes.
    return Math.ceil(Math.log(maxSize)/Math.log(2) / 8) + this.#roomIdAddBytes;
  }

  /**
   * @returns {Number} the size of room id strings.
   */
  roomIdSize() {
    return this.#roomIdBytes * 2;
  }

  /**
   * generates a room id which is a random string with roomIdSize() bytes.
   * @returns {String} room id generated.
   */
  #generateRoomId() {
    return randomBytes(this.#roomIdBytes).toString('hex');
  }

  /**
   * @returns {Number} number of rooms handled.
   */
  size() {
    return this.#rooms.size;
  }

  /**
   * @returns {Boolean} whether the handler is full (i.e. maximum number of rooms is reached).
   */
  isFull() {
    return this.size() >= this.#maxSize;
  }

  /**
   * checks whether a certain room exists in this handler.
   * @param {String} id: room ID.
   * @returns {Promise<Boolean>} whether room exists in this handler.
   */
  async hasRoom(id) {
    return this.#rooms.has(id);
  }

  /**
   * retrieves a room.
   * @param {String} id: room ID.
   * @returns {Promise<Room>} the room object corresponding the the ID.
   */
  async getRoom(id) {
    return this.#rooms.get(id);
  }

  /**
   * creates a new room.
   * @param {Number} maxSize: optional number of players in the new room. use roomMaxSizeDefault if
   *  omitted or falsy.
   * @returns {Promise<Room|null>} the new room created or null if room could not be created due to
   *  maxSize constraint.
   */
  async createNewRoom(maxSize) {
    if (this.isFull()) {
      return null;
    }
    for (let i = 0; i < this.#roomIdTries; i++) {
      let id = this.#generateRoomId();
      if (this.#rooms.has(id)) {
        continue;
      }
      let room = new Room(id, maxSize ? maxSize : this.#roomMaxSizeDefault);
      this.#rooms.set(id, room);
      return room;
    }
    throw new Error('cannot create new room (probably the roomIdSize is too small)');
  }

  /**
   * removes a room from this handler.
   * @param {String} id room ID. 
   * @returns whether room has been removed (or has not been handled in the first place).
   */
  async removeRoom(id) {
    return this.#rooms.delete(id);
  }

}


export { RoomHandler };
