const { createClient } = require('redis');
require('dotenv').config();

const redisClient = createClient({
  username: 'default',
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_URI,
    port: process.env.REDIS_PORT
  }
});

redisClient.on('error', err => {
  if (err.code === 'ECONNREFUSED') return;
  console.error('Redis Client Error:', err);
});

module.exports = redisClient;
