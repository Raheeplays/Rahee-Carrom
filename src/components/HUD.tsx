import React from 'react';
import { motion } from 'motion/react';
import { THEME } from '../constants';
import { GameState, User } from '../types';
import { MessageCircle, Settings, Lightbulb, Power, ChevronLeft, ChevronRight, Menu as MenuIcon } from 'lucide-react';

interface HUDProps {
  gameState: GameState;
  onAimChange: (angle: number) => void;
  onPowerChange: (power: number) => void;
  onStrike: () => void;
  onStrikerMove: (x: number) => void;
  onExit: () => void;
  onOpenMenu: () => void;
  onOpenProfile: (user: User) => void;
}

const HUD: React.FC<HUDProps> = ({ gameState, onAimChange, onPowerChange, onStrike, onStrikerMove, onExit, onOpenMenu, onOpenProfile }) => {
  const theme = THEME;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 text-white font-sans">
      {/* Top Bar: Players */}
      <div className="flex justify-between items-start pointer-events-auto">
        {gameState.playerNames.map((name, index) => (
          <div 
            key={index}
            onClick={() => {
              // Create a temporary user object for the profile view
              const playerUser: User = {
                id: gameState.playerIds[index],
                name: gameState.playerNames[index],
                raheeCoins: gameState.playerPoints[index],
                raheeDiamonds: 0,
                xp: 0,
                rank: 1,
                wins: 0,
                losses: 0,
                isAdmin: false,
                isApproved: true,
                key: '',
                friends: [],
                createdAt: ''
              };
              onOpenProfile(playerUser);
            }}
            className={`flex items-center space-x-4 bg-black/40 backdrop-blur-md p-3 rounded-2xl border-2 transition-all cursor-pointer ${
              gameState.currentPlayerIndex === index ? 'border-orange-500 scale-105' : 'border-transparent opacity-60'
            }`}
          >
            <div className="w-10 h-10 bg-neutral-700 rounded-xl overflow-hidden border border-neutral-600 relative">
              <img src={`https://picsum.photos/seed/player${index}/100/100`} alt={name} referrerPolicy="no-referrer" />
              <div 
                className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border border-white/20 shadow-lg ${
                  gameState.playerColors[index] === 'white' ? 'bg-[#F5F5DC]' : 'bg-[#212121]'
                }`}
              />
            </div>
            <div className={index % 2 === 1 ? 'text-right' : 'text-left'}>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">{name}</p>
              <div className="flex items-center gap-3 flex-row-reverse">
                <div className="flex flex-col items-center">
                  <p className="text-2xl font-black text-white leading-none">{gameState.scores[index] || 0}</p>
                  {gameState.mode === 'classic' && (
                    <p className="text-[7px] font-black text-neutral-500 uppercase mt-0.5">
                      {9 - (gameState.scores[index] || 0)} left
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 max-w-[80px] justify-end">
                  {gameState.mode === 'classic' && gameState.coveredQueenIndex === index && (
                    <div 
                      className="w-5 h-5 rounded-full border-2 shadow-lg bg-red-600 border-red-400 relative"
                      style={{
                        boxShadow: 'inset -3px -3px 6px rgba(0,0,0,0.4), 3px 3px 6px rgba(0,0,0,0.4)'
                      }}
                      title="Queen Covered"
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white/20" />
                      </div>
                    </div>
                  )}
                  {gameState.pieces
                    .filter(p => {
                      if (!p.isPocketed) return false;
                      if (gameState.mode === 'classic') {
                        // In classic, show pieces of the color owned by this player
                        return p.type === gameState.playerColors[index];
                      }
                      // In other modes, show pieces pocketed by this player
                      return p.pocketedBy === gameState.playerIds[index];
                    })
                    .map((p, i) => (
                      <div 
                        key={i}
                        className={`w-5 h-5 rounded-full border-2 shadow-lg transition-transform hover:scale-110 ${
                          p.type === 'white' 
                            ? 'bg-[#F5F5DC] border-white/40' 
                            : p.type === 'black' 
                              ? 'bg-[#212121] border-white/10' 
                              : 'bg-red-600 border-red-400'
                        }`}
                        style={{
                          boxShadow: 'inset -3px -3px 6px rgba(0,0,0,0.4), 3px 3px 6px rgba(0,0,0,0.4)'
                        }}
                      />
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Controls */}
      <div className="flex flex-col items-center space-y-6 pointer-events-auto">
        
        {/* Striker Position Slider */}
        {!gameState.isMoving && (
          <div className="w-full max-w-md bg-black/40 backdrop-blur-md p-4 rounded-3xl border border-white/10">
            <div className="flex items-center space-x-4">
              <ChevronLeft className="text-neutral-500" />
              <input 
                type="range" 
                min="100" 
                max="500" 
                value={gameState.strikerPos}
                onChange={(e) => onStrikerMove(parseInt(e.target.value))}
                className="flex-1 h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <ChevronRight className="text-neutral-500" />
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="w-full max-w-2xl flex items-center justify-between bg-black/60 backdrop-blur-xl p-4 rounded-[40px] border border-white/10 shadow-2xl">
          <button onClick={onExit} className="p-4 bg-neutral-800 rounded-full hover:bg-neutral-700 transition-colors">
            <Power size={24} className="text-red-500" />
          </button>

          <div className="flex-1 mx-8 flex items-center space-x-6">
            <div className="flex-1 flex flex-col space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-neutral-400 uppercase">
                <span>Power</span>
                <span>{Math.round(gameState.aimPower)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={gameState.aimPower}
                onChange={(e) => onPowerChange(parseInt(e.target.value))}
                className="w-full h-3 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <button 
              onClick={onStrike}
              disabled={gameState.isMoving}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 ${
                gameState.isMoving ? 'bg-neutral-700 grayscale' : 'bg-gradient-to-br from-orange-400 to-orange-600 hover:from-orange-300 hover:to-orange-500'
              }`}
            >
              <div className="w-16 h-16 rounded-full border-4 border-white/20 flex items-center justify-center">
                <span className="font-black text-xs">STRIKE</span>
              </div>
            </button>

            <div className="flex-1 flex flex-col space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-neutral-400 uppercase">
                <span>Angle</span>
                <span>{Math.round((gameState.aimAngle * 180) / Math.PI)}°</span>
              </div>
              <input 
                type="range" 
                min="-3.14" 
                max="0" 
                step="0.01"
                value={gameState.aimAngle}
                onChange={(e) => onAimChange(parseFloat(e.target.value))}
                className="w-full h-3 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-green-500"
              />
            </div>
          </div>

          <div className="flex space-x-2">
            <button onClick={onOpenMenu} className="p-4 bg-neutral-800 rounded-full hover:bg-neutral-700 transition-colors">
              <MenuIcon size={24} />
            </button>
            <button className="p-4 bg-neutral-800 rounded-full hover:bg-neutral-700 transition-colors">
              <MessageCircle size={24} />
            </button>
            <button className="p-4 bg-neutral-800 rounded-full hover:bg-neutral-700 transition-colors">
              <Lightbulb size={24} />
            </button>
            <button className="p-4 bg-neutral-800 rounded-full hover:bg-neutral-700 transition-colors">
              <Settings size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HUD;
