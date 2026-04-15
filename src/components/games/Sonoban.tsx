import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Wrench, Settings, Nut } from 'lucide-react';

const WIDTH = 400;
const HEIGHT = 500;
const PLAYER_WIDTH = 60;
const PLAYER_HEIGHT = 80;
const ITEM_SIZE = 30;

interface Item {
  id: number;
  x: number;
  y: number;
  type: 'part' | 'screw' | 'wrench';
  speed: number;
}

const Sonoban: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const state = useRef({
    playerX: WIDTH / 2 - PLAYER_WIDTH / 2,
    items: [] as Item[],
    nextItemId: 0,
    lastSpawnTime: 0,
    keys: {} as Record<string, boolean>,
  });

  const spawnItem = useCallback(() => {
    const types: Item['type'][] = ['part', 'screw', 'wrench'];
    const newItem: Item = {
      id: state.current.nextItemId++,
      x: Math.random() * (WIDTH - ITEM_SIZE),
      y: -ITEM_SIZE,
      type: types[Math.floor(Math.random() * types.length)],
      speed: 2 + Math.random() * 3,
    };
    state.current.items.push(newItem);
  }, []);

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const update = (time: number) => {
      const s = state.current;

      // Move player
      if (s.keys['ArrowLeft']) s.playerX -= 5;
      if (s.keys['ArrowRight']) s.playerX += 5;
      s.playerX = Math.max(0, Math.min(WIDTH - PLAYER_WIDTH, s.playerX));

      // Spawn items
      if (time - s.lastSpawnTime > 1000) {
        spawnItem();
        s.lastSpawnTime = time;
      }

      // Update items
      s.items.forEach((item, index) => {
        item.y += item.speed;

        // Collision check
        if (
          item.y + ITEM_SIZE >= HEIGHT - PLAYER_HEIGHT &&
          item.x + ITEM_SIZE >= s.playerX &&
          item.x <= s.playerX + PLAYER_WIDTH
        ) {
          setScore(prev => prev + 10);
          s.items.splice(index, 1);
        } else if (item.y > HEIGHT) {
          setGameOver(true);
        }
      });
    };

    const draw = () => {
      // Background (Industrial Plant)
      const bgImg = new Image();
      bgImg.src = 'https://picsum.photos/seed/industrial/800/1000';
      ctx.drawImage(bgImg, 0, 0, WIDTH, HEIGHT);
      
      // Overlay for better visibility
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Player (Anime Girl with Headphones)
      const playerImg = new Image();
      playerImg.src = 'https://picsum.photos/seed/anime/200/300';
      ctx.drawImage(playerImg, state.current.playerX, HEIGHT - PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT);
      
      // Basket indicator
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(state.current.playerX, HEIGHT - PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT);

      // Items
      state.current.items.forEach(item => {
        ctx.fillStyle = item.type === 'part' ? '#ff4444' : item.type === 'screw' ? '#4444ff' : '#ffff44';
        ctx.beginPath();
        ctx.arc(item.x + ITEM_SIZE/2, item.y + ITEM_SIZE/2, ITEM_SIZE/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Icon overlay
        ctx.fillStyle = 'black';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(item.type[0].toUpperCase(), item.x + ITEM_SIZE/2, item.y + ITEM_SIZE/2 + 4);
      });
    };

    const loop = (time: number) => {
      update(time);
      draw();
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    const handleKeyDown = (e: KeyboardEvent) => state.current.keys[e.key] = true;
    const handleKeyUp = (e: KeyboardEvent) => state.current.keys[e.key] = false;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStarted, gameOver, spawnItem]);

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-[#111] border border-[#333] rounded-sm">
      <div className="flex justify-between w-full text-xs uppercase tracking-widest text-[#00ff00]">
        <span>Score: {score}</span>
        <span>Status: {gameOver ? 'FAILED' : 'ACTIVE'}</span>
      </div>
      
      <div className="relative">
        <canvas 
          ref={canvasRef} 
          width={WIDTH} 
          height={HEIGHT} 
          className="bg-black border border-[#333]"
        />
        
        {!gameStarted && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-8 text-center gap-6">
            <h3 className="text-xl font-bold text-[#00ff00] uppercase tracking-tighter">Sonoban Protocol</h3>
            <p className="text-[10px] text-[#888] leading-relaxed uppercase">
              Catch the falling parts to maintain the reactor. 
              Missing a single part results in catastrophic failure.
            </p>
            <button 
              onClick={() => setGameStarted(true)}
              className="px-8 py-2 border border-[#00ff00] text-[#00ff00] text-xs font-bold hover:bg-[#00ff00] hover:text-black transition-all"
            >
              INITIALIZE
            </button>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 bg-[#ff4444]/20 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
            <div className="bg-black p-6 border border-[#ff4444] text-center space-y-4">
              <h3 className="text-xl font-bold text-[#ff4444] uppercase tracking-tighter">Reactor Meltdown</h3>
              <p className="text-[10px] text-[#888] uppercase">Final Score: {score}</p>
              <button 
                onClick={() => {
                  setGameOver(false);
                  setScore(0);
                  state.current.items = [];
                }}
                className="w-full py-2 bg-[#ff4444] text-black text-xs font-bold uppercase hover:bg-black hover:text-[#ff4444] transition-all"
              >
                REBOOT
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-[9px] text-[#555] uppercase">
        Use Arrow Keys to Move Left/Right
      </div>
    </div>
  );
};

export default Sonoban;
