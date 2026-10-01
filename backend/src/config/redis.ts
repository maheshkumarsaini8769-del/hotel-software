import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || process.env.REDIS_URI || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 3) {
      // Don't spam retries if Redis is not running locally
      return null;
    }
    return Math.min(times * 100, 2000);
  },
});

let isConnected = false;

redis.on('connect', () => {
  isConnected = true;
  console.log('⚡ [Redis] Connected successfully to Redis Cache');
});

redis.on('error', (err) => {
  isConnected = false;
  // Silently log warning in development to avoid crashing if Redis is not started
  if (process.env.NODE_ENV === 'production') {
    console.error('⚠️ [Redis Error]:', err.message);
  }
});

export const connectRedis = async (): Promise<boolean> => {
  try {
    await redis.connect();
    isConnected = true;
    return true;
  } catch (err: any) {
    isConnected = false;
    return false;
  }
};

export const isRedisReady = (): boolean => isConnected;
