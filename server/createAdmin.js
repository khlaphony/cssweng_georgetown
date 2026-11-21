const pool = require('./db');
const { hashPassword } = require('./utils/auth');

(async () => {
  const [username, password] = process.argv.slice(2);

  if (!username || !password || password.length < 8) {
    console.error('Usage: node server/createAdmin.js <username> <password (8+ characters)>');
    process.exit(1);
  }

  try {
    await pool.execute(
      `INSERT INTO admins (username, password_hash) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
      [username, hashPassword(password)]
    );
    console.log(`Admin "${username}" saved.`);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();

