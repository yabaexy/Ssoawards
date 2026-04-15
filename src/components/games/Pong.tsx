import React, { useState, useEffect, useRef } from 'react';

const WIDTH = 400;
const HEIGHT = 300;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 60;
const BALL_SIZE = 8;

const Pong: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState({ left: 0, right: 0 });
  const [gameOver, setGameOver] = useState(false);

  const gameState = useRef({
    leftPaddleY: HEIGHT / 2 - PADDLE_HEIGHT / 2,
    rightPaddleY: HEIGHT / 2 - PADDLE_HEIGHT / 2,
    ballX: WIDTH / 2,
    ballY: HEIGHT / 2,
    ballDX: 3,
    ballDY: 3,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const update = () => {
      const state = gameState.current;

      // Move ball
      state.ballX += state.ballDX;
      state.ballY += state.ballDY;

      // Ball collision with top/bottom
      if (state.ballY <= 0 || state.ballY + BALL_SIZE >= HEIGHT) {
        state.ballDY *= -1;
      }

      // Ball collision with paddles
      if (
        (state.ballX <= PADDLE_WIDTH && state.ballY + BALL_SIZE >= state.leftPaddleY && state.ballY <= state.leftPaddleY + PADDLE_HEIGHT) ||
        (state.ballX + BALL_SIZE >= WIDTH - PADDLE_WIDTH && state.ballY + BALL_SIZE >= state.rightPaddleY && state.ballY <= state.rightPaddleY + PADDLE_HEIGHT)
      ) {
        state.ballDX *= -1.1; // Speed up
      }

      // AI for right paddle
      const rightPaddleCenter = state.rightPaddleY + PADDLE_HEIGHT / 2;
      if (rightPaddleCenter < state.ballY) {
        state.rightPaddleY += 3;
      } else {
        state.rightPaddleY -= 3;
      }
      state.rightPaddleY = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, state.rightPaddleY));

      // Scoring
      if (state.ballX < 0) {
        setScore(prev => ({ ...prev, right: prev.right + 1 }));
        resetBall();
      } else if (state.ballX > WIDTH) {
        setScore(prev => ({ ...prev, left: prev.left + 1 }));
        resetBall();
      }
    };

    const resetBall = () => {
      gameState.current.ballX = WIDTH / 2;
      gameState.current.ballY = HEIGHT / 2;
      gameState.current.ballDX = 3 * (Math.random() > 0.5 ? 1 : -1);
      gameState.current.ballDY = 3 * (Math.random() > 0.5 ? 1 : -1);
    };

    const draw = () => {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = '#00ff00';
      // Paddles
      ctx.fillRect(0, gameState.current.leftPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.fillRect(WIDTH - PADDLE_WIDTH, gameState.current.rightPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT);
      
      // Ball
      ctx.fillRect(gameState.current.ballX, gameState.current.ballY, BALL_SIZE, BALL_SIZE);

      // Center line
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#333';
      ctx.beginPath();
      ctx.moveTo(WIDTH / 2, 0);
      ctx.lineTo(WIDTH / 2, HEIGHT);
      ctx.stroke();
    };

    const loop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(loop);
    };

    loop();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      gameState.current.leftPaddleY = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, mouseY - PADDLE_HEIGHT / 2));
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-[#111] border border-[#333] rounded-sm">
      <div className="flex justify-between w-full text-xs uppercase tracking-widest text-[#00ff00]">
        <span>Player: {score.left}</span>
        <span>AI: {score.right}</span>
      </div>
      <canvas 
        ref={canvasRef} 
        width={WIDTH} 
        height={HEIGHT} 
        className="bg-black border border-[#333] cursor-none"
      />
      <div className="text-[9px] text-[#555] uppercase">
        Move mouse to control paddle
      </div>
    </div>
  );
};

export default Pong;
