import { getServerReferralEnv } from "../app/config/referral";

type UpstashResponse<T> = {
  result?: T;
  error?: string;
};

const { upstashUrl, upstashToken } = getServerReferralEnv();
const baseUrl = upstashUrl.endsWith("/") ? upstashUrl.slice(0, -1) : upstashUrl;

const buildUrl = (path: string) => `${baseUrl}/${path}`;

const upstashRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(buildUrl(path), {
    method: init?.method ?? "GET",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${upstashToken}`,
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstash request failed (${res.status}): ${text || res.statusText}`);
  }

  const data = (await res.json()) as UpstashResponse<T>;
  if (data.error) {
    throw new Error(data.error);
  }

  return data.result as T;
};

export const getKey = async <T = string>(key: string): Promise<T | null> => {
  const result = await upstashRequest<T | null>(`get/${encodeURIComponent(key)}`);
  return (result as T | null) ?? null;
};

export const setKey = async (key: string, value: string | Record<string, unknown>) => {
  const stored = typeof value === "string" ? value : JSON.stringify(value);
  return upstashRequest<number>(`set/${encodeURIComponent(key)}/${encodeURIComponent(stored)}`, { method: "POST" });
};

export const incrKey = async (key: string) => {
  return upstashRequest<number>(`incr/${encodeURIComponent(key)}`, { method: "POST" });
};

export const sadd = async (set: string, value: string) => {
  return upstashRequest<number>(`sadd/${encodeURIComponent(set)}/${encodeURIComponent(value)}`, { method: "POST" });
};

export const smembers = async (set: string) => {
  const result = await upstashRequest<string[] | null>(`smembers/${encodeURIComponent(set)}`);
  return Array.isArray(result) ? result : [];
};

