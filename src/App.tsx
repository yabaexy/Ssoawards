/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  MessageSquare
} from "lucide-react";
import { generateCandidates, type Candidate } from "./lib/gemini";
import { connectWallet, voteForCandidate, WYDA_CONTRACT_ADDRESS } from "./lib/web3";
import { cn } from "./lib/utils";
import type { DbTopic } from "./lib/supabase";

// Game Components
import Reversi from "./components/games/Reversi";
import ChessGame from "./components/games/Chess";
import Tetris from "./components/games/Tetris";
import Pong from "./components/games/Pong";
import Sonoban from "./components/games/Sonoban";

type ViewMode = 'awards' | 'arcade' | 'markets';
type GameType = 'reversi' | 'chess' | 'tetris' | 'pong' | 'sonoban';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('awards');
  const [activeGame, setActiveGame] = useState<GameType>('sonoban');
  const [year, setYear] = useState(new Date().getFullYear());
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Markets State
  const [topics, setTopics] = useState<(DbTopic & { votes: any[] })[]>([]);
  const [ympPoints, setYmpPoints] = useState(0);
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: '', description: '', options: ['', ''] });

  const fetchCandidates = async (targetYear: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/candidates/${targetYear}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || "Failed to fetch candidates from database");
      }
      let data = await response.json();
      
      if (!data || data.length === 0) {
        console.log(`No candidates found for ${targetYear}, generating...`);
        data = await generateCandidates(targetYear);
        
        // Save to database for future use
        try {
          await fetch('/api/candidates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data.map((c: any) => ({
              name: c.name,
              story: c.story,
              reason: c.reason,
              year: c.year,
              image_url: c.image_url
            })))
          });
        } catch (saveErr) {
          console.error("Failed to save generated candidates:", saveErr);
        }
      }
      
      setCandidates(data);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(`Failed to fetch candidates: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopics = async () => {
    try {
      const res = await fetch('/api/topics');
      const data = await res.json();
      setTopics(data);
    } catch (err) {
      console.error("Failed to fetch topics", err);
    }
  };

  const fetchPoints = async (address: string) => {
    try {
      const res = await fetch(`/api/points/${address}`);
      const data = await res.json();
      setYmpPoints(data.points);
    } catch (err) {
      console.error("Failed to fetch points", err);
    }
  };

  useEffect(() => {
    if (viewMode === 'awards') fetchCandidates(year);
    if (viewMode === 'markets') fetchTopics();
  }, [year, viewMode]);

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
    } catch (err: any) {
      setError(err.message);
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

  const handleVote = async (candidate: Candidate) => {
    if (!walletAddress) {
      setError("Please connect your wallet first.");
      return;
    }
    setVotingId(candidate.id);
    setError(null);
    setSuccess(null);
    try {
      await voteForCandidate(candidate.id - 1);
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

      <header className="relative border-b border-[#333] p-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#00ff00] text-black rounded-sm">
              <Trophy size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tighter uppercase italic">Source One Awards</h1>
              <p className="text-[10px] text-[#888] uppercase tracking-widest">The Darwin Awards for the Digital Age</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-2 bg-[#111] p-1 border border-[#333] rounded-sm">
            <button 
              onClick={() => setViewMode('awards')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all",
                viewMode === 'awards' ? "bg-[#00ff00] text-black" : "text-[#888] hover:text-white"
              )}
            >
              <LayoutDashboard size={12} />
              Awards
            </button>
            <button 
              onClick={() => setViewMode('arcade')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all",
                viewMode === 'arcade' ? "bg-[#00ff00] text-black" : "text-[#888] hover:text-white"
              )}
            >
              <Gamepad2 size={12} />
              Arcade
            </button>
            <button 
              onClick={() => setViewMode('markets')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all",
                viewMode === 'markets' ? "bg-[#00ff00] text-black" : "text-[#888] hover:text-white"
              )}
            >
              <TrendingUp size={12} />
              Markets
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {walletAddress && (
            <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#00ff00]/30 px-3 py-1.5 rounded-sm">
              <Coins size={14} className="text-[#00ff00]" />
              <span className="text-xs font-bold text-[#00ff00]">{ympPoints} YMP</span>
            </div>
          )}
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

          <button 
            onClick={handleConnect}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-bold transition-all border",
              walletAddress 
                ? "bg-transparent border-[#00ff00] text-[#00ff00]" 
                : "bg-[#00ff00] text-black border-[#00ff00] hover:bg-transparent hover:text-[#00ff00]"
            )}
          >
            <Wallet size={14} />
            {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "CONNECT WALLET"}
          </button>
        </div>
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
                The Source One Awards honor those who have improved the human collective intelligence by removing themselves from the digital gene pool in spectacularly ill-advised technological ways.
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
              ) : (
                candidates.map((candidate, idx) => (
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
                        <h3 className="text-xl font-bold uppercase tracking-tight group-hover:text-[#00ff00] transition-colors">
                          {candidate.name}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] text-[#888] uppercase">
                          <Code size={12} />
                          <span>Class: Fatal Logic Error</span>
                          <span className="opacity-30">|</span>
                          <Cpu size={12} />
                          <span>Hardware: Compromised</span>
                        </div>
                      </div>
                      <p className="text-sm text-[#aaa] leading-relaxed">
                        {candidate.story}
                      </p>
                      <div className="p-3 bg-[#111] border-l-2 border-[#00ff00] text-[11px] italic text-[#888]">
                        <span className="text-[#00ff00] font-bold not-italic uppercase mr-2">Reason:</span>
                        {candidate.reason}
                      </div>
                    </div>

                    {/* Action Column */}
                    <div className="p-6 flex flex-col justify-center gap-4 border-t md:border-t-0 md:border-l border-[#333] group-hover:border-[#00ff00] transition-colors bg-[#0f0f0f]">
                      <div className="text-center space-y-1">
                        <p className="text-[10px] text-[#888] uppercase tracking-widest">Vote Cost</p>
                        <p className="text-lg font-bold">10 WYDA</p>
                      </div>
                      <button 
                        onClick={() => handleVote(candidate)}
                        disabled={votingId !== null}
                        className={cn(
                          "w-full py-3 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all",
                          votingId === candidate.id
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
        ) : (
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
