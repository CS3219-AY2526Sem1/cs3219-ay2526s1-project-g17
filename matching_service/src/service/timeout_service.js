export class TimeoutService {
  /**
   * @type {Map<string, NodeJS.Timeout>}
   * @private
   */
  timeoutMap = new Map();

  /**
   * @param {string} id
   * @param {NodeJS.Timeout} timeout
   */
  addTimeout(id, timeout) {
    this.timeoutMap.set(id, timeout);
  }

  /**
   * @param {string} id
   */
  removeTimeout(id) {
    const timeout = this.timeoutMap.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeoutMap.delete(id);
    }
  }
}
