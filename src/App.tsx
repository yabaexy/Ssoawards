/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { supabase } from "./lib/supabase";
import type { DbTopic, UserPoints } from "./lib/supabase";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Trophy, 
  Cpu, 
  Code, 
  AlertTriangle, 
  Wallet, 
  ExternalLink, 
  RefreshCw,
  ChevronRight,
  ShieldAlert,
  Gamepad2,
  LayoutDashboard,
  Grid3X3,
  Square,
  Activity,
  User,
  Plus,
  CheckCircle2,
  Coins,
  TrendingUp,
  MessageSquare,
  Sparkles,
  BookOpen,
  Target,
  Shirt,
  Lock,
  Zap,
  ArrowRightLeft,
  Droplets,
  Menu,
  X,
  ArrowDown
} from "lucide-react";
import { generateCandidates, type Candidate } from "./lib/gemini";
import { connectWallet, voteForCandidate, WYDA_CONTRACT_ADDRESS, swapUSDTtoWYDA, addWYDALiquidity, getWYDABalance } from "./lib/web3";
import { cn } from "./lib/utils";

// Game Components
import Reversi from "./components/games/Reversi";
import ChessGame from "./components/games/Chess";
import Tetris from "./components/games/Tetris";
import Pong from "./components/games/Pong";
import Sonoban from "./components/games/Sonoban";


type ViewMode = 'awards' | 'arcade' | 'markets' | 'muse' | 'swap';
type GameType = 'reversi' | 'chess' | 'tetris' | 'pong' | 'sonoban';
type MuseSubTab = 'main' | 'quests' | 'archive' | 'defi';

const ADMIN_ADDRESSES = [
  '0xf44d876365611149ebc396def8edd18a83be91c0',
  '0x8Cda9D8b30272A102e0e05A1392A795c267F14Bf',
  '0x2E9Bff8Bf288ec3AB1Dc540B777f9b48276a6286'
].map(a => a.toLowerCase());

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('awards');
  const [activeGame, setActiveGame] = useState<GameType>('sonoban');
  const [gamesPlayed, setGamesPlayed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (viewMode === 'arcade') {
      setGamesPlayed(prev => {
        const next = new Set(prev);
        next.add(activeGame);
        if (next.size >= 3) {
          completeMission('play_games');
        }
        return next;
      });
    }
  }, [activeGame, viewMode]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [wydaBalance, setWydaBalance] = useState("0");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAdminEdit, setShowAdminEdit] = useState(false);

  const isAdmin = walletAddress ? ADMIN_ADDRESSES.includes(walletAddress.toLowerCase()) : false;

  // Markets State
  const [topics, setTopics] = useState<(DbTopic & { votes: any[] })[]>([]);
  const [ympPoints, setYmpPoints] = useState(0);
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: '', description: '', options: ['', ''] });
  const [swapAmount, setSwapAmount] = useState("10");

  // Muse State
  const [museData, setMuseData] = useState<UserPoints | null>(null);
  const [museSubTab, setMuseSubTab] = useState<MuseSubTab>('main');


const goToMission = (missionId: string) => {
  if (missionId === "play_games") {
    setViewMode("arcade");
    setMuseSubTab("main");
  } else if (missionId === "lp_provide") {
    setViewMode("swap");
    setMuseSubTab("defi");
  } else if (missionId === "market_vote") {
    setViewMode("markets");
    setMuseSubTab("quests");
  }
  setShowAdminEdit(false);
  setIsMobileMenuOpen(false);
};

  const fetchCandidates = async (targetYear: number) => {
  setLoading(true);
  setError(null);

  try {
    let query = supabase
      .from("candidates")
      .select("*")
      .eq("year", targetYear)
      .eq("archived", false);

    if (!isAdmin) {
      query = query.eq("is_published", true);
    }

    const { data, error } = await query;

    if (error) throw error;

    setCandidates(data ?? []);
  } catch (err: any) {
    console.error("Fetch error:", err);
    setError(`Failed to fetch candidates: ${err.message}`);
  } finally {
    setLoading(false);
  }
};

  const handleInitializeYear = async () => {
    if (!isAdmin || !walletAddress) return;
    setLoading(true);
    try {
      // Create 5 empty slots
      const emptySlots = Array.from({ length: 5 }).map((_, i) => ({
        name: "",
        story: "",
        reason: "",
        year: year,
        is_published: false,
        image_url: `https://picsum.photos/seed/empty-${year}-${i}/800/600`
      }));

      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emptySlots)
      });

      if (!res.ok) throw new Error("Failed to initialize year");
      
      setSuccess(`Initialized 5 empty slots for ${year}`);
      fetchCandidates(year);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopics = async () => {
    try {
      const res = await fetch('/api/topics');
      if (!res.ok) {
        const errorData = await res.json();
        if (errorData.error?.includes("Could not find the table")) {
          setError("Database tables are missing. Please run the SQL script in 'supabase_schema.sql'.");
        }
        throw new Error(errorData.error);
      }
      const data = await res.json();
      setTopics(data);
    } catch (err) {
      console.error("Failed to fetch topics", err);
    }
  };

const fetchPoints = async (address: string) => {
  try {
    const { data, error } = await supabase
      .from("user_points")
      .select("*")
      .eq("address", address)
      .maybeSingle();

    if (error) {
      setError(error.message);
      return;
    }

    if (!data) {
      setError("No user data found");
      return;
    }

    setYmpPoints(data.points ?? 0);
    setMuseData(data);

    const balance = await getWYDABalance(address);
    setWydaBalance(balance);

  } catch (err) {
    console.error(err);
    setError("fetchPoints failed");
  }
};

  useEffect(() => {
    if (viewMode === 'awards') fetchCandidates(year);
    if (viewMode === 'markets') fetchTopics();
  }, [year, viewMode, walletAddress]);

  useEffect(() => {
    if (walletAddress) fetchPoints(walletAddress);
  }, [walletAddress]);

  const handleConnect = async () => {
    try {
      const address = await connectWallet();
      setWalletAddress(address);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
    }
  };

  const handleSwap = async (amount: string) => {
    if (!walletAddress) return setError("Connect wallet first");
    setIsProcessing(true);
    try {
      await swapUSDTtoWYDA(amount);
      setSuccess(`Successfully swapped ${amount} USDT to WYDA!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddLP = async (amount: string) => {
    if (!walletAddress) return setError("Connect wallet first");
    setIsProcessing(true);
    try {
      await addWYDALiquidity(amount);
      setSuccess(`Successfully added ${amount} USDT worth of LP!`);
      completeMission('lp_provide');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateTopic = async () => {
    if (!walletAddress) return setError("Connect wallet to create topic");
    if (!newTopic.title || !newTopic.description) return setError("Fill all fields");
    
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTopic, creator_address: walletAddress })
      });
      if (!res.ok) throw new Error("Failed to create topic");
      setShowCreateTopic(false);
      setNewTopic({ title: '', description: '', options: ['', ''] });
      fetchTopics();
      setSuccess("Topic created successfully!");
      
      // Mission Check: Create Market Vote (simulated as creation for now)
      completeMission('market_vote');
    } catch (err: any) {
      setError(err.message);
    }
  };
  const updateCandidate = async (candidate: Candidate) => {
  try {
    const { error } = await supabase
      .from("candidates")
      .update({
        name: candidate.name,
        story: candidate.story,
        reason: candidate.reason,
        image_url: candidate.image_url,
        is_published: candidate.is_published
      })
      .eq("id", candidate.id);

    if (error) throw error;

    setSuccess("Candidate updated!");

    // 🔥 핵심: 다시 불러오기
    fetchCandidates(year);

  } catch (err: any) {
    setError(err.message);
  }
};

  const handleMarketVote = async (topicId: string, optionIndex: number) => {
    if (!walletAddress) return setError("Connect wallet to vote");
    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topicId, voter_address: walletAddress, option_index: optionIndex })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to vote");
      }
      fetchTopics();
      setSuccess("Vote cast successfully!");
      
      // Mission Check
      completeMission('market_vote');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const completeMission = async (missionId: string) => {
    if (!walletAddress || !museData) return;
    if (museData.completed_missions.includes(missionId)) return;

    const rewards: Record<string, number> = {
      'market_vote': 450,
      'lp_provide': 1200,
      'play_games': 700
    };

    const reward = rewards[missionId] || 0;
    const newPoints = ympPoints + reward;
    const newMissions = [...museData.completed_missions, missionId];

    try {
      const res = await fetch('/api/muse/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: walletAddress,
          points: newPoints,
          completed_missions: newMissions
        })
      });
      if (res.ok) {
        setYmpPoints(newPoints);
        setMuseData({ ...museData, points: newPoints, completed_missions: newMissions });
        setSuccess(`Mission Complete! +${reward} YMP`);
      }
    } catch (err) {
      console.error("Failed to update mission", err);
    }
  };

  const handleResolve = async (topicId: string, winnerIndex: number) => {
    try {
      const res = await fetch(`/api/topics/${topicId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner_index: winnerIndex })
      });
      if (!res.ok) throw new Error("Failed to resolve");
      fetchTopics();
      if (walletAddress) fetchPoints(walletAddress);
      setSuccess("Topic resolved and points awarded!");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateCandidate = async (id: string, updates: Partial<Candidate>) => {
    if (!walletAddress) return;
    try {
      const res = await fetch(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, adminAddress: walletAddress })
      });
      if (!res.ok) throw new Error("Failed to update candidate");
      setEditingCandidate(null);
      fetchCandidates(year);
      setSuccess("Candidate updated successfully!");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleVote = async (candidate: Candidate) => {
    if (!walletAddress) {
      setError("Please connect your wallet first.");
      return;
    }
    setVotingId(candidate.id);
    setError(null);
    setSuccess(null);
    try {
      await voteForCandidate(parseInt(candidate.id) - 1);
      setSuccess(`Successfully voted for ${candidate.name}! 10 Wyda sent.`);
    } catch (err: any) {
      console.error(err);
      setError(err.reason || err.message || "Transaction failed. Make sure you have Wyda tokens and BNB for gas on BSC.");
    } finally {
      setVotingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0] font-mono selection:bg-[#00ff00] selection:text-black">
      {/* Background Grid Effect */}
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      <header className="relative border-b border-[#333] p-4 md:p-6 flex justify-between items-center gap-4 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#00ff00] text-black rounded-sm">
              <Trophy size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tighter uppercase italic">Source One</h1>
              <p className="hidden md:block text-[10px] text-[#888] uppercase tracking-widest">The Darwin Awards for the Digital Age</p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-2 bg-[#111] p-1 border border-[#333] rounded-sm">
            {[
              { id: 'awards', name: 'Awards', icon: LayoutDashboard },
              { id: 'arcade', name: 'Arcade', icon: Gamepad2 },
              { id: 'markets', name: 'Markets', icon: TrendingUp },
              { id: 'muse', name: 'Muse', icon: Sparkles },
              { id: 'swap', name: 'Swap', icon: ArrowRightLeft },
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => {
                  setViewMode(item.id as ViewMode);
                  setShowAdminEdit(false);
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all",
                  viewMode === item.id && !showAdminEdit ? "bg-[#00ff00] text-black" : "text-[#888] hover:text-white"
                )}
              >
                <item.icon size={12} />
                {item.name}
              </button>
            ))}
            {isAdmin && (
              <button 
                onClick={() => {
                  setViewMode('awards');
                  setShowAdminEdit(true);
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all",
                  showAdminEdit ? "bg-red-600 text-white" : "text-red-500/70 hover:text-red-500"
                )}
              >
                <Code size={12} />
                Edit
              </button>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden sm:flex items-center gap-2">
            {walletAddress && (
              <>
                <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#00ff00]/30 px-3 py-1.5 rounded-sm">
                  <Coins size={14} className="text-[#00ff00]" />
                  <span className="text-[10px] md:text-xs font-bold text-[#00ff00]">{ympPoints} YMP</span>
                </div>
                <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#ff00ff]/30 px-3 py-1.5 rounded-sm">
                  <Zap size={14} className="text-[#ff00ff]" />
                  <span className="text-[10px] md:text-xs font-bold text-[#ff00ff]">{parseFloat(wydaBalance).toFixed(2)} WYDA</span>
                </div>
              </>
            )}
          </div>

          <div className="hidden md:block">
            {viewMode === 'awards' && (
              <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#333] px-3 py-1 rounded-sm">
                <span className="text-[10px] text-[#888] uppercase">Year:</span>
                <select 
                  value={year} 
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="bg-transparent border-none outline-none text-sm cursor-pointer"
                >
                  {[2026, 2025, 2024, 2023].map(y => (
                    <option key={y} value={y} className="bg-[#1a1a1a]">{y}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button 
            onClick={handleConnect}
            className={cn(
              "flex items-center gap-2 px-3 md:px-4 py-2 rounded-sm text-[10px] md:text-xs font-bold transition-all border",
              walletAddress 
                ? "bg-transparent border-[#00ff00] text-[#00ff00]" 
                : "bg-[#00ff00] text-black border-[#00ff00] hover:bg-transparent hover:text-[#00ff00]"
            )}
          >
            <Wallet size={14} />
            <span className="hidden sm:inline">{walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "CONNECT"}</span>
            <span className="sm:hidden">{walletAddress ? `${walletAddress.slice(0, 4)}...` : "CONNECT"}</span>
          </button>

          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-[#888] hover:text-white transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="absolute top-full left-0 right-0 bg-[#0a0a0a] border-b border-[#333] lg:hidden overflow-hidden z-50"
            >
              <div className="p-6 space-y-6">
                <nav className="flex flex-col gap-2">
                  {[
                    { id: 'awards', name: 'Awards', icon: LayoutDashboard },
                    { id: 'arcade', name: 'Arcade', icon: Gamepad2 },
                    { id: 'markets', name: 'Markets', icon: TrendingUp },
                    { id: 'muse', name: 'Muse', icon: Sparkles },
                    { id: 'swap', name: 'Swap', icon: ArrowRightLeft },
                  ].map(item => (
                    <button 
                      key={item.id}
                      onClick={() => {
                        setViewMode(item.id as ViewMode);
                        setShowAdminEdit(false);
                        setIsMobileMenuOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-4 px-4 py-4 text-sm font-bold uppercase tracking-widest transition-all border border-[#333] rounded-sm",
                        viewMode === item.id && !showAdminEdit ? "bg-[#00ff00] text-black border-[#00ff00]" : "text-[#888] hover:text-white"
                      )}
                    >
                      <item.icon size={18} />
                      {item.name}
                    </button>
                  ))}
                  {isAdmin && (
                    <button 
                      onClick={() => {
                        setViewMode('awards');
                        setShowAdminEdit(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-4 px-4 py-4 text-sm font-bold uppercase tracking-widest transition-all border border-red-500/30 rounded-sm",
                        showAdminEdit ? "bg-red-600 text-white border-red-600" : "text-red-500 hover:bg-red-500/10"
                      )}
                    >
                      <Code size={18} />
                      Admin Edit
                    </button>
                  )}
                </nav>

                {walletAddress && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1 p-4 bg-[#111] border border-[#333] rounded-sm">
                      <span className="text-[10px] text-[#555] uppercase font-bold">YMP Points</span>
                      <div className="flex items-center gap-2">
                        <Coins size={14} className="text-[#00ff00]" />
                        <span className="text-lg font-black text-[#00ff00]">{ympPoints}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 p-4 bg-[#111] border border-[#333] rounded-sm">
                      <span className="text-[10px] text-[#555] uppercase font-bold">WYDA Balance</span>
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-[#ff00ff]" />
                        <span className="text-lg font-black text-[#ff00ff]">{parseFloat(wydaBalance).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-[#111] border border-[#333] rounded-sm">
                  <span className="text-[10px] text-[#555] uppercase font-bold">Select Year</span>
                  <div className="flex items-center gap-2">
                    <select 
                      value={year} 
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="bg-transparent border-none outline-none text-sm font-bold cursor-pointer text-[#00ff00]"
                    >
                      {[2026, 2025, 2024, 2023].map(y => (
                        <option key={y} value={y} className="bg-[#1a1a1a]">{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-12 pb-24">
        {viewMode === 'awards' ? (
          <>
            {/* Hero Section */}
            <section className="space-y-4 py-12 border-b border-[#333]/50">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-2 py-1 bg-[#ff4444]/10 border border-[#ff4444]/30 text-[#ff4444] text-[10px] uppercase font-bold tracking-widest"
              >
                <ShieldAlert size={12} />
                Critical Stupidity Detected
              </motion.div>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-none uppercase">
                Celebrating the <span className="text-[#00ff00]">Source Code</span> of Human Error.
              </h2>
              <p className="max-w-2xl text-[#888] text-sm leading-relaxed">
                Every year, a significant number of people die due to corporate crime. While some are simply victims, there are also cases where perpetrators meet such demise. We cover the stories of those who are dying as perpetrators.
              </p>
            </section>

            {/* Notifications */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-4 bg-[#ff4444]/10 border border-[#ff4444] text-[#ff4444] text-xs flex items-center gap-3"
                >
                  <AlertTriangle size={16} />
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-4 bg-[#00ff00]/10 border border-[#00ff00] text-[#00ff00] text-xs flex items-center gap-3"
                >
                  <Trophy size={16} />
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Candidates List */}
            <div className="grid gap-8">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
                  <RefreshCw size={48} className="animate-spin text-[#00ff00]" />
                  <p className="text-[10px] uppercase tracking-widest">Compiling Candidates...</p>
                </div>
              ) : candidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 border border-dashed border-[#333] gap-6">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-[#555] uppercase font-bold tracking-widest">No candidates found for {year}</p>
                    <p className="text-[10px] text-[#333]">The digital gene pool is surprisingly quiet this year.</p>
                  </div>
                  {isAdmin && (
                    <button 
                      onClick={handleInitializeYear}
                      className="px-8 py-3 bg-[#00ff00] text-black text-xs font-black uppercase tracking-widest hover:bg-white transition-all border border-[#00ff00]"
                    >
                      Initialize 5 Empty Slots
                    </button>
                  )}
                </div>
              ) : (
                candidates
                  .filter(c => showAdminEdit ? !c.is_published : c.is_published || isAdmin)
                  .map((candidate, idx) => (
                    <motion.div 
                    key={candidate.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group relative grid md:grid-cols-[100px_1fr_200px] border border-[#333] hover:border-[#00ff00] transition-colors bg-[#0a0a0a]"
                  >
                    {/* ID Column */}
                    <div className="p-6 flex items-center justify-center border-b md:border-b-0 md:border-r border-[#333] group-hover:border-[#00ff00] transition-colors">
                      <span className="text-4xl font-black text-[#333] group-hover:text-[#00ff00] transition-colors">
                        0{candidate.id}
                      </span>
                    </div>

                    {/* Content Column */}
                    <div className="p-6 space-y-4">
                      {editingCandidate?.id === candidate.id ? (
                        <div className="space-y-4">
                          <input 
                            className="w-full bg-[#111] border border-[#333] p-2 text-sm text-white"
                            value={editingCandidate.name}
                            onChange={(e) => setEditingCandidate({...editingCandidate, name: e.target.value})}
                            placeholder="Candidate Name"
                          />
                          <textarea 
                            className="w-full bg-[#111] border border-[#333] p-2 text-sm text-white h-24"
                            value={editingCandidate.story}
                            onChange={(e) => setEditingCandidate({...editingCandidate, story: e.target.value})}
                            placeholder="Story"
                          />
                          <textarea 
                            className="w-full bg-[#111] border border-[#333] p-2 text-sm text-white h-16"
                            value={editingCandidate.reason}
                            onChange={(e) => setEditingCandidate({...editingCandidate, reason: e.target.value})}
                            placeholder="Reason"
                          />
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleUpdateCandidate(candidate.id, { 
                                name: editingCandidate.name, 
                                story: editingCandidate.story, 
                                reason: editingCandidate.reason 
                              })}
                              className="px-4 py-1 bg-[#00ff00] text-black text-[10px] font-bold uppercase"
                            >
                              Save Draft
                            </button>
                            <button 
                              onClick={() => setEditingCandidate(null)}
                              className="px-4 py-1 border border-[#333] text-[10px] font-bold uppercase"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {candidate.image_url && (
                            <div className="aspect-video w-full overflow-hidden border border-[#333] bg-[#111]">
                              <img 
                                src={candidate.image_url} 
                                alt={candidate.name} 
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                          <div className="space-y-1">
                            <div className="flex justify-between items-start">
                              <h3 className="text-xl font-bold uppercase tracking-tight group-hover:text-[#00ff00] transition-colors">
                                {candidate.name || "Empty Candidate Slot"}
                              </h3>
                              {isAdmin && (
                                <div className="flex gap-2">
                                  {!candidate.is_published && (
                                    <span className="text-[8px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-2 py-0.5 uppercase font-bold">Draft</span>
                                  )}
                                  <button 
                                    onClick={() => setEditingCandidate(candidate)}
                                    className="text-[10px] text-[#888] hover:text-[#00ff00] uppercase font-bold flex items-center gap-1"
                                  >
                                    <RefreshCw size={10} /> Edit
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-[#888] uppercase">
                              <Code size={12} />
                              <span>Class: Fatal Logic Error</span>
                              <span className="opacity-30">|</span>
                              <Cpu size={12} />
                              <span>Hardware: Compromised</span>
                            </div>
                          </div>
                          <p className="text-sm text-[#aaa] leading-relaxed">
                            {candidate.story || "This slot is currently empty. Admin can edit this content."}
                          </p>
                          <div className="p-3 bg-[#111] border-l-2 border-[#00ff00] text-[11px] italic text-[#888]">
                            <span className="text-[#00ff00] font-bold not-italic uppercase mr-2">Reason:</span>
                            {candidate.reason || "Awaiting admin input..."}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Action Column */}
                    <div className="p-6 flex flex-col justify-center gap-4 border-t md:border-t-0 md:border-l border-[#333] group-hover:border-[#00ff00] transition-colors bg-[#0f0f0f]">
                      {isAdmin && !candidate.is_published ? (
                        <button 
                          onClick={() => handleUpdateCandidate(candidate.id, { is_published: true })}
                          className="w-full py-3 bg-[#ff4444] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all border border-[#ff4444]"
                        >
                          Publish Now
                        </button>
                      ) : (
                        <>
                          <div className="text-center space-y-1">
                            <p className="text-[10px] text-[#888] uppercase tracking-widest">Vote Cost</p>
                            <p className="text-lg font-bold">10 WYDA</p>
                          </div>
                          <button 
                            onClick={() => handleVote(candidate)}
                            disabled={votingId !== null || !candidate.is_published}
                            className={cn(
                              "w-full py-3 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all",
                              votingId === candidate.id || !candidate.is_published
                                ? "bg-[#333] text-[#888] cursor-not-allowed"
                                : "bg-[#00ff00] text-black hover:bg-black hover:text-[#00ff00] border border-[#00ff00]"
                            )}
                          >
                            {votingId === candidate.id ? (
                              <span className="flex items-center justify-center gap-2">
                                <RefreshCw size={12} className="animate-spin" />
                                Processing...
                              </span>
                            ) : (
                              "Cast Vote"
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </>
        ) : viewMode === 'arcade' ? (
          <div className="grid md:grid-cols-[250px_1fr] gap-8 py-8">
            {/* Arcade Sidebar */}
            <aside className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-[#888] uppercase tracking-widest px-2">Select Protocol</h3>
                <div className="grid gap-1">
                  {[
                    { id: 'sonoban', name: 'Sonoban', icon: User },
                    { id: 'tetris', name: 'Tetris', icon: Grid3X3 },
                    { id: 'pong', name: 'Pong', icon: Activity },
                    { id: 'reversi', name: 'Reversi', icon: Square },
                    { id: 'chess', name: 'Chess', icon: Trophy },
                  ].map(game => (
                    <button
                      key={game.id}
                      onClick={() => setActiveGame(game.id as GameType)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border",
                        activeGame === game.id 
                          ? "bg-[#00ff00] text-black border-[#00ff00]" 
                          : "bg-[#111] text-[#888] border-[#333] hover:border-[#555] hover:text-white"
                      )}
                    >
                      <game.icon size={14} />
                      {game.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-[#111] border border-[#333] rounded-sm space-y-2">
                <h4 className="text-[10px] font-bold text-[#00ff00] uppercase tracking-widest">Arcade Status</h4>
                <p className="text-[9px] text-[#555] leading-relaxed uppercase">
                  All games are simulated within the Source One environment. High scores are recorded locally.
                </p>
              </div>
            </aside>

            {/* Game Stage */}
            <section className="bg-[#0a0a0a] border border-[#333] p-8 flex items-center justify-center min-h-[600px] relative overflow-hidden">
               <AnimatePresence mode="wait">
                 <motion.div
                   key={activeGame}
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 1.05 }}
                   className="w-full h-full flex items-center justify-center"
                 >
                   {activeGame === 'reversi' && <Reversi />}
                   {activeGame === 'chess' && <ChessGame />}
                   {activeGame === 'tetris' && <Tetris />}
                   {activeGame === 'pong' && <Pong />}
                   {activeGame === 'sonoban' && <Sonoban />}
                 </motion.div>
               </AnimatePresence>
            </section>
          </div>
        ) : viewMode === 'markets' ? (
          <div className="space-y-8 py-8">
            <div className="flex justify-between items-center border-b border-[#333] pb-6">
              <div>
                <h2 className="text-3xl font-black tracking-tighter uppercase">Prediction Markets</h2>
                <p className="text-xs text-[#888] uppercase tracking-widest">Create topics, vote, and win 3800 YMP points.</p>
              </div>
              <button 
                onClick={() => setShowCreateTopic(!showCreateTopic)}
                className="flex items-center gap-2 bg-[#00ff00] text-black px-4 py-2 text-xs font-bold uppercase hover:bg-transparent hover:text-[#00ff00] border border-[#00ff00] transition-all"
              >
                <Plus size={16} />
                Create Topic
              </button>
            </div>

            {showCreateTopic && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-[#111] border border-[#00ff00]/30 rounded-sm space-y-4"
              >
                <div className="grid gap-4">
                  <input 
                    type="text" 
                    placeholder="Topic Title (e.g., Will Bitcoin hit $100k by May?)"
                    className="bg-black border border-[#333] p-3 text-sm outline-none focus:border-[#00ff00]"
                    value={newTopic.title}
                    onChange={e => setNewTopic({ ...newTopic, title: e.target.value })}
                  />
                  <textarea 
                    placeholder="Description and context..."
                    className="bg-black border border-[#333] p-3 text-sm outline-none focus:border-[#00ff00] min-h-[100px]"
                    value={newTopic.description}
                    onChange={e => setNewTopic({ ...newTopic, description: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    {newTopic.options.map((opt, i) => (
                      <input 
                        key={i}
                        type="text" 
                        placeholder={`Option ${i + 1}`}
                        className="bg-black border border-[#333] p-3 text-sm outline-none focus:border-[#00ff00]"
                        value={opt}
                        onChange={e => {
                          const opts = [...newTopic.options];
                          opts[i] = e.target.value;
                          setNewTopic({ ...newTopic, options: opts });
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-4">
                  <button onClick={() => setShowCreateTopic(false)} className="text-[10px] uppercase text-[#555] hover:text-white">Cancel</button>
                  <button 
                    onClick={handleCreateTopic}
                    className="bg-[#00ff00] text-black px-6 py-2 text-xs font-bold uppercase"
                  >
                    Launch Market
                  </button>
                </div>
              </motion.div>
            )}

            <div className="grid gap-6">
              {topics.map(topic => (
                <div key={topic.id} className={cn(
                  "p-6 border border-[#333] bg-[#0a0a0a] hover:border-[#555] transition-all space-y-4",
                  topic.status === 'resolved' && "opacity-60 border-[#00ff00]/20"
                )}>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold uppercase tracking-tight">{topic.title}</h3>
                        {topic.status === 'resolved' && (
                          <span className="bg-[#00ff00]/10 text-[#00ff00] text-[8px] px-2 py-0.5 border border-[#00ff00]/30 uppercase font-bold">Resolved</span>
                        )}
                      </div>
                      <p className="text-xs text-[#888]">{topic.description}</p>
                    </div>
                    <div className="text-[9px] text-[#444] uppercase text-right">
                      Creator: {topic.creator_address.slice(0, 6)}...{topic.creator_address.slice(-4)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {topic.options.map((option, idx) => {
                      const voteCount = topic.votes?.filter(v => v.option_index === idx).length || 0;
                      const totalVotes = topic.votes?.length || 1;
                      const percentage = Math.round((voteCount / totalVotes) * 100);
                      const isWinner = topic.status === 'resolved' && topic.winner_index === idx;

                      return (
                        <button
                          key={idx}
                          disabled={topic.status === 'resolved'}
                          onClick={() => handleMarketVote(topic.id, idx)}
                          className={cn(
                            "relative group p-4 border border-[#333] bg-[#111] text-left overflow-hidden transition-all",
                            topic.status === 'open' && "hover:border-[#00ff00]",
                            isWinner && "border-[#00ff00] bg-[#00ff00]/5"
                          )}
                        >
                          <div className="relative z-10 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase">{option}</span>
                              {isWinner && <CheckCircle2 size={12} className="text-[#00ff00]" />}
                            </div>
                            <span className="text-[10px] text-[#555] group-hover:text-[#00ff00]">{percentage}%</span>
                          </div>
                          <div 
                            className={cn(
                              "absolute bottom-0 left-0 h-0.5 bg-[#333] transition-all",
                              topic.status === 'open' && "group-hover:bg-[#00ff00]"
                            )} 
                            style={{ width: `${percentage}%` }}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {topic.status === 'open' && walletAddress?.toLowerCase() === topic.creator_address.toLowerCase() && (
                    <div className="pt-4 border-t border-[#333]/50 flex items-center justify-between">
                      <span className="text-[9px] text-[#555] uppercase">You are the creator. Resolve this market:</span>
                      <div className="flex gap-2">
                        {topic.options.map((_, idx) => (
                          <button 
                            key={idx}
                            onClick={() => handleResolve(topic.id, idx)}
                            className="text-[9px] border border-[#333] px-3 py-1 hover:border-[#00ff00] hover:text-[#00ff00] uppercase"
                          >
                            Winner: Option {idx + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : viewMode === 'swap' ? (
          <div className="max-w-md mx-auto py-12 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black tracking-tighter uppercase">WYDA Exchange</h2>
              <p className="text-xs text-[#888] uppercase tracking-widest">Swap USDT for WYDA or provide liquidity on ApeSwap.</p>
            </div>

            <div className="bg-[#111] border border-[#333] p-6 rounded-sm space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-bold text-[#555] uppercase">You Pay</label>
                  <span className="text-[10px] text-[#00ff00] font-bold">1 USDT = 763 WYDA</span>
                </div>
                <div className="relative">
                  <input 
                    type="number" 
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(e.target.value)}
                    className="w-full bg-black border border-[#333] p-4 text-xl font-bold outline-none focus:border-[#00ff00] transition-colors"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-xs font-bold text-[#888]">USDT</span>
                  </div>
                </div>

                <div className="flex justify-center -my-2 relative z-10">
                  <div className="p-1 bg-[#111] border border-[#333] rounded-full">
                    <ArrowDown size={14} className="text-[#555]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#555] uppercase">You Receive (Est.)</label>
                  <div className="p-4 bg-black/50 border border-[#333] flex justify-between items-center opacity-80">
                    <span className="text-xl font-bold text-[#00ff00]">
                      {(parseFloat(swapAmount || "0") * 763).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs font-bold text-[#888]">WYDA</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <button 
                  onClick={() => handleSwap(swapAmount)}
                  disabled={isProcessing}
                  className="w-full py-4 bg-[#00ff00] text-black font-black uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-3"
                >
                  {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : <ArrowRightLeft size={18} />}
                  Swap USDT to WYDA
                </button>
              </div>

              <div className="space-y-4 pt-6 border-t border-[#333]">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-bold text-[#555] uppercase tracking-widest">Quick LP Provision</h3>
                  <span className="text-[9px] text-[#888] uppercase">ApeSwap Router</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[50, 80, 100, 200].map(amt => (
                    <button 
                      key={amt}
                      onClick={() => handleAddLP(amt.toString())}
                      disabled={isProcessing}
                      className="flex items-center justify-between p-3 bg-black border border-[#333] hover:border-[#ff00ff] hover:bg-[#ff00ff]/5 transition-all group"
                    >
                      <div className="text-left">
                        <div className="text-[8px] text-[#555] font-bold uppercase group-hover:text-[#ff00ff]">Add LP</div>
                        <div className="text-sm font-bold group-hover:text-white">{amt} USDT</div>
                      </div>
                      <Plus size={14} className="text-[#333] group-hover:text-[#ff00ff]" />
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => handleAddLP(swapAmount)}
                  disabled={isProcessing}
                  className="w-full py-3 border border-[#ff00ff]/30 text-[#ff00ff]/70 text-[10px] font-bold uppercase tracking-widest hover:bg-[#ff00ff]/10 hover:text-[#ff00ff] transition-all flex items-center justify-center gap-2"
                >
                  <Droplets size={14} />
                  Custom LP: {swapAmount} USDT
                </button>
              </div>

              <div className="p-4 bg-black/50 border border-[#333] rounded-sm">
                <p className="text-[9px] text-[#555] leading-relaxed uppercase">
                  Transactions are processed via ApeSwap Router on BSC. Rate is estimated at 1 USDT = 763 WYDA. Ensure you have sufficient USDT and BNB for gas.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 py-8">
            {/* Muse Sub-Navigation */}
            <div className="flex gap-4 border-b border-[#333] pb-4">
              {[
                { id: 'main', name: 'My Muse', icon: User },
                { id: 'quests', name: 'Quests', icon: Target },
                { id: 'archive', name: 'Darwin Archive', icon: BookOpen },
                { id: 'defi', name: 'DeFi Ops', icon: ArrowRightLeft },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setMuseSubTab(tab.id as MuseSubTab)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all",
                    museSubTab === tab.id ? "text-[#00ff00] border-b-2 border-[#00ff00]" : "text-[#555] hover:text-white"
                  )}
                >
                  <tab.icon size={14} />
                  {tab.name}
                </button>
              ))}
            </div>

            {museSubTab === 'main' && (
              <div className="grid md:grid-cols-[1fr_300px] gap-12 items-center py-12">
                <div className="relative group">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative aspect-[3/4] max-w-md mx-auto overflow-hidden border-2 border-[#00ff00]/30 rounded-sm bg-[#111]"
                  >
                    <img 
                      src="https://ais-dev-qau7wudkrtj24cq2qgvekw-50569269219.asia-northeast1.run.app/api/assets/muse_base.png" 
                      alt="Muse" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        // Fallback if the direct URL doesn't work in preview
                        (e.target as HTMLImageElement).src = "https://picsum.photos/seed/muse/800/1200";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    
                    <div className="absolute bottom-8 left-8 right-8 space-y-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] text-[#00ff00] font-bold uppercase tracking-[0.2em]">Unsource One Muse</p>
                          <h3 className="text-4xl font-black tracking-tighter uppercase">Level {museData?.muse_level || 1}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-[#555] uppercase">Balance</p>
                          <p className="text-2xl font-bold text-[#00ff00]">{ympPoints} YMP</p>
                        </div>
                      </div>
                      <div className="h-1 w-full bg-[#333] rounded-full overflow-hidden">
                        <div className="h-full bg-[#00ff00] transition-all" style={{ width: '45%' }} />
                      </div>
                    </div>
                  </motion.div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#888] border-l-2 border-[#00ff00] pl-3">Today's Missions</h4>
                  <div className="grid gap-4">
                    {[
                      { id: 'market_vote', title: 'Market Participation', reward: 450, desc: 'Vote 2 times in Create Market' },
                      { id: 'lp_provide', title: 'Liquidity Provider', reward: 1200, desc: 'Provide $100+ WYDA-USDT LP' },
                      { id: 'play_games', title: 'Arcade Master', reward: 700, desc: 'Play 3+ mini-games' },
                    ].map(mission => (
                      <div key={mission.id} className={cn(
                        "p-4 border border-[#333] bg-[#0a0a0a] transition-all",
                        museData?.completed_missions.includes(mission.id) ? "border-[#00ff00]/50 opacity-50" : "hover:border-[#555]"
                      )}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-tight">{mission.title}</span>
                          <span className="text-[10px] text-[#00ff00] font-bold">+{mission.reward} YMP</span>
                        </div>
                        <p className="text-[10px] text-[#555] uppercase mb-3">{mission.desc}</p>
                        {museData?.completed_missions.includes(mission.id) ? (
                          <div className="flex items-center gap-2 text-[#00ff00] text-[9px] font-bold uppercase">
                            <CheckCircle2 size={12} />
                            Completed
                          </div>
                        ) : (
                          <button 
                            onClick={() => goToMission(mission.id)}
                            className="text-[9px] text-white underline uppercase hover:text-[#00ff00]"
                          >
                            Go to Mission
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {museSubTab === 'defi' && (
              <div className="space-y-12 py-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <ArrowRightLeft size={20} className="text-[#00ff00]" />
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Token Swap</h3>
                  </div>
                  <div className="p-8 border border-[#333] bg-[#0a0a0a] space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-[10px] text-[#888] uppercase">From</p>
                        <p className="text-xl font-bold">USDT</p>
                      </div>
                      <ArrowRightLeft className="text-[#555]" />
                      <div className="space-y-1 text-right">
                        <p className="text-[10px] text-[#888] uppercase">To</p>
                        <p className="text-xl font-bold">763 WYDA</p>

                      </div>
                    </div>
                    <button 
                      onClick={() => handleSwap("1")} // Example amount, user can adjust or we can add input
                      disabled={isProcessing}
                      className="w-full py-4 bg-[#00ff00] text-black font-black uppercase tracking-widest hover:bg-black hover:text-[#00ff00] border border-[#00ff00] transition-all disabled:opacity-50"
                    >
                      {isProcessing ? "Processing..." : "Swap USDT to WYDA"}
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Droplets size={20} className="text-[#00ff00]" />
                    <h3 className="text-2xl font-black uppercase tracking-tighter">ApeSwap Liquidity</h3>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[50, 80, 100, 200].map(amount => (
                      <div key={amount} className="p-6 border border-[#333] bg-[#0a0a0a] space-y-4 hover:border-[#00ff00] transition-all group">
                        <div className="flex justify-between items-center">
                          <span className="text-2xl font-black text-white group-hover:text-[#00ff00] transition-colors">${amount}</span>
                          <span className="text-[9px] text-[#555] uppercase font-bold">USDT + WYDA</span>
                        </div>
                        <p className="text-[9px] text-[#888] uppercase leading-relaxed">
                          Add liquidity to ApeSwap to earn YMP rewards and support the ecosystem.
                        </p>
                        <button 
                          onClick={() => handleAddLP(amount.toString())}
                          disabled={isProcessing}
                          className="w-full py-3 border border-[#333] text-[10px] font-bold uppercase tracking-widest hover:border-[#00ff00] hover:text-[#00ff00] transition-all disabled:opacity-50"
                        >
                          {isProcessing ? "Adding..." : `Add $${amount} LP`}
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-[#111] border-l-4 border-[#00ff00]">
                    <p className="text-[10px] text-[#888] uppercase leading-relaxed">
                      <span className="text-[#00ff00] font-bold">Note:</span> Adding LP requires both USDT and WYDA in your wallet. The app will automatically calculate and approve the required amounts.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {museSubTab === 'quests' && (
              <div className="space-y-12 py-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Zap size={20} className="text-[#00ff00]" />
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Daily Missions</h3>
                  </div>
                  <div className="grid md:grid-cols-3 gap-6">
                    {[
                      { id: 'market_vote', title: 'Market Vote', reward: 450, icon: TrendingUp },
                      { id: 'lp_provide', title: 'LP Provider', reward: 1200, icon: Coins },
                      { id: 'play_games', title: 'Game Play', reward: 700, icon: Gamepad2 },
                    ].map(q => (
                      <div key={q.id} className="p-6 border border-[#333] bg-[#0a0a0a] space-y-4">
                        <q.icon size={24} className="text-[#555]" />
                        <div>
                          <h4 className="text-sm font-bold uppercase">{q.title}</h4>
                          <p className="text-[10px] text-[#00ff00] font-bold">Reward: {q.reward} YMP</p>
                        </div>
                        <button 
                          onClick={() => goToMission(q.id)}
                          disabled={museData?.completed_missions.includes(q.id)}
                          className="w-full py-2 border border-[#333] text-[9px] uppercase font-bold hover:border-[#00ff00] disabled:opacity-30"
                        >
                          {museData?.completed_missions.includes(q.id)
                            ? 'Claimed'
                            : q.id === 'lp_provide'
                              ? 'Go to Swap'
                              : q.id === 'market_vote'
                                ? 'Go to Markets'
                                : 'Go to Arcade'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Trophy size={20} className="text-[#00ff00]" />
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Weekly Challenge</h3>
                  </div>
                  <div className="p-8 border-2 border-dashed border-[#333] bg-[#0a0a0a] flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="space-y-2">
                      <h4 className="text-lg font-bold uppercase">The Ultimate Muse Growth</h4>
                      <p className="text-xs text-[#555] max-w-md">
                        Complete 5+ Market participations + Provide 1,200+ WYDA LP this week.
                      </p>
                      <div className="flex gap-4 pt-4">
                        <div className="flex items-center gap-2 text-[#00ff00] text-[10px] font-bold uppercase">
                          <Coins size={14} /> 10,000 YMP
                        </div>
                        <div className="flex items-center gap-2 text-[#00ff00] text-[10px] font-bold uppercase">
                          <Shirt size={14} /> Special Outfit
                        </div>
                      </div>
                    </div>
                    <div className="w-full md:w-48 h-2 bg-[#111] rounded-full overflow-hidden">
                      <div className="h-full bg-[#00ff00] transition-all" style={{ width: '20%' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {museSubTab === 'archive' && (
              <div className="grid md:grid-cols-[1fr_350px] gap-12 py-8">
                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <ShieldAlert size={20} className="text-[#ff4444]" />
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Darwin Archive</h3>
                  </div>
                  <div className="grid gap-6">
                    {[
                      { name: 'Seo Se-won', crime: 'Unauthorized Business', lesson: 'Avoid unauthorized business ventures at all costs.', reward: '3,000 YMP + Badge' },
                      { name: 'Kim Ki-duk', crime: 'Exploitation', lesson: 'Never exploit others for your own gain.', reward: '4,000 YMP + Skin' },
                      { name: 'Stockton Rush', crime: 'Safety Neglect', lesson: 'Safety is not a luxury, it is a requirement.', reward: '5,000 YMP + Frame' },
                    ].map((item, i) => (
                      <div key={i} className="group p-6 border border-[#333] bg-[#0a0a0a] hover:border-[#ff4444]/50 transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="text-lg font-bold uppercase text-[#ff4444]">{item.name}</h4>
                          <span className="text-[9px] bg-[#ff4444]/10 text-[#ff4444] px-2 py-0.5 border border-[#ff4444]/30 uppercase font-bold">{item.crime}</span>
                        </div>
                        <p className="text-xs text-[#888] mb-4 italic">"{item.lesson}"</p>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-[#555] uppercase">Achievement Reward:</span>
                          <span className="text-[10px] text-[#00ff00] font-bold uppercase">{item.reward}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <Shirt size={20} className="text-[#00ff00]" />
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Customization</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: 'default', name: 'Default', unlocked: true },
                      { id: 'bronze', name: 'Bronze Skin', unlocked: false, cost: 5000 },
                      { id: 'silver', name: 'Silver Skin', unlocked: false, cost: 15000 },
                      { id: 'gold', name: 'Gold Skin', unlocked: false, cost: 50000 },
                    ].map(skin => (
                      <button 
                        key={skin.id}
                        className={cn(
                          "aspect-square border border-[#333] bg-[#111] p-4 flex flex-col items-center justify-center gap-2 transition-all",
                          skin.unlocked ? "hover:border-[#00ff00]" : "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {skin.unlocked ? <Shirt size={24} className="text-[#00ff00]" /> : <Lock size={24} className="text-[#444]" />}
                        <span className="text-[9px] font-bold uppercase">{skin.name}</span>
                        {!skin.unlocked && <span className="text-[8px] text-[#00ff00]">{skin.cost} YMP</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Info */}
        <footer className="pt-12 border-t border-[#333] grid md:grid-cols-2 gap-8 text-[10px] text-[#555] uppercase tracking-widest">
          <div className="space-y-4">
            <h4 className="text-[#888] font-bold">Protocol Information</h4>
            <p>
              Source One Awards is a decentralized parody protocol. 
              Voting requires the Wyda token on the Binance Smart Chain (BSC).
            </p>
            <div className="flex items-center gap-2">
              <span>Contract:</span>
              <a 
                href={`https://bscscan.com/token/${WYDA_CONTRACT_ADDRESS}`} 
                target="_blank" 
                rel="noreferrer"
                className="text-[#00ff00] hover:underline flex items-center gap-1"
              >
                {WYDA_CONTRACT_ADDRESS.slice(0, 10)}... <ExternalLink size={10} />
              </a>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-[#888] font-bold">Warning</h4>
            <p>
              Transactions are irreversible. Ensure you are connected to the Binance Smart Chain network in your wallet. 
              Gas fees apply in BNB.
            </p>
          </div>
        </footer>
      </main>

      {/* Floating Status Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-black border-t border-[#333] p-2 flex justify-between items-center text-[9px] uppercase tracking-[0.2em] text-[#444] z-50">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00ff00] animate-pulse"></div>
            System Online
          </span>
          <span className="hidden md:inline">|</span>
          <span className="hidden md:inline">Network: BSC Mainnet</span>
          <span className="hidden md:inline">|</span>
          <span className="hidden md:inline">Mode: {viewMode.toUpperCase()}</span>
        </div>
        <div>
          © {new Date().getFullYear()} Source One Awards // V1.1.0
        </div>
      </div>
    </div>
  );
}