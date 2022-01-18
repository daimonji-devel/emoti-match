/**
 * selector of random elements from an array. each element will only be slected once.
 */
class RandomArrayElementSelector {
  #array;

  /**
   * constructor.
   * @param {Array} sourceArray: array to select from. the array will be shallow-copied.
   * later changes to the source array will not have an influence on the selection.
   */
  constructor(sourceArray) {
    this.#array = [...sourceArray];
  }

  /**
   * @returns {Number} remaining size of array (number of elements which can still be selected).
   */
  size() {
    return this.#array.length;
  }

  /**
   * selects one element from the array.
   * @returns element selected or undefined if array is exhausted.
   */
  selectOne() {
    if (this.size()) {
      let id = Math.floor(Math.random() * this.size());
      return this.#array.splice(id, 1)[0];
    }
    return undefined;
  }

  /**
   * selects a sub-array of elements from the array.
   * @param {Number} size of sub-array (number of elements to select). 
   * @returns {Array} an array of selected elements. once the source array is exhausted, undefined
   * will be returned instead of an element.
   */
  selectArray(size) {
    let result = [];
    for (let i = 0; i < size; i++) {
      result.push(this.selectOne());
    }
    return result;
  }

}


export { RandomArrayElementSelector };
