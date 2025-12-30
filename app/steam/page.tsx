"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import Header from "../components/Header";
import useFarcasterEnvironment from "../hooks/useFarcasterEnvironment";

type ToastState = { type: "error" | "success"; message: string } | null;

type TaskProgress = {
  referrals?: number;
  tasks?: {
    fc_follow?: boolean;
    fc_like_recast?: boolean;
    fc_comment?: boolean;
    nft_mint?: boolean;
  };
  totalEarnedFRH?: number;
};

type Task = {
  id: string;
  title: string;
  description: string;
  reward: string;
  type: "auto-verify" | "manual" | "referral" | "optional";
  completed: boolean;
  buttonText: string;
  openUrl?: string;
  verificationRequired?: boolean;
  referralCount?: number;
  milestone?: number;
  showOpen?: boolean;
};

const FARFISH_FID = 694; // FarFISH Farcaster FID

export default function SteamPage() {
  const { address } = useAccount();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskProgress, setTaskProgress] = useState<TaskProgress>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState<string>("");
  const [totalFRH, setTotalFRH] = useState<number>(0);

  useFarcasterEnvironment("Steam page");

  // Calculate total FRH earned
  const calculateTotalFRH = useCallback((progress: TaskProgress, referralCount: number) => {
    let total = 0;
    
    // Task rewards
    if (progress.tasks?.fc_follow) total += 50;
    if (progress.tasks?.fc_like_recast) total += 25;
    if (progress.tasks?.fc_comment) total += 25;
    if (progress.tasks?.nft_mint) total += 2000;
    
    // Referral rewards
    total += referralCount * 40; // 40 FRH per referral
    
    // Referral milestones
    if (referralCount >= 5) total += 200;
    if (referralCount >= 10) total += 400;
    if (referralCount >= 30) total += 1200;
    if (referralCount >= 50) total += 2000;
    
    return total;
  }, []);

  // Initialize tasks
  const initializeTasks = useCallback((progress: TaskProgress, referralCount: number) => {
    const taskList: Task[] = [
      // 1️⃣ Farcaster Follow
      {
        id: "fc_follow",
        title: "Follow FarFISH on Farcaster",
        description: "Follow @farf on Farcaster",
        reward: "50 FRH",
        type: "auto-verify",
        completed: !!progress.tasks?.fc_follow,
        buttonText: progress.tasks?.fc_follow ? "Completed" : "Open",
        openUrl: "https://farcaster.xyz/farf",
        verificationRequired: true,
        showOpen: !progress.tasks?.fc_follow,
      },
      
      // 2️⃣ Like & Recast
      {
        id: "fc_like_recast",
        title: "Like & Recast FarFISH Post",
        description: "Like and recast the FarFISH announcement",
        reward: "25 FRH",
        type: "auto-verify",
        completed: !!progress.tasks?.fc_like_recast,
        buttonText: progress.tasks?.fc_like_recast ? "Completed" : "Open",
        openUrl: "https://farcaster.xyz/farf/0xd8dccab8",
        verificationRequired: true,
        showOpen: !progress.tasks?.fc_like_recast,
      },
      
      // 3️⃣ Comment
      {
        id: "fc_comment",
        title: "Comment on FarFISH Post",
        description: "Comment on the FarFISH announcement",
        reward: "25 FRH",
        type: "auto-verify",
        completed: !!progress.tasks?.fc_comment,
        buttonText: progress.tasks?.fc_comment ? "Completed" : "Open",
        openUrl: "https://farcaster.xyz/farf/0x7c1fc4bd",
        verificationRequired: true,
        showOpen: !progress.tasks?.fc_comment,
      },
      
      // REFERRAL MILESTONES
      {
        id: "referral_5",
        title: "5 Referrals Milestone",
        description: "Invite 5 friends to earn bonus reward",
        reward: "200 FRH",
        type: "referral",
        completed: referralCount >= 5,
        buttonText: referralCount >= 5 ? "Completed" : `Progress (${referralCount}/5)`,
        referralCount,
        milestone: 5,
      },
      {
        id: "referral_10",
        title: "10 Referrals Milestone",
        description: "Invite 10 friends to earn bonus reward",
        reward: "400 FRH",
        type: "referral",
        completed: referralCount >= 10,
        buttonText: referralCount >= 10 ? "Completed" : `Progress (${referralCount}/10)`,
        referralCount,
        milestone: 10,
      },
      {
        id: "referral_30",
        title: "30 Referrals Milestone",
        description: "Invite 30 friends to earn bonus reward",
        reward: "1200 FRH",
        type: "referral",
        completed: referralCount >= 30,
        buttonText: referralCount >= 30 ? "Completed" : `Progress (${referralCount}/30)`,
        referralCount,
        milestone: 30,
      },
      {
        id: "referral_50",
        title: "50 Referrals Milestone",
        description: "Invite 50 friends to earn bonus reward",
        reward: "2000 FRH",
        type: "referral",
        completed: referralCount >= 50,
        buttonText: referralCount >= 50 ? "Completed" : `Progress (${referralCount}/50)`,
        referralCount,
        milestone: 50,
      },
      {
        id: "referral_share",
        title: "Share Referral Link",
        description: `Earn 40 FRH per referral (${referralCount} earned)`,
        reward: `${referralCount * 40} FRH`,
        type: "referral",
        completed: false, // Always actionable
        buttonText: "Share Referral Link",
        referralCount,
      },
      
      // NFT TASK (OPTIONAL - HIGH VALUE)
      {
        id: "nft_mint",
        title: "FarFISH NFT Mint / Stake",
        description: "Mint or stake a FarFISH NFT for premium rewards",
        reward: "2000 FRH",
        type: "optional",
        completed: !!progress.tasks?.nft_mint,
        buttonText: progress.tasks?.nft_mint ? "Completed" : "Verify",
        verificationRequired: true,
      },
    ];

    setTasks(taskList);
    setTotalFRH(calculateTotalFRH(progress, referralCount));
  }, [calculateTotalFRH]);

  // Fetch task progress from KV
  const fetchTaskProgress = useCallback(async () => {
    // Always show tasks even without wallet connection
    if (!address) {
      const emptyProgress = {};
      setTaskProgress(emptyProgress);
      initializeTasks(emptyProgress, 0);
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
        const referralCount = data.referralCount || 0;
        
        setTaskProgress(progress);
        initializeTasks(progress, referralCount);
      } else {
        // Initialize with empty progress
        const emptyProgress = {};
        setTaskProgress(emptyProgress);
        initializeTasks(emptyProgress, 0);
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
      const emptyProgress = {};
      setTaskProgress(emptyProgress);
      initializeTasks(emptyProgress, 0);
    } finally {
      setLoading(false);
    }
  }, [address, initializeTasks]);

  // Handle task completion
  const handleTaskAction = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Handle "Open" actions for external URLs
    if (task.showOpen && task.openUrl && !task.completed) {
      window.open(task.openUrl, '_blank');
      setToast({ 
        type: "success", 
        message: `Opened ${task.title}. Complete the action and return to verify!` 
      });
      return;
    }

    // Require wallet connection for verification/claiming
    if (!address) {
      setToast({ type: "error", message: "Please connect your wallet to verify tasks" });
      return;
    }

    if (verifying || task.completed) return;

    // Handle referral share action
    if (task.id === "referral_share") {
      if (!referralLink) {
        setToast({ type: "error", message: "Referral link not available yet" });
        return;
      }
      
      try {
        await navigator.clipboard.writeText(referralLink);
        setToast({ type: "success", message: "Referral link copied! Share with friends to earn 40 FRH per referral." });
      } catch (error) {
        console.error("Failed to copy referral link:", error);
        setToast({ type: "error", message: "Unable to copy link. Please try again." });
      }
      return;
    }

    // Handle milestone referral tasks (just show progress)
    if (task.type === "referral" && task.milestone) {
      if (task.completed) return;
      setToast({ 
        type: "success", 
        message: `Keep sharing! You need ${task.milestone - (task.referralCount || 0)} more referrals for this milestone.` 
      });
      return;
    }

    // Handle verification tasks
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
          setToast({ type: "success", message: `${task.title} verified! Reward earned.` });
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
        {/* Header Section */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-[#00d4c4] to-[#80ffd1] bg-clip-text text-transparent">
                Steam
              </h2>
              <p className="text-sm text-white/70">
                Complete tasks to earn FRH rewards
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[#00d4c4]">{totalFRH} FRH</div>
              <div className="text-sm text-white/70">Total Earned</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/70">Progress:</span>
            <span className="font-bold text-white">{completedTasks}/{tasks.length} tasks completed</span>
          </div>
        </section>

        {/* Task List - Always visible */}
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
                      {task.type === "auto-verify" && (
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
                          Referral
                        </span>
                      )}
                      {task.type === "optional" && (
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
                    disabled={task.completed && task.type !== "referral"}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 min-w-[100px] ${
                      task.completed && task.type !== "referral"
                        ? "bg-green-500/20 text-green-300 cursor-not-allowed"
                        : verifying === task.id
                        ? "bg-white/10 text-white/50 cursor-not-allowed"
                        : task.showOpen && !task.completed
                        ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                        : task.type === "referral" && task.id === "referral_share"
                        ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                        : task.verificationRequired && !task.showOpen
                        ? "bg-gradient-to-r from-[#00d4c4] to-[#80ffd1] text-white hover:shadow-lg hover:scale-105"
                        : "bg-gradient-to-r from-[#00d4c4] to-[#80ffd1] text-white hover:shadow-lg hover:scale-105"
                    }`}
                  >
                    {verifying === task.id ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"></div>
                        Verifying...
                      </div>
                    ) : task.showOpen && !task.completed ? (
                      "Open"
                    ) : task.verificationRequired && !task.showOpen && !task.completed ? (
                      "Verify"
                    ) : (
                      task.buttonText
                    )}
                  </button>
                  
                  {/* Secondary Verify button for auto-verify tasks after opening */}
                  {task.showOpen && task.verificationRequired && !task.completed && (
                    <button
                      onClick={() => {
                        if (!address) {
                          setToast({ type: "error", message: "Please connect your wallet to verify tasks" });
                          return;
                        }
                        handleTaskAction(task.id);
                      }}
                      disabled={verifying === task.id}
                      className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-[#00d4c4] to-[#80ffd1] text-white hover:shadow-lg hover:scale-105 disabled:opacity-50"
                    >
                      {verifying === task.id ? "Verifying..." : "Verify"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </section>

        {/* Wallet Connection Notice - Only show when wallet not connected */}
        {!address && (
          <section className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <h3 className="font-semibold text-white mb-2">Connect Wallet to Verify Tasks</h3>
            <p className="text-sm text-white/70">
              You can view all tasks above, but wallet connection is required to verify completion and claim rewards.
            </p>
          </section>
        )}

        {/* Info Section */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="font-semibold text-white mb-2">How it works</h3>
          <ul className="text-sm text-white/70 space-y-1">
            <li>• Click "Open" buttons to complete tasks outside the app</li>
            <li>• Return and click "Verify" or "Check" to claim rewards</li>
            <li>• Auto-Verify tasks use Neynar API for instant verification</li>
            <li>• Manual tasks require you to confirm completion</li>
            <li>• Referral rewards: 40 FRH per friend + milestone bonuses</li>
            <li>• NFT task is optional but offers high rewards (2000 FRH)</li>
          </ul>
        </section>
      </div>
    </div>
  );
}