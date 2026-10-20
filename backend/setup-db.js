const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'database', 'healthcare.db');
const db = new Database(dbPath);

const schema = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');
const seed = fs.readFileSync(path.join(__dirname, '..', 'database', 'seed.sql'), 'utf8');

db.exec(schema);
db.exec(seed);

console.log('Database created and seeded successfully.');
db.close();