import React from 'react';
import { motion } from 'motion/react';
import { User, GameMode } from '../types';
import { Play, Users, Shield, LogOut, Trophy, Settings, MessageCircle, Gamepad2, Coins, ShoppingCart, Globe, UserPlus, Diamond } from 'lucide-react';
import SoundService from '../services/SoundService';
import { Arena } from '../types';

interface MenuProps {
  user: User;
  arenas: Arena[];
  onStartSolo: (mode?: GameMode, playerColor?: 'white' | 'black') => void;
  onJoinLobby: (maxPlayers: number, mode: GameMode, playerColor?: 'white' | 'black') => void;
  onStartOnline: (arena: Arena, mode: GameMode, playerColor?: 'white' | 'black') => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
  onOpenFeedback: () => void;
  onOpenProfile: (user: User) => void;
}

const Menu: React.FC<MenuProps> = ({ 
  user, 
  arenas,
  onStartSolo, 
  onJoinLobby, 
  onStartOnline,
  onOpenAdmin, 
  onLogout,
  onOpenFeedback,
  onOpenProfile
}) => {
  const [showMultiplayerOptions, setShowMultiplayerOptions] = React.useState(false);
  const [showSoloOptions, setShowSoloOptions] = React.useState(false);
  const [showOnlineOptions, setShowOnlineOptions] = React.useState(false);
  const [showOnlineModeOptions, setShowOnlineModeOptions] = React.useState(false);
  const [selectedOnlineMode, setSelectedOnlineMode] = React.useState<GameMode | null>(null);
  const [showFriendOptions, setShowFriendOptions] = React.useState(false);
  const [selectedColor, setSelectedColor] = React.useState<'white' | 'black'>('white');
  const [selectedArenaIndex, setSelectedArenaIndex] = React.useState(0);
  const [selectedFriendModeIndex, setSelectedFriendModeIndex] = React.useState(0);
  const [selectedSoloModeIndex, setSelectedSoloModeIndex] = React.useState(0);

  const soloModes = [
    { id: 'classic', title: 'Classic Carrom', subtitle: 'Standard rules', icon: <Gamepad2 className="text-orange-500" /> },
    { id: 'rich-poor', title: 'Rich and Poor', subtitle: 'High value pucks', icon: <Coins className="text-yellow-500" /> },
    { id: 'buy-sell', title: 'Buy and Sell', subtitle: 'Trade territory', icon: <ShoppingCart className="text-green-500" /> }
  ];

  const friendModes = [
    { id: 'classic', title: 'Classic Carrom', subtitle: 'Standard rules', icon: <Gamepad2 className="text-orange-500" />, color: 'text-orange-500' },
    { id: 'rich-poor', title: 'Rich and Poor', subtitle: 'High value pucks win', icon: <Coins className="text-yellow-500" />, color: 'text-yellow-500' },
    { id: 'buy-sell', title: 'Buy and Sell', subtitle: 'Trade territory', icon: <ShoppingCart className="text-green-500" />, color: 'text-green-500' }
  ];

  const nextArena = () => {
    SoundService.play('click');
    setSelectedArenaIndex((prev) => (prev + 1) % arenas.length);
  };

  const prevArena = () => {
    SoundService.play('click');
    setSelectedArenaIndex((prev) => (prev - 1 + arenas.length) % arenas.length);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 font-sans overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-orange-500 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500 rounded-full blur-[120px]" />
      </div>

      {/* Top Right Coins & Diamonds */}
      <div className="absolute top-8 right-8 z-50 flex flex-col gap-3 items-end">
        <div className="flex items-center space-x-3 bg-black/40 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-xl shadow-2xl">
          <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Coins className="text-white w-5 h-5" />
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Rahee Coins</p>
            <p className="text-sm font-black text-white">{user.raheeCoins.toLocaleString()}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 bg-black/40 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-xl shadow-2xl">
          <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Diamond className="text-white w-5 h-5" />
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Diamonds</p>
            <p className="text-sm font-black text-white">{user.raheeDiamonds.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-md flex flex-col items-center"
      >
        {/* Top Bar */}
        <div className="mb-8 text-center">
          <motion.h1 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="text-5xl font-black italic tracking-tighter bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent"
          >
            RAHEE CARROM
          </motion.h1>
          <p className="text-neutral-500 font-bold tracking-widest uppercase text-[10px] mt-1">The Ultimate Experience</p>
        </div>

        <div className="w-full space-y-3">
          {!showMultiplayerOptions && !showSoloOptions && !showOnlineOptions && !showFriendOptions && !showOnlineModeOptions ? (
            <>
              {/* Puck Color Selection */}
              <div className="bg-white/5 border border-white/10 rounded-[24px] p-4 mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3 text-center">Select Your Puck Color</p>
                <div className="flex justify-center gap-6">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      SoundService.play('click');
                      setSelectedColor('white');
                    }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${selectedColor === 'white' ? 'bg-white/10 border border-white/20' : 'opacity-40'}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#F5F5DC] border-2 border-white/20 shadow-lg" />
                    <span className="text-[10px] font-black uppercase tracking-widest">White</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      SoundService.play('click');
                      setSelectedColor('black');
                    }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${selectedColor === 'black' ? 'bg-white/10 border border-white/20' : 'opacity-40'}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#212121] border-2 border-white/20 shadow-lg" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Black</span>
                  </motion.button>
                </div>
              </div>

              <MenuButton 
                icon={<Play className="text-orange-500" />} 
                title="Solo vs AI" 
                subtitle="Practice your skills"
                onClick={() => setShowSoloOptions(true)}
              />
              <MenuButton 
                icon={<Users className="text-blue-500" />} 
                title="Multiplayer" 
                subtitle="Battle with others"
                onClick={() => setShowMultiplayerOptions(true)}
              />
            </>
          ) : showSoloOptions ? (
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="w-full"
            >
              <div className="flex items-center justify-between mb-6 px-2">
                <h2 className="text-xl font-black italic uppercase tracking-tighter text-orange-500">Solo vs AI</h2>
                <button onClick={() => {
                  SoundService.play('click');
                  setShowSoloOptions(false);
                }} className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors">Back</button>
              </div>

              <div className="relative flex items-center justify-center py-8 overflow-visible">
                <div className="flex items-center justify-center w-full h-[240px] relative">
                  {soloModes.map((mode, index) => {
                    const offset = index - selectedSoloModeIndex;
                    const isActive = index === selectedSoloModeIndex;
                    
                    if (Math.abs(offset) > 1) return null;

                    return (
                      <motion.div
                        key={mode.id}
                        initial={false}
                        animate={{
                          x: offset * 160,
                          scale: isActive ? 1.1 : 0.85,
                          opacity: isActive ? 1 : 0.5,
                          zIndex: isActive ? 10 : 5,
                        }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="absolute w-44 h-56 bg-neutral-800 rounded-[32px] border border-white/10 overflow-hidden flex flex-col items-center p-4 shadow-2xl cursor-pointer"
                        onClick={() => {
                          if (isActive) onStartSolo(mode.id as GameMode, selectedColor);
                          else setSelectedSoloModeIndex(index);
                        }}
                      >
                        <div className={`w-16 h-16 bg-black/40 rounded-2xl mb-4 flex items-center justify-center shadow-inner ${isActive ? 'ring-2 ring-orange-500/50' : ''}`}>
                          {React.cloneElement(mode.icon as React.ReactElement<any>, { size: 32 })}
                        </div>
                        
                        <div className="text-center">
                          <h3 className="font-black text-sm uppercase tracking-tighter mb-1">{mode.title}</h3>
                          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{mode.subtitle}</p>
                        </div>

                        {isActive && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-auto w-full"
                          >
                            <button className="w-full py-2 bg-orange-500 hover:bg-orange-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20">
                              Start Practice
                            </button>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-center gap-1.5 mt-4">
                {soloModes.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1 rounded-full transition-all ${i === selectedSoloModeIndex ? 'w-6 bg-orange-500' : 'w-2 bg-white/10'}`} 
                  />
                ))}
              </div>
            </motion.div>
          ) : showMultiplayerOptions ? (
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="text-xl font-black italic uppercase tracking-tighter text-blue-500">Multiplayer</h2>
                <button onClick={() => {
                  SoundService.play('click');
                  setShowMultiplayerOptions(false);
                }} className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors">Back</button>
              </div>
              <MenuButton 
                icon={<UserPlus className="text-orange-500" />} 
                title="With Friends" 
                subtitle="Play with your buddies"
                onClick={() => {
                  setShowMultiplayerOptions(false);
                  setShowFriendOptions(true);
                }}
              />
              <MenuButton 
                icon={<Globe className="text-blue-500" />} 
                title="Online Match" 
                subtitle="Find players worldwide"
                onClick={() => {
                  setShowMultiplayerOptions(false);
                  setShowOnlineModeOptions(true);
                }}
              />
            </motion.div>
          ) : showOnlineModeOptions ? (
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="w-full"
            >
              <div className="flex items-center justify-between mb-6 px-2">
                <h2 className="text-xl font-black italic uppercase tracking-tighter text-blue-500">Select Mode</h2>
                <button onClick={() => {
                  SoundService.play('click');
                  setShowOnlineModeOptions(false);
                  setShowMultiplayerOptions(true);
                }} className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors">Back</button>
              </div>

              <div className="relative flex items-center justify-center py-8 overflow-visible">
                <div className="flex items-center justify-center w-full h-[240px] relative">
                  {soloModes.map((mode, index) => {
                    const offset = index - selectedSoloModeIndex;
                    const isActive = index === selectedSoloModeIndex;
                    
                    if (Math.abs(offset) > 1) return null;

                    return (
                      <motion.div
                        key={mode.id}
                        initial={false}
                        animate={{
                          x: offset * 160,
                          scale: isActive ? 1.1 : 0.85,
                          opacity: isActive ? 1 : 0.5,
                          zIndex: isActive ? 10 : 5,
                        }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="absolute w-44 h-56 bg-neutral-800 rounded-[32px] border border-white/10 overflow-hidden flex flex-col items-center p-4 shadow-2xl cursor-pointer"
                        onClick={() => {
                          if (isActive) {
                            setSelectedOnlineMode(mode.id as GameMode);
                            setShowOnlineModeOptions(false);
                            setShowOnlineOptions(true);
                          } else {
                            setSelectedSoloModeIndex(index);
                          }
                        }}
                      >
                        <div className={`w-16 h-16 bg-black/40 rounded-2xl mb-4 flex items-center justify-center shadow-inner ${isActive ? 'ring-2 ring-blue-500/50' : ''}`}>
                          {React.cloneElement(mode.icon as React.ReactElement<any>, { size: 32 })}
                        </div>
                        
                        <div className="text-center">
                          <h3 className="font-black text-sm uppercase tracking-tighter mb-1">{mode.title}</h3>
                          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{mode.subtitle}</p>
                        </div>

                        {isActive && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-auto w-full"
                          >
                            <button className="w-full py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20">
                              Select Mode
                            </button>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-center gap-1.5 mt-4">
                {soloModes.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1 rounded-full transition-all ${i === selectedSoloModeIndex ? 'w-6 bg-blue-500' : 'w-2 bg-white/10'}`} 
                  />
                ))}
              </div>
            </motion.div>
          ) : showFriendOptions ? (
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="w-full"
            >
              <div className="flex items-center justify-between mb-6 px-2">
                <h2 className="text-xl font-black italic uppercase tracking-tighter text-orange-500">With Friends</h2>
                <button onClick={() => {
                  SoundService.play('click');
                  setShowFriendOptions(false);
                  setShowMultiplayerOptions(true);
                }} className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors">Back</button>
              </div>

              <div className="relative flex items-center justify-center py-8 overflow-visible">
                <div className="flex items-center justify-center w-full h-[240px] relative">
                  {friendModes.map((mode, index) => {
                    const offset = index - selectedFriendModeIndex;
                    const isActive = index === selectedFriendModeIndex;
                    
                    if (Math.abs(offset) > 1) return null;

                    return (
                      <motion.div
                        key={mode.id}
                        initial={false}
                        animate={{
                          x: offset * 160,
                          scale: isActive ? 1.1 : 0.85,
                          opacity: isActive ? 1 : 0.5,
                          zIndex: isActive ? 10 : 5,
                        }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="absolute w-44 h-56 bg-neutral-800 rounded-[32px] border border-white/10 overflow-hidden flex flex-col items-center p-4 shadow-2xl cursor-pointer"
                        onClick={() => {
                          if (isActive) onJoinLobby(2, mode.id as GameMode, selectedColor);
                          else setSelectedFriendModeIndex(index);
                        }}
                      >
                        <div className={`w-16 h-16 bg-black/40 rounded-2xl mb-4 flex items-center justify-center shadow-inner ${isActive ? 'ring-2 ring-orange-500/50' : ''}`}>
                          {React.cloneElement(mode.icon as React.ReactElement<any>, { size: 32 })}
                        </div>
                        
                        <div className="text-center">
                          <h3 className="font-black text-sm uppercase tracking-tighter mb-1">{mode.title}</h3>
                          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{mode.subtitle}</p>
                        </div>

                        {isActive && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-auto w-full"
                          >
                            <button className="w-full py-2 bg-orange-500 hover:bg-orange-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20">
                              Create Room
                            </button>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-center gap-1.5 mt-4">
                {friendModes.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1 rounded-full transition-all ${i === selectedFriendModeIndex ? 'w-6 bg-orange-500' : 'w-2 bg-white/10'}`} 
                  />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="w-full"
            >
              <div className="flex items-center justify-between mb-6 px-2">
                <h2 className="text-xl font-black italic uppercase tracking-tighter text-blue-500">Online Arenas</h2>
                <button onClick={() => {
                  SoundService.play('click');
                  setShowOnlineOptions(false);
                  setShowOnlineModeOptions(true);
                }} className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors">Back</button>
              </div>

              <div className="relative flex items-center justify-center py-8 overflow-visible">
                {/* Navigation Buttons */}
                <button 
                  onClick={prevArena}
                  className="absolute left-0 z-20 p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all"
                >
                  <Globe size={20} className="rotate-180" />
                </button>
                
                <button 
                  onClick={nextArena}
                  className="absolute right-0 z-20 p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all"
                >
                  <Globe size={20} />
                </button>

                <div className="flex items-center justify-center w-full h-[280px] relative">
                  {arenas.map((arena, index) => {
                    const offset = index - selectedArenaIndex;
                    const isActive = index === selectedArenaIndex;
                    const isPrev = index === (selectedArenaIndex - 1 + arenas.length) % arenas.length;
                    const isNext = index === (selectedArenaIndex + 1) % arenas.length;

                    if (!isActive && !isPrev && !isNext) return null;

                    return (
                      <motion.div
                        key={arena.id}
                        initial={false}
                        animate={{
                          x: offset * 140,
                          scale: isActive ? 1.1 : 0.8,
                          opacity: isActive ? 1 : 0.4,
                          zIndex: isActive ? 10 : 5,
                        }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="absolute w-48 h-64 bg-neutral-800 rounded-[32px] border border-white/10 overflow-hidden flex flex-col items-center p-4 shadow-2xl cursor-pointer"
                        onClick={() => {
                          if (isActive) onStartOnline(arena, selectedOnlineMode || 'classic', selectedColor);
                          else setSelectedArenaIndex(index);
                        }}
                      >
                        <div className="w-full aspect-square bg-black/40 rounded-2xl mb-4 flex items-center justify-center relative overflow-hidden group">
                          <img 
                            src={arena.image || `https://picsum.photos/seed/${arena.id}/200/200`} 
                            alt={arena.name} 
                            className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                          <Globe className={`absolute text-blue-400 w-8 h-8 ${isActive ? 'animate-pulse' : ''}`} />
                        </div>
                        
                        <div className="text-center">
                          <h3 className="font-black text-sm uppercase tracking-tighter mb-1">{arena.name}</h3>
                          <div className="flex items-center justify-center gap-1 bg-blue-500/10 px-2 py-1 rounded-full border border-blue-500/20">
                            <Coins size={10} className="text-yellow-500" />
                            <span className="text-[10px] font-black text-blue-400">{arena.entryFee}</span>
                          </div>
                        </div>

                        {isActive && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 w-full"
                          >
                            <button className="w-full py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20">
                              Play Now
                            </button>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-center gap-1.5 mt-4">
                {arenas.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1 rounded-full transition-all ${i === selectedArenaIndex ? 'w-6 bg-blue-500' : 'w-2 bg-white/10'}`} 
                  />
                ))}
              </div>
            </motion.div>
          )}

          {user.isAdmin && (
            <MenuButton 
              icon={<Shield className="text-red-500" />} 
              title="Admin Panel" 
              subtitle="Manage Players"
              onClick={onOpenAdmin}
              variant="secondary"
            />
          )}

          <div className="pt-4 flex justify-center space-x-4">
            <IconButton icon={<MessageCircle />} onClick={onOpenFeedback} />
            <IconButton icon={<LogOut />} onClick={onLogout} color="text-red-500" />
          </div>
        </div>

          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              SoundService.play('click');
              onOpenProfile(user);
            }}
            className="mt-8 flex items-center space-x-3 bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 cursor-pointer"
          >
          <div className="w-10 h-10 rounded-xl bg-neutral-800 overflow-hidden border border-white/10">
            <img src={`https://picsum.photos/seed/${user.name}/100/100`} alt="Avatar" referrerPolicy="no-referrer" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">My Profile</p>
            <p className="text-sm font-black">{user.name}</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

const MenuButton: React.FC<{ 
  icon: React.ReactNode; 
  title: string; 
  subtitle: string; 
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  compact?: boolean;
}> = ({ icon, title, subtitle, onClick, variant = 'primary', compact = false }) => (
  <motion.button
    whileHover={{ scale: 1.02, x: 5 }}
    whileTap={{ scale: 0.98 }}
    onClick={() => {
      SoundService.play('click');
      onClick();
    }}
    className={`w-full flex items-center rounded-[24px] border transition-all text-left ${
      compact ? 'p-3' : 'p-4'
    } ${
      variant === 'primary' 
        ? 'bg-white/5 border-white/10 hover:bg-white/10' 
        : 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20'
    }`}
  >
    <div className={`${compact ? 'p-2' : 'p-3'} bg-black/40 rounded-xl mr-4 shadow-inner`}>
      {icon}
    </div>
    <div>
      <h3 className={`font-black leading-tight ${compact ? 'text-sm' : 'text-base'}`}>{title}</h3>
      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">{subtitle}</p>
    </div>
  </motion.button>
);

const IconButton: React.FC<{ icon: React.ReactNode; onClick?: () => void; color?: string }> = ({ icon, onClick, color = "text-neutral-400" }) => (
  <motion.button
    whileHover={{ scale: 1.1, y: -2 }}
    whileTap={{ scale: 0.9 }}
    onClick={() => {
      SoundService.play('click');
      onClick?.();
    }}
    className={`p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors ${color}`}
  >
    {icon}
  </motion.button>
);

export default Menu;
