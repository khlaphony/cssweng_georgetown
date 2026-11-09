// import db
const db = require('../server/db');

// email validator: prevents duplication
async function findDuplicate(email, position) {
  const sql = 'SELECT id FROM applications WHERE email = ? AND position = ? LIMIT 1';

  const [rows] = await db.execute(sql, [email, position]);

  return rows.length > 0;
}

// creates application as object instead of separate functions for each field.
async function createApplication({
  fullName,
  email,
  mobile,
  position,
  message,
  resumePath,
  citizenshipPath,
}) {
  const sql = `
    INSERT INTO applications
      (full_name, email, mobile, position, message, resume_path, citizenship_path)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    fullName,
    email,
    mobile,
    position,
    message || null,
    resumePath,
    citizenshipPath,
  ];

  const [result] = await db.execute(sql, values);

  return result.insertId;
}

// export
module.exports = { findDuplicate, createApplication };