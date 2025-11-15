"use client";
import { useState, useCallback } from "react";

/**
 * Simple wallet abstraction placeholder.
 * Replace internals with Farcaster wallet SDK later.
 */

export default function useWallet() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  const connect = useCallback(async () => {
    // MOCK connect flow
    // TODO: Replace this with Farcaster SDK connect -> signer.getAddress()
    const mockAddress = "0xFAKEFARCASTER0000000000000000001";
    setAddress(mockAddress);
    setConnected(true);
    return mockAddress;
  }, []);

  const disconnect = useCallback(async () => {
    setAddress(null);
    setConnected(false);
  }, []);

  const signMessage = useCallback(async (msg: string) => {
    // TODO: use Farcaster signer to sign
    return "0xMOCK_SIGNATURE";
  }, []);

  const sendTx = useCallback(async (txData: any) => {
    // TODO: send transaction via Farcaster signer or ethers with Farcaster provider
    return { txHash: "0xMOCK_TX_HASH" };
  }, []);

  return {
    connected,
    address,
    connect,
    disconnect,
    signMessage,
    sendTx,
  };
}
