import React, { useState, useEffect, useCallback, useRef } from 'react';

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 20;

const SHAPES = [
  [[1, 1, 1, 1]], // I
  [[1, 1], [1, 1]], // O
  [[0, 1, 0], [1, 1, 1]], // T
  [[1, 0, 0], [1, 1, 1]], // L
  [[0, 0, 1], [1, 1, 1]], // J
  [[0, 1, 1], [1, 1, 0]], // S
  [[1, 1, 0], [0, 1, 1]], // Z
];

const COLORS = ['#00ffff', '#ffff00', '#800080', '#ffa500', '#0000ff', '#00ff00', '#ff0000'];

const Tetris: React.FC = () => {
  const [grid, setGrid] = useState<string[][]>(Array(ROWS).fill(null).map(() => Array(COLS).fill('')));
  const [activePiece, setActivePiece] = useState<{ shape: number[][], x: number, y: number, color: string } | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const gameLoopRef = useRef<number | null>(null);

  const spawnPiece = useCallback(() => {
    const idx = Math.floor(Math.random() * SHAPES.length);
    const piece = {
      shape: SHAPES[idx],
      color: COLORS[idx],
      x: Math.floor(COLS / 2) - Math.floor(SHAPES[idx][0].length / 2),
      y: 0
    };
    if (checkCollision(piece.x, piece.y, piece.shape, grid)) {
      setGameOver(true);
      return null;
    }
    return piece;
  }, [grid]);

  const checkCollision = (x: number, y: number, shape: number[][], currentGrid: string[][]) => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const newX = x + c;
          const newY = y + r;
          if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && currentGrid[newY][newX])) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const rotate = (shape: number[][]) => {
    return shape[0].map((_, i) => shape.map(row => row[i]).reverse());
  };

  const moveDown = useCallback(() => {
    if (!activePiece || gameOver) return;
    if (!checkCollision(activePiece.x, activePiece.y + 1, activePiece.shape, grid)) {
      setActivePiece(prev => prev ? { ...prev, y: prev.y + 1 } : null);
    } else {
      // Lock piece
      const newGrid = grid.map(row => [...row]);
      activePiece.shape.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell) {
            const gy = activePiece.y + r;
            const gx = activePiece.x + c;
            if (gy >= 0) newGrid[gy][gx] = activePiece.color;
          }
        });
      });

      // Clear lines
      let linesCleared = 0;
      const filteredGrid = newGrid.filter(row => !row.every(cell => cell !== ''));
      linesCleared = ROWS - filteredGrid.length;
      while (filteredGrid.length < ROWS) {
        filteredGrid.unshift(Array(COLS).fill(''));
      }
      
      setGrid(filteredGrid);
      setScore(prev => prev + (linesCleared * 100));
      setActivePiece(spawnPiece());
    }
  }, [activePiece, grid, gameOver, spawnPiece]);

  useEffect(() => {
    if (!activePiece && !gameOver) {
      setActivePiece(spawnPiece());
    }
  }, [activePiece, gameOver, spawnPiece]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver || !activePiece) return;
      if (e.key === 'ArrowLeft' && !checkCollision(activePiece.x - 1, activePiece.y, activePiece.shape, grid)) {
        setActivePiece(prev => prev ? { ...prev, x: prev.x - 1 } : null);
      }
      if (e.key === 'ArrowRight' && !checkCollision(activePiece.x + 1, activePiece.y, activePiece.shape, grid)) {
        setActivePiece(prev => prev ? { ...prev, x: prev.x + 1 } : null);
      }
      if (e.key === 'ArrowDown') {
        moveDown();
      }
      if (e.key === 'ArrowUp') {
        const rotated = rotate(activePiece.shape);
        if (!checkCollision(activePiece.x, activePiece.y, rotated, grid)) {
          setActivePiece(prev => prev ? { ...prev, shape: rotated } : null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePiece, grid, gameOver, moveDown]);

  useEffect(() => {
    const interval = setInterval(moveDown, 800);
    return () => clearInterval(interval);
  }, [moveDown]);

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-[#111] border border-[#333] rounded-sm">
      <div className="text-xs uppercase tracking-widest text-[#00ff00]">Score: {score}</div>
      <div 
        className="relative bg-black border-2 border-[#222]"
        style={{ width: COLS * BLOCK_SIZE, height: ROWS * BLOCK_SIZE }}
      >
        {grid.map((row, r) => row.map((cell, c) => (
          cell && (
            <div 
              key={`${r}-${c}`}
              className="absolute border border-black/20"
              style={{ 
                width: BLOCK_SIZE, 
                height: BLOCK_SIZE, 
                left: c * BLOCK_SIZE, 
                top: r * BLOCK_SIZE,
                backgroundColor: cell
              }}
            />
          )
        )))}
        {activePiece && activePiece.shape.map((row, r) => row.map((cell, c) => (
          cell && (
            <div 
              key={`active-${r}-${c}`}
              className="absolute border border-black/20"
              style={{ 
                width: BLOCK_SIZE, 
                height: BLOCK_SIZE, 
                left: (activePiece.x + c) * BLOCK_SIZE, 
                top: (activePiece.y + r) * BLOCK_SIZE,
                backgroundColor: activePiece.color
              }}
            />
          )
        )))}
        {gameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4">
            <span className="text-[#ff4444] font-bold uppercase tracking-tighter">GAME OVER</span>
            <button 
              onClick={() => {
                setGrid(Array(ROWS).fill(null).map(() => Array(COLS).fill('')));
                setScore(0);
                setGameOver(false);
                setActivePiece(null);
              }}
              className="text-[10px] border border-[#00ff00] px-4 py-1 text-[#00ff00] hover:bg-[#00ff00] hover:text-black transition-colors"
            >
              RESTART
            </button>
          </div>
        )}
      </div>
      <div className="text-[9px] text-[#555] uppercase text-center">
        Arrows to move & rotate
      </div>
    </div>
  );
};

export default Tetris;
