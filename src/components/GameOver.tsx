import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Home, RotateCcw, Coins, Diamond, ShieldCheck } from 'lucide-react';
import SoundService from '../services/SoundService';

interface GameOverProps {
  winnerName: string;
  isWinner: boolean;
  onRestart: () => void;
  onHome: () => void;
  stats: {
    coins: number;
    diamonds: number;
    assets: number;
    xp: number;
    rank: number;
  };
}

const GameOver: React.FC<GameOverProps> = ({ winnerName, isWinner, onRestart, onHome, stats }) => {
  React.useEffect(() => {
    if (isWinner) {
      SoundService.play('win');
    }
  }, [isWinner]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 font-sans overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className={`absolute -top-24 -left-24 w-96 h-96 ${isWinner ? 'bg-orange-500' : 'bg-red-500'} rounded-full blur-[120px]`} />
        <div className={`absolute -bottom-24 -right-24 w-96 h-96 ${isWinner ? 'bg-blue-500' : 'bg-neutral-800'} rounded-full blur-[120px]`} />
      </div>

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="z-10 w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-10 text-center shadow-2xl relative overflow-hidden"
      >
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 ${isWinner ? 'bg-orange-500/20' : 'bg-red-500/20'} rounded-full blur-[80px] -z-10`} />

        <div className="mb-8">
          <div className={`w-24 h-24 mx-auto rounded-[32px] flex items-center justify-center mb-6 ${isWinner ? 'bg-orange-500 shadow-lg shadow-orange-500/50' : 'bg-neutral-800'}`}>
            <Trophy className={isWinner ? 'text-white' : 'text-neutral-500'} size={48} />
          </div>
          <h1 className="text-5xl font-black italic tracking-tighter uppercase mb-2">
            {isWinner ? 'Victory!' : 'Game Over'}
          </h1>
          <p className="text-neutral-500 font-bold tracking-widest uppercase text-xs">
            {isWinner ? 'You dominated the board' : `${winnerName} won the game`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <StatBox icon={<Coins size={16} className="text-yellow-500" />} label="Coins" value={stats.coins.toLocaleString()} />
          <StatBox icon={<Trophy size={16} className="text-orange-500" />} label="XP Gained" value={isWinner ? '+100' : '+20'} />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-10">
          <StatBox icon={<ShieldCheck size={16} className="text-blue-400" />} label="Current Rank" value={`Rank ${stats.rank}`} />
          <StatBox icon={<Diamond size={16} className="text-blue-400" />} label="Total XP" value={stats.xp.toLocaleString()} />
        </div>

        <div className="space-y-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              SoundService.play('click');
              onRestart();
            }}
            className="w-full py-5 bg-orange-500 text-white rounded-[24px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 flex items-center justify-center space-x-3"
          >
            <RotateCcw size={20} />
            <span>Start Next Round</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              SoundService.play('click');
              onHome();
            }}
            className="w-full py-5 bg-white/5 border border-white/10 text-white rounded-[24px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center space-x-3"
          >
            <Home size={20} />
            <span>Back to Menu</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

const StatBox: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center">
    <div className="mb-2">{icon}</div>
    <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-sm font-black tracking-tight">{value}</p>
  </div>
);

export default GameOver;
