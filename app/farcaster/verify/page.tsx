"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { sdk } from "@farcaster/miniapp-sdk";

export const dynamic = "force-dynamic";

type VerificationState =
  | "loading"
  | "verifying"
  | "success"
  | "error"
  | "no_fid";

function VerifyContent() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");
  const returnUrl = searchParams.get("returnUrl");

  const [state, setState] = useState<VerificationState>("loading");
  const [message, setMessage] = useState("");
  const [fid, setFid] = useState<number | null>(null);

  useEffect(() => {
    try {
      sdk.actions.ready();
    } catch {}

    const init = async () => {
      if (!taskId) {
        setState("error");
        setMessage("Missing task ID");
        return;
      }

      try {
        const context = await sdk.context;

        if (!context?.user?.fid) {
          setState("no_fid");
          setMessage("Please open this inside Farcaster (Warpcast).");
          return;
        }

        const userFid = context.user.fid;
        setFid(userFid);

        await verifyTask(userFid);
      } catch {
        setState("no_fid");
        setMessage("Please open this inside Farcaster (Warpcast).");
      }
    };

    init();
  }, [taskId]);

  const verifyTask = async (userFid: number) => {
    setState("verifying");
    setMessage("Verifying your Farcaster activity...");

    try {
      const res = await fetch("/api/farcaster/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid: userFid,
          taskId,
        }),
      });

      const data = await res.json();

      if (res.ok && data.verified) {
        setState("success");
        setMessage("Task verified successfully!");

        setTimeout(() => {
          if (returnUrl) {
            window.location.href = returnUrl;
          }
        }, 2000);
      } else {
        setState("error");
        setMessage(
          data?.error || "Verification failed. Please complete the task first."
        );
      }
    } catch {
      setState("error");
      setMessage("Network error. Please try again.");
    }
  };

  const taskText = () => {
    switch (taskId) {
      case "fc_follow":
        return "Follow @farf on Farcaster";
      case "fc_like_recast":
        return "Like and recast the announcement";
      case "fc_comment":
        return "Comment on the announcement";
      default:
        return "Complete Farcaster task";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-purple-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/10 border border-white/20 rounded-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">
          FarFISH Verification
        </h1>
        <p className="text-purple-200 mb-6">{taskText()}</p>

        <p className="text-white mb-6">{message}</p>

        {fid && (
          <p className="text-purple-300 text-sm mb-4">
            Verifying for FID: {fid}
          </p>
        )}

        {state === "no_fid" && returnUrl && (
          <button
            onClick={() => (window.location.href = returnUrl)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            Return to Steam Page
          </button>
        )}
      </div>
    </div>
  );
}

export default function FarcasterVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-purple-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/10 border border-white/20 rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">
            FarFISH Verification
          </h1>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
