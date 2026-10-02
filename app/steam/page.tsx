"use client";

import React, { useEffect, useState, useCallback } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useReadContract } from "wagmi";
import { formatEther } from "viem";
import Header from "../components/Header";
import useUserStakes from "../hooks/useUserStakes";
import { NFT_CONTRACT_ADDRESS } from "../constants";
import nftAbi from "../abi/nftDrop.json";

type TaskStatus = "not_started" | "verified";

type Task = {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: "daily" | "farcaster" | "referral" | "referral_milestone" | "nft" | "miniapp";
  status: TaskStatus;
  target?: number; // For referral milestones
};

type VerificationState =
  | "loading"
  | "verifying"
  | "success"
  | "error"
  | "no_fid";

const TASKS: Omit<Task, "status">[] = [
  {
    id: "daily_checkin",
    title: "Fishing",
    description: "Claim your daily reward",
    reward: 10,
    type: "daily",
  },
  {
    id: "add_miniapp",
    title: "Add FarFISH App",
    description: "Add the app to unlock rewards",
    reward: 40,
    type: "miniapp",
  },
  {
    id: "fc_follow",
    title: "Follow FarFISH",
    description: "Follow the official FarFISH account",
    reward: 50,
    type: "farcaster",
  },
  {
    id: "fc_like_recast",
    title: "Like & Recast Post",
    description: "Like and recast the FarFISH announcement",
    reward: 25,
    type: "farcaster",
  },
  {
    id: "fc_comment",
    title: "Comment on Post",
    description: "Leave a comment on the FarFISH announcement",
    reward: 25,
    type: "farcaster",
  },
  {
    id: "referral",
    title: "Referral Rewards",
    description: "Earn 40 FRH per user you refer",
    reward: 40,
    type: "referral",
  },
  {
    id: "referral_milestone_5",
    title: "5 Referrals Milestone",
    description: "Bonus reward for referring 5 users",
    reward: 200,
    type: "referral_milestone",
    target: 5,
  },
  {
    id: "referral_milestone_10",
    title: "10 Referrals Milestone",
    description: "Bonus reward for referring 10 users",
    reward: 400,
    type: "referral_milestone",
    target: 10,
  },
  {
    id: "referral_milestone_30",
    title: "30 Referrals Milestone",
    description: "Bonus reward for referring 30 users",
    reward: 1200,
    type: "referral_milestone",
    target: 30,
  },
  {
    id: "referral_milestone_50",
    title: "50 Referrals Milestone",
    description: "Bonus reward for referring 50 users",
    reward: 2000,
    type: "referral_milestone",
    target: 50,
  },
  {
    id: "nft_mint",
    title: "Mint FarFISH",
    description: "Mint or stake a FarFISH NFT",
    reward: 2500,
    type: "nft",
  },
];

const REFERRAL_MILESTONES = [
  { count: 5, reward: "TBD" },
  { count: 10, reward: "TBD" },
  { count: 30, reward: "TBD" },
  { count: 50, reward: "TBD" },
];

function VerifyModal({ 
  isOpen, 
  onClose, 
  taskId, 
  taskTitle,
  onSuccess,
  wallet
}: { 
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
  onSuccess: () => void;
  wallet?: string;
}) {
  const [state, setState] = useState<VerificationState>("loading");
  const [message, setMessage] = useState("");
  const [fid, setFid] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const init = async () => {
      setState("loading");
      setMessage("Initializing...");

      try {
        sdk.actions.ready();
      } catch {}

      if (!taskId) {
        setState("error");
        setMessage("Missing task ID");
        return;
      }

      if (!wallet) {
        setState("error");
        setMessage("Wallet not connected");
        return;
      }

      try {
        const context = await sdk.context;

        if (!context?.user?.fid) {
          setState("no_fid");
          setMessage("Please open this inside the social platform app.");
          return;
        }

        const userFid = context.user.fid;
        setFid(userFid);

        console.log("[STEAM] FID obtained for verification:", { taskId, walletAddress: wallet, fid: userFid });

        await verifyTask(userFid, wallet);
      } catch {
        setState("no_fid");
        setMessage("Please open this inside the social platform app.");
      }
    };

    init();
  }, [isOpen, taskId]);

  const verifyTask = async (userFid: number, userWallet: string) => {
    setState("verifying");
    setMessage("Verifying your social activity...");

    try {
      const res = await fetch("/api/farcaster/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid: userFid,
          taskId,
          wallet: userWallet,
        }),
      });

      const data = await res.json();

      if (res.ok && data.verified) {
        setState("success");
        setMessage("Task verified successfully!");

        setTimeout(() => {
          onSuccess();
          onClose();
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

  const getTaskText = () => {
    return "Complete task";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <div className="max-w-md w-full bg-gradient-to-br from-slate-800/90 to-slate-700/90 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          FarFISH Verification
        </h2>
        <p className="text-purple-200 mb-6">{getTaskText()}</p>

        <p className="text-white mb-6">{message}</p>

        {fid && (
          <p className="text-purple-300 text-sm mb-4">
            Verifying for FID: {fid}
          </p>
        )}

        {state === "loading" && (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        )}

        {state === "verifying" && (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
        )}

        {state === "success" && (
          <div className="text-green-400 text-4xl mb-4">✓</div>
        )}

        {state === "error" && (
          <div className="text-red-400 text-4xl mb-4">✗</div>
        )}

        {(state === "no_fid" || state === "error") && (
          <button
            onClick={onClose}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}

export default function SteamPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [fishingCooldown, setFishingCooldown] = useState(0); // Cooldown in seconds
  const { address: wallet } = useAccount();
  const { activeStakes } = useUserStakes();
  const [referralData, setReferralData] = useState({ count: 0, rewards: 0 });
  
  // Countdown effect for fishing cooldown
  useEffect(() => {
    if (fishingCooldown <= 0) return;
    
    const interval = setInterval(() => {
      setFishingCooldown(prev => {
        if (prev <= 1) {
          // Cooldown finished, refresh task status
          fetchTaskStatuses();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [fishingCooldown]);

  // Helper function to format cooldown time
  const formatCooldownTime = (seconds: number): string => {
    if (seconds <= 0) return "Available";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };
  const [verifyModal, setVerifyModal] = useState<{
    isOpen: boolean;
    taskId: string;
    taskTitle: string;
  }>({
    isOpen: false,
    taskId: "",
    taskTitle: "",
  });

  // Debug log when page mounts
  useEffect(() => {
    console.log("[STEAM] Page mounted");
  }, []);

  // Debug log when wallet is detected
  useEffect(() => {
    if (wallet) {
      console.log("[STEAM] Wallet address:", wallet);
    }
  }, [wallet]);

  // NFT balance check
  const { data: nftBalance } = useReadContract({
    address: NFT_CONTRACT_ADDRESS as `0x${string}`,
    abi: nftAbi,
    functionName: "balanceOf",
    args: wallet ? [wallet, 0] : undefined, // Check token ID 0 as example
    query: { enabled: Boolean(wallet && NFT_CONTRACT_ADDRESS) },
  });

  const fetchReferralData = useCallback(async () => {
    if (!wallet) return;
    
    try {
      const response = await fetch(`/api/leaderboard/user?wallet=${wallet}`);
      if (response.ok) {
        const data = await response.json();
        const referralCount = data.referrals_count || 0;
        
        console.log("[STEAM] Referral count:", referralCount);
        
        setReferralData({
          count: referralCount,
          rewards: data.rewards || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch referral data:', error);
    }
  }, [wallet]);

  const fetchTaskStatuses = useCallback(async () => {
    try {
      // Always load static tasks first
      const staticTasks = TASKS.map((task) => ({
        ...task,
        status: "not_started" as TaskStatus,
      }));

      console.log("[STEAM] Tasks loaded:", staticTasks);
      setTasks(staticTasks);

      if (!wallet) {
        // If no wallet connected, show all tasks as not started but still visible
        setLoading(false);
        return;
      }

      // Fetch task completion status from API
      const res = await fetch(`/api/steam/task-status?wallet=${wallet}`);
      const taskStatusData = await res.json();
      
      console.log("[STEAM] Task status response:", taskStatusData);

      // Set fishing cooldown from API response
      setFishingCooldown(taskStatusData.fishingCooldown || 0);

      const withStatus = TASKS.map((task) => {
        let status: TaskStatus = "not_started";

        if (task.type === "daily") {
          // Fishing task: "verified" means on cooldown, "not_started" means available
          const fishingOnCooldown = taskStatusData.tasks?.[task.id];
          status = fishingOnCooldown ? "verified" : "not_started";
        } else if (task.type === "farcaster") {
          // Social tasks completion from server
          status = taskStatusData.tasks?.[task.id] ? "verified" : "not_started";
        } else if (task.type === "miniapp") {
          // Miniapp task completion from server
          status = taskStatusData.tasks?.[task.id] ? "verified" : "not_started";
        } else if (task.type === "referral") {
          // Referral is always "verified" if user has referrals
          status = referralData.count > 0 ? "verified" : "not_started";
        } else if (task.type === "referral_milestone") {
          // Referral milestone: completed if referral count >= target
          status = referralData.count >= (task.target || 0) ? "verified" : "not_started";
        } else if (task.type === "nft") {
          // NFT task: completed if user owns NFT OR has active stakes
          const hasNFT = nftBalance && Number(nftBalance) > 0;
          const hasStake = activeStakes.length > 0;
          status = hasNFT || hasStake ? "verified" : "not_started";
        }

        return {
          ...task,
          status,
        };
      });

      console.log("[STEAM] Referral milestones:", withStatus.filter(t => t.type === "referral_milestone"));

      setTasks(withStatus);
    } catch (error) {
      console.error('Failed to fetch task statuses:', error);
      // Even on error, show static tasks
      setTasks(
        TASKS.map((task) => ({
          ...task,
          status: "not_started" as TaskStatus,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [wallet, nftBalance, activeStakes, referralData.count]);

  useEffect(() => {
    fetchTaskStatuses();
  }, [fetchTaskStatuses]); // Refetch when function changes

  useEffect(() => {
    fetchReferralData();
  }, [fetchReferralData]); // Fetch referral data when function changes

  const handleVerify = (taskId: string, taskTitle: string) => {
    const task = tasks.find(t => t.id === taskId);
    
    if (task?.type === "daily") {
      console.log("[STEAM] Verify clicked:", { taskId, walletAddress: wallet, fid: "not_required_for_daily" });
      handleDailyCheckin();
    }
    // Referral and NFT tasks don't need manual verification
  };

  const handleAddMiniApp = async () => {
    if (!wallet) return;

    try {
      await sdk.actions.addFrame();
      
      // Call the unified task completion API
      const response = await fetch('/api/steam/task/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: wallet,
          taskId: 'add_app',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Refresh task status to show completion
        fetchTaskStatuses();
      } else {
        console.error('Add app completion failed:', data.error);
      }
    } catch (error) {
      console.error("Add mini app failed:", error);
    }
  };

  const handleDailyCheckin = async () => {
    if (!wallet) return;

    try {
      // Call the unified task completion API
      const response = await fetch('/api/steam/task/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: wallet,
          taskId: 'fishing',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Refresh task status to reflect the completed check-in
        fetchTaskStatuses();
      } else if (response.status === 429) {
        // Cooldown active - update local cooldown state
        setFishingCooldown(data.cooldownRemaining || 0);
        console.log('Fishing on cooldown:', data.cooldownRemaining, 'seconds remaining');
      } else {
        console.error('Fishing check-in failed:', data.error);
      }
    } catch (error) {
      console.error('Fishing check-in error:', error);
    }
  };

  const handleVerifySuccess = () => {
    // Refresh task statuses after successful verification
    fetchTaskStatuses();
    fetchReferralData();
  };

  const handleCloseModal = () => {
    setVerifyModal({
      isOpen: false,
      taskId: "",
      taskTitle: "",
    });
  };

  const getSocialTaskUrl = (taskId: string) => {
    switch (taskId) {
      case "fc_follow":
        return "https://farcaster.xyz/farf";
      case "fc_like_recast":
        return "https://farcaster.xyz/farf/0xd8dccab8";
      case "fc_comment":
        return "https://farcaster.xyz/farf/0x7c1fc4bd";
      default:
        return "";
    }
  };

  const handleSocialTaskComplete = async (taskId: string) => {
    if (!wallet) return;

    try {
      // Map frontend task IDs to API task IDs
      const taskMapping: Record<string, string> = {
        "fc_follow": "follow",
        "fc_like_recast": "like_recast",
        "fc_comment": "comment"
      };

      const apiTaskId = taskMapping[taskId];
      if (!apiTaskId) return;

      const response = await fetch('/api/steam/task/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: wallet,
          taskId: apiTaskId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Refresh task status to reflect the completion
        fetchTaskStatuses();
      } else {
        console.error('Task completion failed:', data.error);
      }
    } catch (error) {
      console.error('Task completion error:', error);
    }
  };

  const handleReferralShare = async () => {
    if (!wallet) return;

    try {
      // Fetch user's referral link
      const response = await fetch(`/api/referral/link?user=${wallet}`);
      const data = await response.json();
      
      if (data.link) {
        const shareText = "Earn FRH token by completing simple tasks.\nDaily rewards, Referrals, On-chain progress.\nLock your position now...";
        
        await sdk.actions.composeCast({
          text: shareText,
          embeds: [data.link],
          close: false,
        });
      }
    } catch (error) {
      console.error("Referral share failed:", error);
    }
  };

  const completedTasks = tasks.filter(task => task.status === "verified").length;
  const totalTasks = tasks.length;
  const totalRewards = tasks
    .filter(task => task.status === "verified")
    .reduce((sum, task) => {
      if (task.type === "referral") {
        return sum + (referralData.count * task.reward);
      }
      return sum + task.reward;
    }, 0);

  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <Header title="Steam" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white/70">Loading tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title="Steam" />

      <div className="flex-1 space-y-6 mt-4">
        {/* Wallet Connection Notice */}
        {!wallet && (
          <div className="bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 backdrop-blur-sm border border-yellow-400/30 rounded-2xl p-4">
            <div className="text-center">
              <p className="text-yellow-400 text-sm font-medium">
                Connect wallet to verify & earn rewards
              </p>
            </div>
          </div>
        )}

        {/* Task Progress Card */}
        <div className="bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-white/20 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Task Progress
              </h3>
              <p className="text-white/70 text-sm">Complete tasks to earn FRH rewards</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-cyan-400">
                {completedTasks}/{totalTasks}
              </div>
              <div className="text-xs text-white/80">Tasks Done</div>
            </div>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-white/80 mb-2">Total Earned:</p>
            <div className="text-lg font-bold text-cyan-400">
              {wallet ? totalRewards : 0} FRH
            </div>
          </div>
        </div>

        {/* Referral Milestones */}
        {wallet && referralData.count > 0 && (
          <div className="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-purple-500/10 backdrop-blur-sm border border-white/20 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
              Referral Milestones
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {REFERRAL_MILESTONES.map((milestone) => (
                <div
                  key={milestone.count}
                  className={`p-3 rounded-xl border ${
                    referralData.count >= milestone.count
                      ? "bg-green-500/20 border-green-400/30 text-green-400"
                      : "bg-slate-500/20 border-slate-400/30 text-slate-300"
                  }`}
                >
                  <div className="text-sm font-medium">{milestone.count} Referrals</div>
                  <div className="text-xs">{milestone.reward} FRH</div>
                </div>
              ))}
            </div>
            <p className="text-sm text-white/80 mt-3">
              Current: {referralData.count} referrals ({referralData.rewards} FRH earned)
            </p>
          </div>
        )}

        {/* Task List */}
        <div className="space-y-4">
          {tasks.map((task, index) => (
            <React.Fragment key={task.id}>
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2">
                      {task.title}
                    </h3>
                    <p className="text-white/70 text-sm mb-3">{task.description}</p>
                    
                    <div className="text-xs text-cyan-400 font-medium">
                      {task.type === "referral" && referralData.count > 0
                        ? `${referralData.count} × ${task.reward} = ${referralData.count * task.reward} FRH`
                        : `${task.reward} FRH`
                      }
                    </div>
                    
                    {task.type === "referral_milestone" && (
                      <div className="mt-2">
                        <div className="text-xs text-white/80 mb-1">
                          Progress: {Math.min(referralData.count, task.target || 0)} / {task.target}
                        </div>
                        <div className="w-full bg-slate-700/50 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.min(100, (referralData.count / (task.target || 1)) * 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    {task.status === "verified" && task.type === "daily" ? (
                      <div className="px-3 py-1 rounded-full bg-orange-500/20 border border-orange-400/30 text-orange-400 text-sm font-medium">
                        {formatCooldownTime(fishingCooldown)}
                      </div>
                    ) : task.status === "verified" ? (
                      <div className="px-3 py-1 rounded-full bg-green-500/20 border border-green-400/30 text-green-400 text-sm font-medium">
                        Completed
                      </div>
                    ) : (
                      <>
                        {task.type === "farcaster" ? (
                          <a
                            href={getSocialTaskUrl(task.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleSocialTaskComplete(task.id)}
                            className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors"
                          >
                            Open
                          </a>
                        ) : (
                          <div className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-400 text-sm font-medium">
                            {task.type === "daily" ? "Daily" : 
                             task.type === "miniapp" ? "Mini App" :
                             task.type === "referral" ? "Referral" : 
                             task.type === "referral_milestone" ? "Milestone" : "NFT"}
                          </div>
                        )}
                        {(task.type === "daily") && (
                          <button
                            onClick={() => handleVerify(task.id, task.title)}
                            disabled={!wallet || fishingCooldown > 0}
                            className={`
                              bg-gradient-to-r from-purple-500/20 to-pink-500/20 
                              hover:from-purple-500/30 hover:to-pink-500/30 
                              backdrop-blur-sm border border-white/20 text-white 
                              px-4 py-2 rounded-xl font-medium transition-all 
                              duration-300 hover:scale-105 text-sm
                              ${!wallet || fishingCooldown > 0
                                ? "opacity-50 cursor-not-allowed" 
                                : ""
                              }
                            `}
                          >
                            {fishingCooldown > 0 ? "On Cooldown" : "Check In"}
                          </button>
                        )}
                        {task.type === "miniapp" && (
                          <button
                            onClick={handleAddMiniApp}
                            disabled={!wallet}
                            className={`bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-xl font-medium transition-all duration-300 hover:scale-105 text-sm ${
                              !wallet ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                          >
                            Add FarFISH App
                          </button>
                        )}
                        {task.type === "referral" && (
                          <button
                            onClick={handleReferralShare}
                            disabled={!wallet}
                            className={`bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-xl font-medium transition-all duration-300 hover:scale-105 text-sm ${
                              !wallet ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                          >
                            Share now
                          </button>
                        )}
                        {task.type === "referral_milestone" && (
                          <div className="text-xs text-white/80 text-center">
                            {(task.status as TaskStatus) === "verified" 
                              ? "Completed" 
                              : `Progress (${Math.min(referralData.count, task.target || 0)}/${task.target})`
                            }
                          </div>
                        )}
                        {task.type === "nft" && (
                          <div className="text-xs text-white/80 text-center">
                            Mint or stake<br />FarFISH NFT
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Insert Referral Share Pad after Comment on Post task */}
              {task.id === "fc_comment" && (
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-2">
                        Share Referral Link
                      </h3>
                      <p className="text-white/70 text-sm mb-3">Invite friends using your referral link</p>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-400 text-sm font-medium">
                        Utility
                      </div>
                      <button
                        onClick={handleReferralShare}
                        disabled={!wallet}
                        className={`bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-xl font-medium transition-all duration-300 hover:scale-105 text-sm ${
                          !wallet ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        Share Now
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        {/* How it works */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="text-lg font-semibold mb-3 text-white">How it works:</h3>
          <div className="space-y-2 text-white/80">
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>Complete daily tasks to earn FRH rewards</span>
            </div>
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>Tasks complete instantly for smooth experience</span>
            </div>
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>Rewards are verified and distributed before token launch</span>
            </div>
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>Invalid activity is automatically filtered out</span>
            </div>
          </div>
        </div>
      </div>

      {/* Verify Modal */}
      <VerifyModal
        isOpen={verifyModal.isOpen}
        onClose={handleCloseModal}
        taskId={verifyModal.taskId}
        taskTitle={verifyModal.taskTitle}
        onSuccess={handleVerifySuccess}
        wallet={wallet}
      />
    </div>
  );
}
