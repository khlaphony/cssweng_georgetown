// import db
const db = require('../server/db');

// email validator: prevents duplication
async function findDuplicate(email, position) {
  const sql = 'SELECT id FROM applications WHERE email = ? AND position = ? LIMIT 1';

  const [rows] = await db.execute(sql, [email, position]);

  return rows.length > 0;
}