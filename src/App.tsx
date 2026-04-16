/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Ssoawards - Optimized for Vite + Supabase with Muse Integration
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Vite 환경 표준
import { 
  Trophy, Cpu, Code, AlertTriangle, Wallet, ExternalLink, RefreshCw,
  ChevronRight, ShieldAlert, Gamepad2, LayoutDashboard, Grid3X3,
  Square, Activity, User, Plus, CheckCircle2, Coins, TrendingUp,
  MessageSquare, Sparkles, BookOpen, Target, Shirt, Lock, Zap,
  ArrowRightLeft, Droplets, Menu, X, ArrowDown, ShoppingBag, Clock
} from "lucide-react";

// Supabase & Web3 (Vite 환경에 맞게 직접 호출)
import { supabase } from "./lib/supabase";
import { generateCandidates, type Candidate } from "./lib/gemini";
import { 
  connectWallet, voteForCandidate, WYDA_CONTRACT_ADDRESS, 
  swapUSDTtoWYDA, addWYDALiquidity, getWYDABalance, transferWYDA 
} from "./lib/web3";
import { cn } from "./lib/utils";

// 컴포넌트 임포트 (실제 경로에 맞게 유지)
import Reversi from "./components/games/Reversi";
import ChessGame from "./components/games/Chess";
import Tetris from "./components/games/Tetris";
import Pong from "./components/games/Pong";
import Sonoban from "./components/games/Sonoban";

// 타입 정의
type ViewMode = 'dashboard' | 'awards' | 'predictions' | 'swap' | 'games' | 'profile';
const ESCROW_ADDRESS = "0xYourEscrowWalletAddressHere"; // 실제 에스크로 주소 입력

export default function App() {
  // 앱 전역 상태
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [selectedListing, setSelectedListing] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'info' | 'success' | 'error', message: string } | null>(null);
  
  const [wallet, setWallet] = useState({
    isConnected: false,
    address: '',
    balance: '0',
    profile: { level: 1, ympBalance: 0 } as any
  });

  // ==========================================
  // 1. Supabase 데이터 통신 (API 경로 대신 직결)
  // ==========================================
  const fetchInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Candidates(어워즈) 데이터 로드
      const { data: cData, error: cError } = await supabase.from('candidates').select('*').eq('year', 2026);
      if (cError) throw cError;
      if (cData && cData.length > 0) {
        setCandidates(cData as Candidate[]);
      } else {
        const generated = await generateCandidates(2026);
        setCandidates(generated);
      }

      // Listings(마켓플레이스) 데이터 로드
      const { data: lData, error: lError } = await supabase.from('listings').select('*');
      if (!lError && lData) setListings(lData);

    } catch (err: any) {
      console.error("DB Fetch Error:", err);
      setStatus({ type: 'error', message: "Supabase 데이터 로드 실패. 네트워크를 확인하세요." });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);


  // ==========================================
  // 2. Muse 내비게이션 (레벨/미션별 탭 자동 전환)
  // ==========================================
  const handleMuseNavigation = (targetLevel: number, missionType: string) => {
    // 유저의 현재 레벨 검증 (선택사항)
    if (wallet.profile.level < targetLevel - 1) {
      setStatus({ type: 'error', message: `이전 미션을 먼저 완료해야 합니다. (요구 레벨: ${targetLevel})` });
      return;
    }

    switch (missionType) {
      case 'vote': // 레벨 1~2: 투표 미션
        setViewMode('awards');
        setStatus({ type: 'info', message: "Muse: 올해의 혁신 프로젝트에 투표하여 미션을 완료하세요!" });
        break;
      case 'swap': // 레벨 3: 토큰 스왑
      case 'lp':   // 레벨 4: 유동성 공급
        setViewMode('swap'); // Swap 탭 안에 LP 공급 기능도 포함
        setStatus({ type: 'info', message: "Muse: WYDA 생태계에 참여하세요. 스왑 또는 유동성 풀(LP) 화면입니다." });
        break;
      case 'prediction': // 레벨 5: 예측 시장
        setViewMode('predictions');
        setStatus({ type: 'info', message: "Muse: 미래를 예측하고 배당을 획득하세요. 예측 시장 탭으로 이동했습니다." });
        break;
      case 'game': // 레벨 6 이상: 게임 플레이
        setViewMode('games');
        setStatus({ type: 'info', message: "Muse: 미니게임을 플레이하고 추가 YMP를 획득하세요!" });
        break;
      default:
        setViewMode('dashboard');
    }
  };


  // ==========================================
  // 3. 결제 및 에스크로 로직 (타임락 포함)
  // ==========================================
  const handleBuy = async (listing: any) => {
    if (!wallet.isConnected) {
      const res = await connectWallet();
      if (res) setWallet(prev => ({ ...prev, ...res, isConnected: true }));
      return;
    }

    try {
      setIsLoading(true);
      setStatus({ type: 'info', message: '에스크로 결제 진행 중... 메타마스크를 확인하세요.' });
      
      const provider = new (window as any).ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      // 스마트 컨트랙트(에스크로)로 자금 전송
      await transferWYDA(ESCROW_ADDRESS, listing.price.toString(), signer);
      
      const now = Date.now();
      const tenDays = 10 * 24 * 60 * 60 * 1000;

      const newPurchase = {
        listingId: listing.id,
        buyerAddress: wallet.address,
        sellerAddress: listing.sellerAddress,
        status: 'escrow_pending',
        shippingDeadline: new Date(now + tenDays).toISOString(), // 10일 타임락
        price: listing.price
      };

      // Supabase 직접 저장
      const { error } = await supabase.from('purchases').insert([newPurchase]);
      if (error) throw error;

      setStatus({ type: 'success', message: `결제 완료! 10일간의 구매자 보호(Escrow)가 적용됩니다.` });
      setSelectedListing(null); // 모달 닫기
      fetchInitialData(); // 리스트 갱신

    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || '결제 트랜잭션 실패' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink font-sans selection:bg-primary/30">
      
      {/* 🟢 Navigation Bar */}
      <nav className="fixed top-0 inset-x-0 bg-bg/80 backdrop-blur-md border-b border-line/5 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-black tracking-tighter flex items-center gap-2 cursor-pointer" onClick={() => setViewMode('dashboard')}>
              <Trophy className="text-primary w-6 h-6" />
              SSOAWARDS
            </h1>
            
            <div className="hidden md:flex items-center gap-1 bg-ink/5 p-1 rounded-full">
              {(['dashboard', 'awards', 'predictions', 'swap', 'games'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "px-6 py-2 rounded-full text-xs font-bold transition-all uppercase tracking-widest",
                    viewMode === mode ? "bg-ink text-bg shadow-lg" : "hover:bg-ink/5 opacity-50 hover:opacity-100"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={async () => {
              const res = await connectWallet();
              if (res) setWallet(prev => ({ ...prev, ...res, isConnected: true }));
            }}
            className="flex items-center gap-3 px-6 py-3 bg-primary/10 text-primary border border-primary/20 rounded-full font-bold hover:bg-primary hover:text-bg transition-all group"
          >
            <Wallet className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            <span className="text-sm">
              {wallet.isConnected ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : "Connect Wallet"}
            </span>
          </button>
        </div>
      </nav>

      {/* 🟢 Main Content */}
      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          
          {/* Dashboard (Muse Mission Hub) */}
          {viewMode === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              <div className="bg-ink text-bg p-8 rounded-3xl relative overflow-hidden">
                <Sparkles className="absolute right-[-20px] top-[-20px] w-40 h-40 opacity-10 text-primary" />
                <h2 className="text-3xl font-black mb-2">Muse Guidance System</h2>
                <p className="opacity-70 max-w-lg mb-8">당신의 레벨에 맞는 미션을 선택하세요. Muse가 필요한 목적지로 안내합니다.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* 미션 버튼들 - handleMuseNavigation 호출 */}
                  <button onClick={() => handleMuseNavigation(1, 'vote')} className="text-left p-6 bg-bg/10 rounded-2xl hover:bg-primary/20 border border-transparent hover:border-primary/50 transition-all">
                    <Trophy className="w-6 h-6 mb-3 text-primary" />
                    <h3 className="font-bold">Level 1-2</h3>
                    <p className="text-xs opacity-70">후보자 투표하기</p>
                  </button>
                  <button onClick={() => handleMuseNavigation(3, 'swap')} className="text-left p-6 bg-bg/10 rounded-2xl hover:bg-primary/20 border border-transparent hover:border-primary/50 transition-all">
                    <ArrowRightLeft className="w-6 h-6 mb-3 text-blue-400" />
                    <h3 className="font-bold">Level 3-4</h3>
                    <p className="text-xs opacity-70">Swap & LP 공급</p>
                  </button>
                  <button onClick={() => handleMuseNavigation(5, 'prediction')} className="text-left p-6 bg-bg/10 rounded-2xl hover:bg-primary/20 border border-transparent hover:border-primary/50 transition-all">
                    <TrendingUp className="w-6 h-6 mb-3 text-green-400" />
                    <h3 className="font-bold">Level 5</h3>
                    <p className="text-xs opacity-70">예측 시장 참여</p>
                  </button>
                  <button onClick={() => handleMuseNavigation(6, 'game')} className="text-left p-6 bg-bg/10 rounded-2xl hover:bg-primary/20 border border-transparent hover:border-primary/50 transition-all">
                    <Gamepad2 className="w-6 h-6 mb-3 text-purple-400" />
                    <h3 className="font-bold">Level 6+</h3>
                    <p className="text-xs opacity-70">미니게임 점수 달성</p>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Swap & LP Tab */}
          {viewMode === 'swap' && (
            <motion.div key="swap" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-xl mx-auto space-y-6">
              <div className="bg-ink/5 p-8 rounded-[2rem] border border-line/10">
                <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                  <ArrowRightLeft className="text-primary" /> Token Swap
                </h3>
                <button onClick={() => swapUSDTtoWYDA("100")} className="w-full py-4 bg-ink text-bg rounded-2xl font-bold hover:bg-primary transition-all">
                  SWAP USDT → WYDA
                </button>
              </div>
              <div className="bg-primary/5 border-2 border-dashed border-primary/20 p-8 rounded-[2rem]">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
                  <Droplets className="text-primary" /> Liquidity Pool (LP)
                </h3>
                <p className="text-sm opacity-60 mb-6">WYDA와 USDT를 공급하여 거래 수수료 보상을 받으세요.</p>
                <button onClick={() => addWYDALiquidity("50", "50")} className="w-full py-4 bg-primary text-bg rounded-2xl font-bold hover:opacity-90 transition-all">
                  Add Liquidity
                </button>
              </div>
            </motion.div>
          )}

          {/* 다른 탭들 (Awards, Predictions, Games 등은 기존 코드와 동일하게 구성) */}
          {/* ... */}
          
        </AnimatePresence>
      </main>

      {/* 🟢 Floating Status/Toast Bar */}
      <AnimatePresence>
        {status && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60]"
          >
            <div className={cn(
              "px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold text-sm border backdrop-blur-md",
              status.type === 'error' ? "bg-red-500/90 text-white border-red-500" : 
              status.type === 'success' ? "bg-green-500/90 text-white border-green-500" : 
              "bg-ink/90 text-bg border-line/20"
            )}>
              {status.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : 
               status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
               <Sparkles className="w-5 h-5 text-primary" />}
              {status.message}
              <button onClick={() => setStatus(null)} className="ml-4 opacity-50 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}