/**
 * Unified Redis Client for FarFISH
 * 
 * Redis Schema:
 * - `leaderboard` (sorted set): wallet addresses sorted by score (reward events)
 *   Score represents reward events; display as score × 20 FRH tokens
 * - `user:{wallet}` (JSON string): User data including steam task completion
 *   Example: { steam: { fishing: { last: timestamp }, add_app: { completed: true }, ... } }
 * - `referral:{wallet}` (string): Referrer wallet address or JSON { referrer, createdAt }
 * - `refcount:{wallet}` (integer): Count of successful referrals by this wallet
 * - `refcode:{code}` (string): Maps 8-char code to wallet address (cache)
 * - `set:referrers` (set): Set of wallet addresses that have made referrals
 * - `streak:{wallet}` (integer): Daily chest claim streak count
 * - `verified_tasks:{wallet}:{task}` (timestamp): Task completion tracking
 * - `fishing:{wallet}` (timestamp): Last fishing activity
 * - `steam_fishing:{wallet}` (timestamp): Steam fishing activity
 * - `rewards:{wallet}` (JSON): Reward tracking data
 * 
 * Score Calculation:
 * - Leaderboard score is incremented by 1 per reward event
 * - Both referrer and referee get +1 when referral is recorded
 * - Display multiplier: score × 20 = FRH tokens shown to users
 */

import { Redis } from '@upstash/redis';

export class RedisClient {
  private client: Redis;

  constructor() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set');
    }

    this.client = new Redis({
      url,
      token,
    });
  }

  // String operations
  async get<T = string>(key: string): Promise<T | null> {
    return await this.client.get<T>(key);
  }

  async set(key: string, value: string | number | object): Promise<'OK' | null> {
    return await this.client.set(key, value) as 'OK' | null;
  }

  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    return await this.client.exists(key);
  }

  // Sorted set operations
  async zadd(key: string, score: number, member: string): Promise<number> {
    return await this.client.zadd(key, { score, member });
  }

  async zincrby(key: string, increment: number, member: string): Promise<number> {
    return await this.client.zincrby(key, increment, member);
  }

  async zrange(key: string, start: number, stop: number, withScores = false): Promise<any[]> {
    if (withScores) {
      return await this.client.zrange(key, start, stop, { withScores: true });
    }
    return await this.client.zrange(key, start, stop);
  }

  async zrevrange(key: string, start: number, stop: number, withScores = false): Promise<string[]> {
    if (withScores) {
      return await this.client.zrange(key, start, stop, { rev: true, withScores: true }) as string[];
    }
    return await this.client.zrange(key, start, stop, { rev: true }) as string[];
  }

  async zcard(key: string): Promise<number> {
    return await this.client.zcard(key);
  }

  async zscore(key: string, member: string): Promise<number | null> {
    return await this.client.zscore(key, member);
  }

  async zrevrank(key: string, member: string): Promise<number | null> {
    return await this.client.zrevrank(key, member);
  }

  // Hash operations
  async hget(key: string, field: string): Promise<string | null> {
    return await this.client.hget(key, field);
  }

  async hset(key: string, field: string, value: string | number): Promise<number> {
    return await this.client.hset(key, { [field]: value });
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    return await this.client.hincrby(key, field, increment);
  }

  // Set operations
  async sadd(key: string, member: string): Promise<number> {
    return await this.client.sadd(key, member);
  }

  async smembers(key: string): Promise<string[]> {
    return await this.client.smembers(key);
  }

  // Key operations
  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }
}

// Export singleton instance
let redisInstance: RedisClient | null = null;

export function getRedisClient(): RedisClient {
  if (!redisInstance) {
    redisInstance = new RedisClient();
  }
  return redisInstance;
}

export default getRedisClient;
