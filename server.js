// BACKEND: accepts requests from the browser and talks to PostgreSQL.
require('dotenv').config();
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL. Copy .env.example to .env and set your PostgreSQL connection string.');
  process.exit(1);
}

// The connection string is secret and stays on the server, never in the browser.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// GET: load the list of people from the database.
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, created_at FROM users ORDER BY id DESC LIMIT 100');
    res.json(result.rows);
  } catch (error) {
    console.error('GET /api/users:', error);
    res.status(500).json({ error: 'Database error. Try again later.' });
  }
});

// POST: receive the name, validate it, and insert it into the database.
app.post('/api/users', async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (name.length < 2 || name.length > 60) {
    return res.status(400).json({ error: 'Name must contain 2–60 characters.' });
  }
  try {
    // $1 is a parameter: safe from SQL injection.
    const result = await pool.query(
      'INSERT INTO users (name) VALUES ($1) RETURNING id, name, created_at',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('POST /api/users:', error);
    res.status(500).json({ error: 'Database error. Try again later.' });
  }
});

// Database setup. Runs on each launch and does not erase existing users.
async function start() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(60) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`App running on http://localhost:${PORT}`);
  });
}

start().catch(error => {
  console.error('Could not connect to PostgreSQL:', error.message);
  process.exit(1);
});
