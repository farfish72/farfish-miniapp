/**
 * Backward compatibility layer for existing API routes
 * Redirects to lib/redis.ts for actual Redis operations
 * Maintains in-memory fallback for when Redis is not configured
 */

import { getRedisClient } from "./redis";

// In-memory fallback store for when Upstash Redis is not configured
const memStore = new Map<string, string>();
const memSets = new Map<string, Set<string>>();

const isRedisAvailable = () => {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
};

export const getKey = async <T = string>(key: string): Promise<T | null> => {
  if (!isRedisAvailable()) {
    const val = memStore.get(key);
    if (!val) return null;
    try {
      return JSON.parse(val) as T;
    } catch {
      return val as unknown as T;
    }
  }

  try {
    const redis = getRedisClient();
    return await redis.get<T>(key);
  } catch {
    return null;
  }
};

export const setKey = async (key: string, value: string | Record<string, unknown>) => {
  const stored = typeof value === "string" ? value : JSON.stringify(value);
  
  if (!isRedisAvailable()) {
    memStore.set(key, stored);
    return 1;
  }

  try {
    const redis = getRedisClient();
    await redis.set(key, value);
    return 1;
  } catch {
    memStore.set(key, stored);
    return 0;
  }
};

export const incrKey = async (key: string) => {
  if (!isRedisAvailable()) {
    const curr = parseInt(memStore.get(key) || "0", 10) || 0;
    const next = curr + 1;
    memStore.set(key, next.toString());
    return next;
  }

  try {
    const redis = getRedisClient();
    return await redis.incr(key);
  } catch {
    return 0;
  }
};

export const sadd = async (set: string, value: string) => {
  if (!isRedisAvailable()) {
    if (!memSets.has(set)) memSets.set(set, new Set());
    memSets.get(set)!.add(value);
    return 1;
  }

  try {
    const redis = getRedisClient();
    return await redis.sadd(set, value);
  } catch {
    return 0;
  }
};

export const smembers = async (set: string) => {
  if (!isRedisAvailable()) {
    return memSets.has(set) ? Array.from(memSets.get(set)!) : [];
  }

  try {
    const redis = getRedisClient();
    return await redis.smembers(set);
  } catch {
    return [];
  }
};

export const keys = async (pattern: string) => {
  if (!isRedisAvailable()) {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return Array.from(memStore.keys()).filter((k) => regex.test(k));
  }

  try {
    const redis = getRedisClient();
    return await redis.keys(pattern);
  } catch {
    return [];
  }
};
