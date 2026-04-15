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
  ShieldAlert
} from "lucide-react";
import { generateCandidates, type Candidate } from "./lib/gemini";
import { connectWallet, voteForCandidate, WYDA_CONTRACT_ADDRESS } from "./lib/web3";
import { cn } from "./lib/utils";

export default function App() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchCandidates = async (targetYear: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/candidates/${targetYear}`);
      if (!response.ok) throw new Error("Failed to fetch candidates");
      const data = await response.json();
      setCandidates(data);
    } catch (err) {
      setError("Failed to fetch candidates. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates(year);
  }, [year]);

  const handleConnect = async () => {
    try {
      const address = await connectWallet();
      setWalletAddress(address);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
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
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#00ff00] text-black rounded-sm">
            <Trophy size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tighter uppercase italic">Source One Awards</h1>
            <p className="text-[10px] text-[#888] uppercase tracking-widest">The Darwin Awards for the Digital Age</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
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
        </div>
        <div>
          © {new Date().getFullYear()} Source One Awards // V1.0.4
        </div>
      </div>
    </div>
  );
}
