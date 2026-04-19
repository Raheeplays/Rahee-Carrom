import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import SoundService from '../services/SoundService';

const SplashScreen: React.FC = () => {
  useEffect(() => {
    SoundService.play('splash');
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <div className="w-32 h-32 bg-gradient-to-br from-orange-400 to-orange-600 rounded-[40px] flex items-center justify-center shadow-2xl shadow-orange-500/20 mb-8 rotate-12">
          <div className="w-24 h-24 border-8 border-white/20 rounded-full flex items-center justify-center">
             <div className="w-4 h-4 bg-white rounded-full" />
          </div>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black italic tracking-tighter mb-2 whitespace-nowrap">RAHEE CARROM</h1>
        <div className="h-1 w-48 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
        <p className="mt-6 text-neutral-500 font-bold tracking-[0.3em] text-xs uppercase">Loading Experience</p>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
