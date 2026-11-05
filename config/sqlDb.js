const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5433,
  user: 'postgres',
  password: 'admin', // Put your actual password here
  database: 'postgres',
});

// Create a function that you can call in your main file
const connectDBsql = async () => {
  try {
    const client = await pool.connect();
    console.log('🚀 PostgreSQL database connected successfully on port 5433!');
    client.release(); // Immediately release the client back to the pool
  } catch (err) {
    console.error('❌ Database connection connection error:', err.message);
    process.exit(1); // Stop the server if the database fails to connect
  }
};

// Export both the initialization function and the query pool
module.exports = { connectDBsql, pool };
