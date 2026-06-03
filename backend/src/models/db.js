const { Pool } = require('pg');

const isSupabase = process.env.DATABASE_URL?.includes('supabase.co');
const useSsl = process.env.DATABASE_SSL === 'true' || isSupabase;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

module.exports = pool;
