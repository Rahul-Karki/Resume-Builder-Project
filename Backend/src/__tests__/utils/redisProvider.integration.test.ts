import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

const redisStore = new Map<string, { value: string; ttl: number; expiry: number }>();

const mockRedisClient = () => {
  let isOpen = false;
  const api = {
    isOpen: false,
    connect: vi.fn().mockImplementation(async () => { isOpen = true; api.isOpen = true; }),
    on: vi.fn(),
    quit: vi.fn().mockImplementation(async () => { isOpen = false; api.isOpen = false; }),
    disconnect: vi.fn().mockImplementation(async () => { isOpen = false; api.isOpen = false; }),
    get: vi.fn().mockImplementation(async (key: string) => {
      const entry = redisStore.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiry) {
        redisStore.delete(key);
        return null;
      }
      return entry.value;
    }),
    set: vi.fn().mockImplementation(async (key: string, value: string, opts?: { EX?: number }) => {
      const ttl = opts?.EX ?? 300;
      redisStore.set(key, { value, ttl, expiry: Date.now() + ttl * 1000 });
      return 'OK';
    }),
    del: vi.fn().mockImplementation(async (...args: unknown[]) => {
      const flatKeys = args.flat() as string[];
      let count = 0;
      for (const key of flatKeys) {
        if (redisStore.delete(key)) count++;
      }
      return count;
    }),
    eval: vi.fn().mockImplementation(async (script: string, opts: { keys: string[]; arguments: string[] }) => {
      const key = opts.keys[0];
      const windowSec = Number(opts.arguments[0]);
      const entry = redisStore.get(key);
      if (!entry) {
        const count = 1;
        redisStore.set(key, { value: String(count), ttl: windowSec, expiry: Date.now() + windowSec * 1000 });
        return [count, windowSec];
      }
      const count = Number(entry.value) + 1;
      redisStore.set(key, { value: String(count), ttl: entry.ttl, expiry: entry.expiry });
      const remainingTtl = Math.max(1, Math.round((entry.expiry - Date.now()) / 1000));
      return [count, remainingTtl];
    }),
    scanIterator: vi.fn().mockImplementation(function* (opts: { MATCH: string; COUNT: number }) {
      const pattern = opts.MATCH.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      for (const key of redisStore.keys()) {
        if (regex.test(key)) yield key;
      }
    }),
    ping: vi.fn().mockResolvedValue('PONG'),
  };
  return api;
};

let currentMockClient: ReturnType<typeof mockRedisClient>;

vi.mock('redis', () => ({
  createClient: vi.fn(() => {
    currentMockClient = mockRedisClient();
    return currentMockClient;
  }),
}));

vi.mock('../../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    SERVICE_NAME: 'resume-builder-backend',
    SERVICE_VERSION: '1.0.0',
    ENABLE_METRICS: false,
    USE_MEMORY_ONLY_CACHE: false,
    REDIS_URL: 'redis://localhost:6379/0',
    REDIS_CONNECT_TIMEOUT_MS: 5000,
    UPSTASH_REDIS_REST_URL: '',
    UPSTASH_REDIS_REST_TOKEN: '',
    UPSTASH_CALLS_PER_MIN: 600,
  },
}));

import { cacheGet, cacheSet, consumeRateLimit, getCacheProvider, getRedisClient, closeRedisClient, deleteByPattern } from '../../utils/redis';

describe('Redis provider integration', () => {
  beforeAll(async () => {
    await getRedisClient();
  });

  afterAll(async () => {
    await closeRedisClient();
  });

  beforeEach(() => {
    redisStore.clear();
  });

  it('should detect Redis as the active provider', () => {
    expect(getCacheProvider()).toBe('redis');
  });

  it('should cache and retrieve values via Redis', async () => {
    await cacheSet('test:key', 'hello-redis', 60);
    const result = await cacheGet('test:key');
    expect(result).toBe('hello-redis');
  });

  it('should return null for missing cache keys', async () => {
    const result = await cacheGet('test:nonexistent');
    expect(result).toBeNull();
  });

  it('should cache JSON-serializable values', async () => {
    const payload = { statusCode: 200, body: { id: '123', name: 'test' } };
    await cacheSet('test:json', JSON.stringify(payload), 60);
    const raw = await cacheGet('test:json');
    expect(raw).toBe(JSON.stringify(payload));
    expect(JSON.parse(raw!)).toEqual(payload);
  });

  it('should overwrite existing cache entries', async () => {
    await cacheSet('test:overwrite', 'old-value', 60);
    await cacheSet('test:overwrite', 'new-value', 60);
    const result = await cacheGet('test:overwrite');
    expect(result).toBe('new-value');
  });

  it('should consume rate limit and return incremented count', async () => {
    const first = await consumeRateLimit('test:rl:user1', 60);
    expect(first).not.toBeNull();
    expect(first!.count).toBe(1);
    expect(first!.ttlSeconds).toBeGreaterThan(0);

    const second = await consumeRateLimit('test:rl:user1', 60);
    expect(second!.count).toBe(2);
  });

  it('should handle independent rate limit keys separately', async () => {
    const r1 = await consumeRateLimit('test:rl:alice', 60);
    const r2 = await consumeRateLimit('test:rl:bob', 60);
    expect(r1!.count).toBe(1);
    expect(r2!.count).toBe(1);
  });

  it('should delete cache entries by pattern', async () => {
    await cacheSet('test:del:1', 'a', 60);
    await cacheSet('test:del:2', 'b', 60);
    await cacheSet('other:key', 'c', 60);

    const deleted = await deleteByPattern('test:del:*');
    expect(deleted).toBe(2);

    expect(await cacheGet('test:del:1')).toBeNull();
    expect(await cacheGet('test:del:2')).toBeNull();
    expect(await cacheGet('other:key')).toBe('c');
  });

  it('should use Redis client for get/set operations', async () => {
    redisStore.clear();

    await cacheSet('redis:track:1', 'tracked-value', 60);
    await cacheGet('redis:track:1');

    expect(currentMockClient.set).toHaveBeenCalled();
    expect(currentMockClient.get).toHaveBeenCalledWith('redis:track:1');
  });

  it('should use Lua EVAL for rate limiting', async () => {
    redisStore.clear();
    await consumeRateLimit('test:rl:eval-check', 120);
    expect(currentMockClient.eval).toHaveBeenCalled();
  });
});
