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
          setMessage("Open this inside Farcaster to continue.");
          return;
        }

        const userFid = context.user.fid;
        setFid(userFid);

        await verifyTask(userFid);
      } catch {
        setState("no_fid");
        setMessage("Open this inside Farcaster to continue.");
      }
    };

    init();
  }, [taskId]);

  const verifyTask = async (userFid: number) => {
    setState("verifying");
    setMessage("Checking activity…");

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
        setMessage("Verified.");

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
      setMessage("Connection error. Try again.");
    }
  };

  const taskText = () => {
    switch (taskId) {
      case "fc_follow":
        return "Follow @farf";
      case "fc_like_recast":
        return "Like & recast";
      case "fc_comment":
        return "Leave a comment";
      default:
        return "Complete task";
    }
  };

  return (
    <div className="app-page flex min-h-screen items-center justify-center bg-surface">
      <div className="app-panel w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-white mb-2">
          Verifying…
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
            className="app-button text-sm"
          >
            Back to Steam
          </button>
        )}
      </div>
    </div>
  );
}

export default function FarcasterVerifyPage() {
  return (
    <Suspense fallback={
      <div className="app-page flex min-h-screen items-center justify-center bg-surface">
        <div className="app-panel w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-white mb-2">
            FarFISH
          </h1>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
