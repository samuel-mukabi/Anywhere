const { Client } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log('Connected to PostgreSQL...');
    const sql = fs.readFileSync('supabase/seed.sql', 'utf8');
    await client.query(sql);
    console.log('PostgreSQL seeded successfully!');
  } catch (err) {
    console.error('Failed to seed PostgreSQL:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
