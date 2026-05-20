import pg from 'pg';
const { Pool } = pg;

const connectionString = 'postgresql://neondb_owner:npg_7qCdhp5eOLDo@ep-polished-mud-ap1ejnd0-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function test1() {
  console.log('Testing with rejectUnauthorized: false...');
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  try {
    const res = await pool.query('SELECT 1 + 1 AS result');
    console.log('Success test 1:', res.rows[0]);
  } catch (err) {
    console.error('Failed test 1:', err);
  } finally {
    await pool.end();
  }
}

async function test2() {
  console.log('Testing with no ssl option (relying on connection string)...');
  const pool = new Pool({
    connectionString
  });
  try {
    const res = await pool.query('SELECT 1 + 1 AS result');
    console.log('Success test 2:', res.rows[0]);
  } catch (err) {
    console.error('Failed test 2:', err);
  } finally {
    await pool.end();
  }
}

async function test3() {
  console.log('Testing with ssl: true...');
  const pool = new Pool({
    connectionString,
    ssl: true
  });
  try {
    const res = await pool.query('SELECT 1 + 1 AS result');
    console.log('Success test 3:', res.rows[0]);
  } catch (err) {
    console.error('Failed test 3:', err);
  } finally {
    await pool.end();
  }
}

async function run() {
  await test1();
  console.log('-----------------');
  await test2();
  console.log('-----------------');
  await test3();
}

run();
