"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import Header from "../components/Header";
import useFarcasterEnvironment from "../hooks/useFarcasterEnvironment";
import { NFT_CONTRACT_ADDRESS } from "../constants";
import { getPublicClient } from "@wagmi/core";
import { wagmiConfig } from "../lib/wagmi";
import nftDropAbi from "../abi/nftDrop.json";

type ToastState = { type: "error" | "success"; message: string } | null;

type TaskProgress = {
  joinedAt?: string;
  referrals?: number;
  daily_checkin?: { count: number; last: string };
  add_miniapp?: boolean;
  fc?: {
    follow?: boolean;
    recast?: boolean;
    comment?: boolean;
  };
  base?: {
    follow?: boolean;
    recast?: boolean;
    comment?: boolean;
  };
  mint_nft?: boolean;
};

type Task = {
  id: string;
  title: string;
  description: string;
  reward: string; // Static reward text
  type: "daily" | "one-time" | "verified" | "manual" | "referral" | "locked";
  completed: boolean;
  buttonText: string;
  locked?: boolean;
  verificationRequired?: boolean;
  referralCount?: number;
};

const FARFISH_FID = "694e9098c63ad876c908143e"; // Farfish Farcaster ID
const FARFISH_CAST_HASH = "0x1234567890abcdef"; // Example cast hash for like/recast

export default function SteamPage() {
  const { address } = useAccount();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskProgress, setTaskProgress] = useState<TaskProgress>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState<string>("");

  useFarcasterEnvironment("Steam page");

  // Initialize tasks
  const initializeTasks = useCallback((progress: TaskProgress) => {
    const now = new Date();
    const today = now.toDateString();
    const lastCheckin = progress.daily_checkin?.last;
    const canCheckin = !lastCheckin || new Date(lastCheckin).toDateString() !== today;

    // Get referral count from existing referral KV (read-only)
    const referralCount = progress.referrals || 0;

    const taskList: Task[] = [
      // 1️⃣ Daily Check-in
      {
        id: "daily_checkin",
        title: "Daily Check-in",
        description: "Claim your daily reward snapshot",
        reward: "10 FRH",
        type: "daily",
        completed: !canCheckin,
        buttonText: canCheckin ? "Claim" : "Completed",
      },
      
      // 2️⃣ Referral Tasks (moved from Profile page)
      {
        id: "referral_1",
        title: "First Referral",
        description: "Invite your first friend to FarFISH",
        reward: "100 FRH",
        type: "referral",
        completed: referralCount >= 1,
        buttonText: referralCount >= 1 ? "Completed" : `Share Link (${referralCount}/1)`,
        referralCount,
      },
      {
        id: "referral_5",
        title: "5 Referrals",
        description: "Invite 5 friends to FarFISH",
        reward: "500 FRH",
        type: "referral",
        completed: referralCount >= 5,
        buttonText: referralCount >= 5 ? "Completed" : `Share Link (${referralCount}/5)`,
        referralCount,
      },
      {
        id: "referral_10",
        title: "10 Referrals",
        description: "Build a network of 10 friends",
        reward: "1000 FRH",
        type: "referral",
        completed: referralCount >= 10,
        buttonText: referralCount >= 10 ? "Completed" : `Share Link (${referralCount}/10)`,
        referralCount,
      },
      
      // 3️⃣ Farcaster Tasks
      {
        id: "fc_follow",
        title: "Follow FarFISH",
        description: "Follow @farfish on Farcaster",
        reward: "25 FRH",
        type: "verified",
        completed: !!progress.fc?.follow,
        buttonText: progress.fc?.follow ? "Completed" : "Verify",
        verificationRequired: true,
      },
      {
        id: "fc_recast",
        title: "Like & Recast FarFISH post",
        description: "Like and recast the FarFISH announcement",
        reward: "30 FRH",
        type: "verified",
        completed: !!progress.fc?.recast,
        buttonText: progress.fc?.recast ? "Completed" : "Verify",
        verificationRequired: true,
      },
      {
        id: "fc_comment",
        title: "Comment on FarFISH post",
        description: "Comment on the FarFISH announcement",
        reward: "35 FRH",
        type: "manual",
        completed: !!progress.fc?.comment,
        buttonText: progress.fc?.comment ? "Completed" : "Check",
      },
      
      // 4️⃣ Base App Tasks
      {
        id: "base_follow",
        title: "Follow FarFISH",
        description: "Follow FarFISH on Base social app",
        reward: "20 FRH",
        type: "manual",
        completed: !!progress.base?.follow,
        buttonText: progress.base?.follow ? "Completed" : "Check",
      },
      {
        id: "base_recast",
        title: "Like & Recast",
        description: "Like FarFISH post on Base app",
        reward: "25 FRH",
        type: "manual",
        completed: !!progress.base?.recast,
        buttonText: progress.base?.recast ? "Completed" : "Check",
      },
      {
        id: "base_comment",
        title: "Comment",
        description: "Comment on FarFISH Base post",
        reward: "30 FRH",
        type: "manual",
        completed: !!progress.base?.comment,
        buttonText: progress.base?.comment ? "Completed" : "Check",
      },
      
      // 5️⃣ NFT Mint Task (LAST in the list)
      {
        id: "mint_nft",
        title: "NFT Mint Task",
        description: "Mint a FarFISH NFT to unlock premium features",
        reward: "200 FRH",
        type: "locked",
        completed: !!progress.mint_nft,
        buttonText: progress.mint_nft ? "Completed" : "Verify",
        locked: !progress.mint_nft,
        verificationRequired: true,
      },
    ];

    setTasks(taskList);
  }, []);

  // Fetch task progress from KV
  const fetchTaskProgress = useCallback(async () => {
    if (!address) {
      setTaskProgress({});
      setTasks([]);
      setReferralLink("");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/steam/progress?wallet=${address}`, {
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        const progress = data.progress || {};
        
        // Get referral count from existing referral system (read-only)
        if (data.referralCount !== undefined) {
          progress.referrals = data.referralCount;
        }
        
        setTaskProgress(progress);
        initializeTasks(progress);
      } else {
        // Initialize with empty progress
        setTaskProgress({});
        initializeTasks({});
      }

      // Fetch referral link from existing API
      try {
        const refRes = await fetch(`/api/referral/link?user=${address}`, {
          headers: { "x-user-wallet": address },
          cache: "no-store",
        });
        if (refRes.ok) {
          const refData = await refRes.json();
          setReferralLink(refData.link || "");
        }
      } catch (error) {
        console.error("Failed to fetch referral link:", error);
        // Generate fallback link
        const refCode = address.slice(-8).toLowerCase();
        setReferralLink(`https://farcaster.xyz/miniapps/DfVmB6jF12Ca/farfish?ref=${refCode}`);
      }
    } catch (error) {
      console.error("Failed to fetch task progress:", error);
      setTaskProgress({});
      initializeTasks({});
    } finally {
      setLoading(false);
    }
  }, [address, initializeTasks]);

  // Handle task completion
  const handleTaskAction = async (taskId: string) => {
    if (!address || verifying) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.completed) return;

    // Handle referral tasks (copy referral link)
    if (task.type === "referral") {
      if (!referralLink) {
        setToast({ type: "error", message: "Referral link not available yet" });
        return;
      }
      
      try {
        await navigator.clipboard.writeText(referralLink);
        setToast({ type: "success", message: "Referral link copied! Share with friends to earn rewards." });
      } catch (error) {
        console.error("Failed to copy referral link:", error);
        setToast({ type: "error", message: "Unable to copy link. Please try again." });
      }
      return;
    }

    if (task.verificationRequired) {
      setVerifying(taskId);
      try {
        const res = await fetch("/api/steam/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: address, taskId }),
        });

        const data = await res.json();
        if (data.success) {
          setToast({ type: "success", message: `${task.title} verified!` });
          await fetchTaskProgress(); // Refresh progress
        } else {
          setToast({ type: "error", message: data.error || "Verification failed" });
        }
      } catch (error) {
        console.error("Verification failed:", error);
        setToast({ type: "error", message: "Verification failed. Please try again." });
      } finally {
        setVerifying(null);
      }
    } else {
      // Non-verified task completion (manual verify or daily tasks)
      try {
        const res = await fetch("/api/steam/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: address, taskId }),
        });

        const data = await res.json();
        if (data.success) {
          setToast({ type: "success", message: `${task.title} completed!` });
          await fetchTaskProgress(); // Refresh progress
        } else {
          setToast({ type: "error", message: data.error || "Task completion failed" });
        }
      } catch (error) {
        console.error("Task completion failed:", error);
        setToast({ type: "error", message: "Task completion failed. Please try again." });
      }
    }
  };

  useEffect(() => {
    fetchTaskProgress();
  }, [fetchTaskProgress]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const completedTasks = tasks.filter(t => t.completed).length;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header title="Steam" />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm font-medium ${
          toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
        }`}>
          {toast.message}
        </div>
      )}

      <div className="mt-4 flex-1 flex flex-col space-y-4">
        {!address ? (
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            <h2 className="text-xl font-bold text-white mb-2">Connect Wallet</h2>
            <p className="text-white/70 mb-4">
              Connect your wallet to view and complete tasks
            </p>
            <div className="text-sm text-white/50">
              Use the wallet connection in your profile or home page
            </div>
          </section>
        ) : (
          <>
            {/* Progress Summary */}
            <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-[#00d4c4] to-[#80ffd1] bg-clip-text text-transparent">
                    Task Progress
                  </h2>
                  <p className="text-sm text-white/70">
                    Complete tasks to earn FRH rewards
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{completedTasks}/{tasks.length}</div>
                  <div className="text-sm text-white/70">Tasks Done</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70">Tasks Available:</span>
                <span className="font-bold text-[#00d4c4]">{tasks.length} Tasks</span>
              </div>
            </section>

            {/* Task List */}
            <section className="space-y-3">
              {loading ? (
                <div className="text-center py-8 text-white/60">
                  <div className="animate-spin w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full mx-auto mb-2"></div>
                  Loading tasks...
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`bg-white/5 border border-white/10 rounded-2xl p-4 transition-all duration-200 ${
                      task.completed ? "opacity-75" : "hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">{task.title}</h3>
                          {task.type === "daily" && (
                            <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded-full">
                              Daily
                            </span>
                          )}
                          {task.type === "verified" && (
                            <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-300 rounded-full">
                              Auto-Verify
                            </span>
                          )}
                          {task.type === "manual" && (
                            <span className="px-2 py-0.5 text-xs bg-orange-500/20 text-orange-300 rounded-full">
                              Manual
                            </span>
                          )}
                          {task.type === "referral" && (
                            <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded-full">
                              Referral {task.referralCount || 0}
                            </span>
                          )}
                          {task.locked && (
                            <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-300 rounded-full">
                              Optional
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white/70 mb-2">{task.description}</p>
                        <div className="text-sm font-medium text-[#00d4c4]">
                          {task.reward}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleTaskAction(task.id)}
                        disabled={task.completed || verifying === task.id}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                          task.completed
                            ? "bg-green-500/20 text-green-300 cursor-not-allowed"
                            : verifying === task.id
                            ? "bg-white/10 text-white/50 cursor-not-allowed"
                            : "bg-gradient-to-r from-[#00d4c4] to-[#80ffd1] text-white hover:shadow-lg hover:scale-105"
                        }`}
                      >
                        {verifying === task.id ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"></div>
                            Verifying...
                          </div>
                        ) : (
                          task.buttonText
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </section>

            {/* Info Section */}
            <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <h3 className="font-semibold text-white mb-2">How it works</h3>
              <ul className="text-sm text-white/70 space-y-1">
                <li>• Complete tasks to earn FRH rewards</li>
                <li>• Daily tasks reset every 24 hours</li>
                <li>• Verified tasks require external validation</li>
                <li>• Your rank is based on referral count only</li>
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}