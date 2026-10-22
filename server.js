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

// An idle connection can drop (e.g. the database went to sleep). Without this listener, that error crashes the server.
pool.on('error', error => {
  console.error('PostgreSQL pool error:', error.message);
});

// Hosts like Render sit behind a proxy. This makes req.ip the visitor's real IP, not the proxy's.
app.set('trust proxy', 1);
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Allowed values for the "interest" field. Anything else is rejected (a whitelist).
const INTERESTS = ['engagement', 'earrings', 'bracelet', 'loose', 'custom', 'other'];
const PHONE = /^[0-9+\-\s()]{9,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Simple rate limit: each IP may send up to 5 appointment requests per 10 minutes. The counter resets every window.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const requestsByIp = new Map();
setInterval(() => requestsByIp.clear(), RATE_WINDOW_MS).unref();

// POST: a visitor asks for a private consultation. Appointments are private: there is no public GET route.
app.post('/api/appointments', async (req, res) => {
  const count = (requestsByIp.get(req.ip) || 0) + 1;
  requestsByIp.set(req.ip, count);
  if (count > RATE_MAX) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  const field = key => (typeof req.body?.[key] === 'string' ? req.body[key].trim() : '');
  const name = field('name');
  const contact = field('contact');
  const interest = field('interest');
  const message = field('message');

  // Honeypot: a hidden field real people never fill. Bots do, so pretend success and save nothing.
  if (field('company')) {
    return res.status(201).json({ name });
  }
  if (name.length < 2 || name.length > 60) {
    return res.status(400).json({ error: 'Name must contain 2–60 characters.' });
  }
  if (contact.length > 100 || !(PHONE.test(contact) || EMAIL.test(contact))) {
    return res.status(400).json({ error: 'Enter a valid phone number or email.' });
  }
  if (!INTERESTS.includes(interest)) {
    return res.status(400).json({ error: 'Choose what you are interested in.' });
  }
  if (message.length > 500) {
    return res.status(400).json({ error: 'Message must contain up to 500 characters.' });
  }

  try {
    // $1..$4 are parameters: safe from SQL injection.
    await pool.query(
      'INSERT INTO appointments (name, contact, interest, message) VALUES ($1, $2, $3, $4)',
      [name, contact, interest, message || null]
    );
    // Reached only after the INSERT succeeded. Only echo back the name; the browser does not need anything else.
    res.status(201).json({ name });
  } catch (error) {
    console.error('POST /api/appointments:', error);
    res.status(500).json({ error: 'Database error. Try again later.' });
  }
});

// Database setup. Runs on each launch and does not erase existing data.
// (Older tables from earlier versions, "users" and "inquiries", stay in the database untouched.)
async function start() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointments (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(60) NOT NULL,
      contact VARCHAR(100) NOT NULL,
      interest VARCHAR(30) NOT NULL,
      message VARCHAR(500),
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
