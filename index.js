/**
 * Redis Sentinel Continuous Reliability Tester
 * --------------------------------------------
 * - Connects via Sentinel to master automatically
 * - Continuously performs write/read/delete operations
 * - Measures latency and consistency
 * - Detects failovers, reconnections, and network errors
 * - Safe for long-running production monitoring
 */

const Redis = require('ioredis');
const crypto = require('crypto');

// ===============================
// 🔧 Configuration
// ===============================
const CONFIG = {
  sentinels: [{ host: 'sentinel-lb.redis-prod.svc.cluster.local', port: 5000 }],
  name: 'mymaster',
  password: 'redis',
  role: 'master',
  testIntervalMs: 2000, // interval between tests
  reconnectDelayMs: 3000,
};

// ===============================
// 🚀 Redis Client
// ===============================
const redis = new Redis({
  sentinels: CONFIG.sentinels,
  name: CONFIG.name,
  role: CONFIG.role,
  password: CONFIG.password,
  sentinelRetryStrategy: (times) => Math.min(times * 1000, 10000),
  reconnectOnError: (err) => {
    console.error('⚠️ Reconnect on error:', err.message);
    return true;
  },
  enableReadyCheck: true,
  lazyConnect: false,
});

// ===============================
// 📡 Event Handlers
// ===============================
redis.on('connect', () => console.log('✅ Connected to Redis Sentinel TCP'));
redis.on('ready', () => console.log('🎉 Redis client is ready (connected to master)'));
redis.on('error', (err) => console.error('❌ Redis error:', err.message));
redis.on('reconnecting', (time) => console.log(`🔄 Reconnecting in ${time}ms`));
redis.on('end', () => console.warn('⚠️ Redis connection ended'));
redis.on('+switch-master', (msg) =>
  console.warn(`⚠️ Master switched: ${JSON.stringify(msg)}`)
);

// ===============================
// 🧪 Test Operations
// ===============================
const randomKey = () => `test:${crypto.randomBytes(4).toString('hex')}`;
const randomValue = () => crypto.randomBytes(8).toString('hex');

let stats = {
  total: 0,
  success: 0,
  fail: 0,
  avgLatency: 0,
  lastFailover: null,
};

async function runTestCycle() {
  const key = randomKey();
  const value = randomValue();
  const start = Date.now();

  try {
    await redis.set(key, value, 'EX', 10);
    const fetched = await redis.get(key);

    const latency = Date.now() - start;
    stats.total++;
    stats.avgLatency = (stats.avgLatency * (stats.success) + latency) / (stats.success + 1);

    if (fetched === value) {
      stats.success++;
      console.log(`✅ [OK] Key=${key} | Latency=${latency}ms | Avg=${stats.avgLatency.toFixed(2)}ms`);
    } else {
      stats.fail++;
      console.warn(`⚠️ [Mismatch] Key=${key} Expected=${value}, Got=${fetched}`);
    }

    await redis.del(key);
  } catch (err) {
    stats.fail++;
    console.error(`❌ [Error] ${err.message}`);
  }
}

async function continuousTest() {
  console.log('🚀 Starting Redis Sentinel production test loop...');
  while (true) {
    await runTestCycle();
    await new Promise((r) => setTimeout(r, CONFIG.testIntervalMs));
  }
}

// ===============================
// 📊 Health Report
// ===============================
setInterval(() => {
  console.log(
    `📈 Stats: Total=${stats.total} | Success=${stats.success} | Fail=${stats.fail} | AvgLatency=${stats.avgLatency.toFixed(
      2
    )}ms`
  );
}, 30000); // every 30 seconds

// ===============================
// 🏁 Start Test
// ===============================
continuousTest().catch((err) => {
  console.error('💥 Fatal error:', err.message);
  process.exit(1);
});
