/** @typedef {import("../types").UserInstance} UserInstance */

export class UserService {
  /** @type {Map<string, UserInstance>} */
  #userConnection = new Map();

  /**
   * @param {UserInstance} userInstance
   */
  addUser(userInstance) {
    this.#userConnection.set(userInstance.id, userInstance);
  }

  /**
   * @param {string} id
   */
  deleteUser(id) {
    this.#userConnection.delete(id);
  }

  /**
   * @param {string} userId
   */
  getUser(userId) {
    const userInstance = this.#userConnection.get(userId);
    if (!userInstance) {
      return null;
    }
    return userInstance;
  }
}