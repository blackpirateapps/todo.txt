// Run this locally: node scripts/setup-db.js
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("Missing TURSO_DATABASE_URL");
  process.exit(1);
}

const db = createClient({ url, authToken });

async function setup() {
  console.log("Setting up Turso DB...");
  
  // Table for the latest state of the todo.txt file
  // We use a fixed ID 'main' for the single user use-case, 
  // or use the password-hash as an ID if expanding later.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      content TEXT,
      updated_at INTEGER
    );
  `);

  // Table for history (optional, good for versioning)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id TEXT,
      content TEXT,
      created_at INTEGER
    );
  `);

  console.log("Tables created successfully.");
}

setup();