const Redis = require('ioredis');

// Create Redis client with Sentinel support
const redis = new Redis({
  sentinels: [
    { host: 'sentinel-lb.redis-prod.svc.cluster.local', port: 5000 },
  ],
  name: 'mymaster',
  password: 'redis',
  role: 'master',
});

// Handle successful connection
redis.on('connect', () => {
  console.log('✅ Redis Sentinel client connected (low-level TCP connection)');
});

redis.on('ready', () => {
  console.log('🎉 Redis client is ready to use (connected to master)');
});

// Handle errors
redis.on('error', (err) => {
  console.error('❌ Redis error:', err.message || err);
});

// Handle disconnects
redis.on('close', () => {
  console.warn('⚠️ Redis connection closed');
});

// Optional: Test command
redis.set('test_key', 'hello sentinel')
  .then(() => redis.get('test_key'))
  .then(value => {
    console.log('🔍 Fetched value from Redis:', value);
  })
  .catch(err => {
    console.error('❌ Redis command error:', err.message || err);
  });
