import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';

type Player = 'B' | 'W' | null;
type Board = Player[][];

const Reversi: React.FC = () => {
  const [board, setBoard] = useState<Board>([]);
  const [currentPlayer, setCurrentPlayer] = useState<'B' | 'W'>('B');
  const [scores, setScores] = useState({ B: 2, W: 2 });
  const [gameOver, setGameOver] = useState(false);

  const initBoard = () => {
    const newBoard: Board = Array(8).fill(null).map(() => Array(8).fill(null));
    newBoard[3][3] = 'W';
    newBoard[3][4] = 'B';
    newBoard[4][3] = 'B';
    newBoard[4][4] = 'W';
    setBoard(newBoard);
    setCurrentPlayer('B');
    setGameOver(false);
    setScores({ B: 2, W: 2 });
  };

  useEffect(() => {
    initBoard();
  }, []);

  const isValidMove = (r: number, c: number, player: Player, currentBoard: Board) => {
    if (currentBoard[r][c] !== null) return false;
    const opponent = player === 'B' ? 'W' : 'B';
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];

    for (const [dr, dc] of directions) {
      let nr = r + dr;
      let nc = c + dc;
      let hasOpponentBetween = false;

      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (currentBoard[nr][nc] === opponent) {
          hasOpponentBetween = true;
        } else if (currentBoard[nr][nc] === player) {
          if (hasOpponentBetween) return true;
          break;
        } else {
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
    return false;
  };

  const makeMove = (r: number, c: number) => {
    if (gameOver || !isValidMove(r, c, currentPlayer, board)) return;

    const newBoard = board.map(row => [...row]);
    const opponent = currentPlayer === 'B' ? 'W' : 'B';
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];

    newBoard[r][c] = currentPlayer;

    for (const [dr, dc] of directions) {
      let nr = r + dr;
      let nc = c + dc;
      const cellsToFlip: [number, number][] = [];

      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (newBoard[nr][nc] === opponent) {
          cellsToFlip.push([nr, nc]);
        } else if (newBoard[nr][nc] === currentPlayer) {
          cellsToFlip.forEach(([fr, fc]) => {
            newBoard[fr][fc] = currentPlayer;
          });
          break;
        } else {
          break;
        }
        nr += dr;
        nc += dc;
      }
    }

    const nextPlayer = currentPlayer === 'B' ? 'W' : 'B';
    setBoard(newBoard);
    
    // Check if next player has moves
    let hasMoves = false;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (isValidMove(i, j, nextPlayer, newBoard)) {
          hasMoves = true;
          break;
        }
      }
      if (hasMoves) break;
    }

    if (hasMoves) {
      setCurrentPlayer(nextPlayer);
    } else {
      // Check if current player still has moves
      let currentHasMoves = false;
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          if (isValidMove(i, j, currentPlayer, newBoard)) {
            currentHasMoves = true;
            break;
          }
        }
        if (currentHasMoves) break;
      }
      if (!currentHasMoves) {
        setGameOver(true);
      }
    }

    // Update scores
    let b = 0, w = 0;
    newBoard.forEach(row => row.forEach(cell => {
      if (cell === 'B') b++;
      if (cell === 'W') w++;
    }));
    setScores({ B: b, W: w });
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4 bg-[#111] border border-[#333] rounded-sm">
      <div className="flex justify-between w-full max-w-[400px] text-xs uppercase tracking-widest">
        <div className={cn("flex items-center gap-2", currentPlayer === 'B' && "text-[#00ff00]")}>
          <div className="w-3 h-3 rounded-full bg-black border border-white" />
          Black: {scores.B}
        </div>
        <div className={cn("flex items-center gap-2", currentPlayer === 'W' && "text-[#00ff00]")}>
          <div className="w-3 h-3 rounded-full bg-white" />
          White: {scores.W}
        </div>
      </div>

      <div className="grid grid-cols-8 gap-1 bg-[#222] p-1 border border-[#444]">
        {board.map((row, r) => row.map((cell, c) => (
          <button
            key={`${r}-${c}`}
            onClick={() => makeMove(r, c)}
            className="w-8 h-8 md:w-12 md:h-12 bg-[#1a3a1a] hover:bg-[#2a4a2a] flex items-center justify-center transition-colors relative"
          >
            {cell && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                  "w-6 h-6 md:w-10 md:h-10 rounded-full shadow-lg",
                  cell === 'B' ? "bg-black border border-[#333]" : "bg-white"
                )}
              />
            )}
            {!cell && isValidMove(r, c, currentPlayer, board) && (
              <div className="w-2 h-2 rounded-full bg-[#00ff00]/20" />
            )}
          </button>
        )))}
      </div>

      {gameOver && (
        <div className="text-center space-y-2">
          <p className="text-[#00ff00] font-bold uppercase tracking-tighter">
            Game Over! {scores.B > scores.W ? 'Black Wins' : scores.W > scores.B ? 'White Wins' : 'Draw'}
          </p>
          <button onClick={initBoard} className="text-[10px] border border-[#00ff00] px-4 py-1 hover:bg-[#00ff00] hover:text-black transition-colors">
            RESTART
          </button>
        </div>
      )}
    </div>
  );
};

export default Reversi;

import { cn } from '../../lib/utils';
