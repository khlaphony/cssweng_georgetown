// imports
const path = require('path');
const db = require('../db');
const { uploadRoot, safeOriginalName } = require('../middleware/upload');

// helper: turn a multer file into the columns we store.
// path is stored relative to the private upload root, never absolute.
function fileColumns(file) {
  return [
    path.relative(uploadRoot, file.path),
    safeOriginalName(file.originalname),
    file.verifiedMime,
    file.size,
  ];
}

// inserts one application inside a transaction.
// returns { status: 'duplicate' | 'created', id? }
async function createApplication(data, files) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // same email may not apply twice for the same position
    const [dupes] = await conn.execute(
      'SELECT id FROM applications WHERE email = ? AND position = ? LIMIT 1',
      [data.email, data.position]
    );
    if (dupes.length > 0) {
      await conn.rollback();
      return { status: 'duplicate' };
    }

    // insert (parameterized: values never become part of the SQL text)
    const [result] = await conn.execute(
      `INSERT INTO applications
        (full_name, email, mobile, position, message,
         resume_path, resume_original, resume_mime, resume_size,
         citizenship_path, citizenship_original, citizenship_mime, citizenship_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.fullName,
        data.email,
        data.mobile,
        data.position,
        data.message || null,
        ...fileColumns(files.resume[0]),
        ...fileColumns(files.citizenship[0]),
      ]
    );

    await conn.commit();
    return { status: 'created', id: result.insertId };
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release(); // always return the connection to the pool
  }
}

// export
module.exports = { createApplication };