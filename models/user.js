/** User class for message.ly */
const db = require("../db");
const bcrypt = require("bcrypt");
const ExpressError = require("../expressError");

const { DB_URI, BCRYPT_WORK_FACTOR } = require("../../express-messagely-solution/config");



/** User of the site. */

class User {

  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({username, password, first_name, last_name, phone}) {
    let hashedPw = await bcrypt.hash(password, BCRYPT_WORK_FACTOR)
    const result = await db.query(`
    INSERT INTO users (username, password, first_name, last_name, phone, join_at, last_login_at)
    VALUES ($1, $2, $3, $4, $5, current_timestamp, current_timestamp)
    RETURNING username, password, first_name, last_name, phone
    `, [username, hashedPw, first_name, last_name, phone]);
    return result.rows[0];

   }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    const result = await db.query(`
    SELECT password FROM users
    WHERE username = $1`, 
    [username]);
    let user = result.rows[0];
    return user && await bcrypt.compare(password, user.password);
   }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const result = await db.query(`
    UPDATE users
    SET last_login_at = current_timestamp
    WHERE username = $1
    RETURNING username`, 
    [username]);

    if(!result.rows[0]) {
      throw new ExpressError(`No User : ${username}`, 404);
    }
   }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    const result = await db.query(`
    SELECT username, first_name, last_name, phone
    FROM users
    ORDER BY username`);
    return result.rows;
   }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const result = await db.query(`
    SELECT  username, first_name, last_name, phone, join_at, last_login_at
    FROM users
    WHERE username = $1`,
    [username]);
    if(!result.rows[0]) {
      throw new ExpressError(`No User : ${username}`, 404);
    }
    return result.rows[0];
   }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    const results = await db.query(`
    SELECT messages.id,
    messages.to_username,
    messages.body,
    messages.sent_at,
    messages.read_at,
    users.first_name,
    users.last_name,
    users.phone
    FROM messages
    JOIN users
    ON messages.to_username = users.username
    WHERE from_username = $1`, [username]);

    return results.rows.map( m => ({
      id : m.id,
      to_user : {
        username: m.to_username,
        first_name : m.first_name,
        last_name : m.last_name,
        phone : m.phone
      },
      body : m.body,
      sent_at : m.sent_at,
      read_at : m.read_at
    }));
   }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {id, first_name, last_name, phone}
   */

  static async messagesTo(username) { 
    const results = await db.query(
      `
    SELECT  messages.id,
            messages.body,
            messages.sent_at,
            messages.read_at,
            messages.from_username,
            users.first_name,
            users.last_name,
            users.phone
    FROM messages
    JOIN users
    ON messages.from_username = users.username
    WHERE to_username = $1`, [username]);
    return results.rows.map( msg => ({
      id: msg.id,
      from_user: {
        username: msg.from_username,
        first_name: msg.first_name,
        last_name: msg.last_name,
        phone: msg.phone
      },
      body: msg.body,
      sent_at: msg.sent_at,
      read_at: msg.read_at
    }));
  }
}


module.exports = User;