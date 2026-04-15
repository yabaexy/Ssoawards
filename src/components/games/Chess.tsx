import React, { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

const Board = Chessboard as any;

const ChessGame: React.FC = () => {
  const [game, setGame] = useState(new Chess());

  function makeAMove(move: any) {
    const gameCopy = new Chess(game.fen());
    const result = gameCopy.move(move);
    setGame(gameCopy);
    return result; // null if the move was illegal, the move object otherwise
  }

  function onDrop(sourceSquare: string, targetSquare: string) {
    const move = makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q', // always promote to a queen for example simplicity
    });

    // illegal move
    if (move === null) return false;
    return true;
  }

  return (
    <div className="w-full max-w-[500px] mx-auto bg-[#111] p-4 border border-[#333] rounded-sm space-y-4">
      <div className="flex justify-between text-[10px] uppercase tracking-widest text-[#888]">
        <span>Turn: {game.turn() === 'w' ? 'White' : 'Black'}</span>
        <span>Status: {game.isCheckmate() ? 'Checkmate!' : game.isCheck() ? 'Check!' : 'Playing'}</span>
      </div>
      <div className="border-4 border-[#222] rounded-sm overflow-hidden">
        <Board 
          position={game.fen()} 
          onPieceDrop={onDrop} 
          boardOrientation="white"
          customDarkSquareStyle={{ backgroundColor: '#1a1a1a' }}
          customLightSquareStyle={{ backgroundColor: '#333' }}
        />
      </div>
      <button 
        onClick={() => setGame(new Chess())}
        className="w-full py-2 border border-[#00ff00] text-[#00ff00] text-[10px] uppercase font-bold hover:bg-[#00ff00] hover:text-black transition-colors"
      >
        Reset Game
      </button>
    </div>
  );
};

export default ChessGame;
