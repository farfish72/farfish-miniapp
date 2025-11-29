"use client";

const FARCASTER_HOST_HINTS = [
  "warpcast.com",
  "warpcast",
  "supercast.xyz",
  "farcaster.xyz",
  "client.farcaster",
  "farcaster",
];

const FARCASTER_UA_REGEX = /Farcaster|Warpcast/i;

const safeWindow = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window;
};

const safeNavigator = () => {
  if (typeof navigator === "undefined") {
    return null;
  }
  return navigator;
};

const safeDocument = () => {
  if (typeof document === "undefined") {
    return null;
  }
  return document;
};

export const hasFarcasterUserAgent = () => {
  const nav = safeNavigator();
  if (!nav) return false;
  return FARCASTER_UA_REGEX.test(nav.userAgent || "");
};

export const hasFarcasterReferrer = () => {
  const doc = safeDocument();
  if (!doc?.referrer) return false;
  return FARCASTER_HOST_HINTS.some((host) => doc.referrer?.toLowerCase().includes(host));
};

export const isEmbeddedContext = () => {
  const win = safeWindow();
  if (!win) return false;
  try {
    return win.parent !== win;
  } catch {
    return true;
  }
};

export const hasFarcasterWalletSignal = () => {
  const win = safeWindow() as (Window & {
    ethereum?: { isFarcaster?: boolean };
    farcasterWallet?: unknown;
  }) | null;
  if (!win) return false;
  const hasEthFlag = !!win.ethereum?.isFarcaster;
  const hasWalletObj = Boolean(win.farcasterWallet);
  return hasEthFlag || hasWalletObj;
};

export const detectFarcasterEnvironment = () => {
  try {
    return (
      isEmbeddedContext() ||
      hasFarcasterUserAgent() ||
      hasFarcasterReferrer() ||
      hasFarcasterWalletSignal()
    );
  } catch {
    return false;
  }
};


