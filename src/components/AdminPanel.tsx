import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AuthService } from '../services/authService';
import { Check, X, ShieldCheck, Users, MessageSquare, Trophy, Coins, Diamond, Trash2, ArrowLeft, Maximize, Globe, Bot, Plus, Edit, Shield, Target, Zap } from 'lucide-react';
import { ArenaService, BotService, ConfigService } from '../services/gameService';
import { User, Feedback, Arena, BotPlayer, AiConfig } from '../types';

interface AdminPanelProps {
  onBack: () => void;
}

type AdminTab = 'approvals' | 'players' | 'feedback' | 'layout' | 'arenas' | 'bots' | 'ai';

const AdminPanel: React.FC<AdminPanelProps & { onEnterEditor: () => void }> = ({ onBack, onEnterEditor }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [bots, setBots] = useState<BotPlayer[]>([]);
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('approvals');

  const [editingArena, setEditingArena] = useState<Arena | null>(null);
  const [editingBot, setEditingBot] = useState<BotPlayer | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Partial<User> | null>(null);
  const [editingAiUser, setEditingAiUser] = useState<User | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleUpdateStats = async (userId: string, stats: Partial<User>) => {
    try {
      await AuthService.updateUserStats(userId, stats);
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...stats } : u));
      setEditingUser(null);
      setEditingPlayer(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePlayer = async (playerData: Partial<User>) => {
    if (!playerData.name || !playerData.key) return;
    const normalizedName = playerData.name.trim().toLowerCase();
    const newUser: User = {
      id: normalizedName,
      name: normalizedName,
      key: playerData.key,
      raheeCoins: playerData.raheeCoins || 1000,
      raheeDiamonds: playerData.raheeDiamonds || 0,
      xp: playerData.xp || 0,
      rank: playerData.rank || 1,
      wins: 0,
      losses: 0,
      isAdmin: false,
      isApproved: true,
      friends: [],
      createdAt: new Date().toISOString()
    };
    await AuthService.saveUser(newUser);
    setEditingPlayer(null);
    loadData();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'approvals') {
        const data = await AuthService.getUnapprovedUsers();
        setUsers(data);
      } else if (activeTab === 'players') {
        const data = await AuthService.getAllUsers();
        setAllUsers(data);
      } else if (activeTab === 'feedback') {
        const data = await AuthService.getFeedback();
        setFeedbacks(data);
      } else if (activeTab === 'arenas') {
        const data = await ArenaService.getArenas();
        setArenas(data);
      } else if (activeTab === 'bots') {
        const data = await BotService.getBots();
        setBots(data);
      } else if (activeTab === 'ai') {
        const data = await ConfigService.getAiConfig();
        setAiConfig(data);
        const users = await AuthService.getAllUsers();
        setAllUsers(users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      await AuthService.approveUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this player?')) return;
    try {
      await AuthService.deleteUser(userId);
      setAllUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-neutral-900 border-r border-white/10 flex flex-col p-6">
        <div className="flex items-center space-x-3 mb-12">
          <div className="p-2 bg-orange-500 rounded-xl shadow-lg shadow-orange-500/20">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-black italic tracking-tighter uppercase">Admin</h1>
        </div>

        <div className="flex-1 space-y-2">
          <SidebarItem 
            active={activeTab === 'approvals'} 
            onClick={() => setActiveTab('approvals')} 
            icon={<Check size={18} />} 
            label="Approvals" 
            count={users.length}
          />
          <SidebarItem 
            active={activeTab === 'players'} 
            onClick={() => setActiveTab('players')} 
            icon={<Users size={18} />} 
            label="Players" 
          />
          <SidebarItem 
            active={activeTab === 'feedback'} 
            onClick={() => setActiveTab('feedback')} 
            icon={<MessageSquare size={18} />} 
            label="Feedback" 
          />
          <SidebarItem 
            active={activeTab === 'arenas'} 
            onClick={() => setActiveTab('arenas')} 
            icon={<Globe size={18} />} 
            label="Arenas" 
          />
          <SidebarItem 
            active={activeTab === 'bots'} 
            onClick={() => setActiveTab('bots')} 
            icon={<Bot size={18} />} 
            label="Bots" 
          />
          <SidebarItem 
            active={activeTab === 'ai'} 
            onClick={() => setActiveTab('ai')} 
            icon={<Shield size={18} />} 
            label="AI Config" 
          />
          <SidebarItem 
            active={activeTab === 'layout'} 
            onClick={onEnterEditor} 
            icon={<Maximize size={18} />} 
            label="Layout Editor" 
          />
        </div>

        <button 
          onClick={onBack}
          className="mt-auto flex items-center space-x-3 px-4 py-3 bg-white/5 rounded-xl font-black tracking-widest uppercase text-[10px] hover:bg-white/10 transition-all border border-white/10"
        >
          <ArrowLeft size={14} />
          <span>Back to Menu</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black italic tracking-tighter uppercase">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h2>
            {activeTab === 'players' && (
              <button 
                onClick={() => setEditingPlayer({ name: '', key: '', raheeCoins: 1000, raheeDiamonds: 0, xp: 0, rank: 1 })}
                className="flex items-center space-x-2 px-6 py-3 bg-orange-500 rounded-2xl font-black tracking-widest uppercase text-xs hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
              >
                <Plus size={16} />
                <span>Create Player</span>
              </button>
            )}
            {activeTab === 'arenas' && (
              <button 
                onClick={() => setEditingArena({ id: 'arena_' + Date.now(), name: '', entryFee: 100, gameFeePercent: 10 })}
                className="flex items-center space-x-2 px-6 py-3 bg-orange-500 rounded-2xl font-black tracking-widest uppercase text-xs hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
              >
                <Plus size={16} />
                <span>Add Arena</span>
              </button>
            )}
            {activeTab === 'bots' && (
              <button 
                onClick={() => setEditingBot({ id: 'bot_' + Date.now(), name: '', rank: 1, xp: 0 })}
                className="flex items-center space-x-2 px-6 py-3 bg-orange-500 rounded-2xl font-black tracking-widest uppercase text-xs hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
              >
                <Plus size={16} />
                <span>Add Bot</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-[400px]">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {activeTab === 'approvals' && (
                <div className="space-y-4">
                  {users.length === 0 ? (
                    <EmptyState message="No pending approvals" />
                  ) : (
                    users.map(user => (
                      <motion.div 
                        key={user.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="flex items-center justify-between p-6 bg-black/40 rounded-3xl border border-white/5"
                      >
                        <div>
                          <p className="text-xl font-black text-white">{user.name}</p>
                          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Key: {user.key}</p>
                        </div>
                        <div className="flex space-x-3">
                          <button 
                            onClick={() => handleApprove(user.id)}
                            className="p-4 bg-green-500/10 text-green-500 rounded-2xl hover:bg-green-500 hover:text-white transition-all border border-green-500/20"
                          >
                            <Check size={24} />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                          >
                            <Trash2 size={24} />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}

            {activeTab === 'players' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter">Manage Real Players</h2>
                  <button 
                    onClick={() => setEditingPlayer({ name: '', key: '', raheeCoins: 1000, raheeDiamonds: 0, xp: 0, rank: 1 })}
                    className="flex items-center space-x-2 px-4 py-2 bg-orange-500 rounded-xl font-black text-[10px] uppercase tracking-widest"
                  >
                    <Plus size={14} />
                    <span>Add Player</span>
                  </button>
                </div>

                {editingPlayer && (
                  <div className="p-6 bg-white/5 rounded-3xl border border-orange-500/30 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">Player Name</label>
                        <input 
                          type="text" 
                          value={editingPlayer.name || ''}
                          onChange={e => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                          className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm"
                          placeholder="e.g. Rahee_Fan"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">Access Key</label>
                        <input 
                          type="text" 
                          value={editingPlayer.key || ''}
                          onChange={e => setEditingPlayer({ ...editingPlayer, key: e.target.value })}
                          className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm"
                          placeholder="e.g. 123456"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">Coins</label>
                        <input 
                          type="number" 
                          value={editingPlayer.raheeCoins || 0}
                          onChange={e => setEditingPlayer({ ...editingPlayer, raheeCoins: parseInt(e.target.value) || 0 })}
                          className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button 
                        onClick={() => handleCreatePlayer(editingPlayer)}
                        className="flex-1 py-3 bg-orange-500 rounded-xl font-black text-xs uppercase tracking-widest"
                      >
                        Create Player
                      </button>
                      <button 
                        onClick={() => setEditingPlayer(null)}
                        className="flex-1 py-3 bg-white/10 rounded-xl font-black text-xs uppercase tracking-widest"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allUsers.length === 0 ? (
                      <EmptyState message="No players found" />
                    ) : (
                      allUsers.map(user => (
                        <motion.div 
                          key={user.id}
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="p-6 bg-black/40 rounded-3xl border border-white/5 flex flex-col"
                        >
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 rounded-xl bg-neutral-800 overflow-hidden border border-white/10">
                                <img src={`https://picsum.photos/seed/${user.name}/100/100`} alt="Avatar" referrerPolicy="no-referrer" />
                              </div>
                              <div>
                                <p className="text-lg font-black">{user.name}</p>
                                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">ID: {user.id}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button 
                                onClick={() => setEditingUser(user)}
                                className="p-3 text-neutral-600 hover:text-blue-500 transition-colors"
                              >
                                <Edit size={18} />
                              </button>
                              {!user.isAdmin && (
                                <button 
                                  onClick={() => {
                                    if (window.confirm('Delete this player?')) {
                                      handleDeleteUser(user.id);
                                    }
                                  }}
                                  className="p-3 text-neutral-600 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-6">
                            <MiniStat key="coins" icon={<Coins size={12} className="text-yellow-500" />} label="Coins" value={user.raheeCoins || 0} />
                            <MiniStat key="diamonds" icon={<Diamond size={12} className="text-blue-400" />} label="Diamonds" value={user.raheeDiamonds || 0} />
                            <MiniStat key="wins" icon={<Trophy size={12} className="text-green-500" />} label="Wins" value={user.wins || 0} />
                            <MiniStat key="losses" icon={<X size={12} className="text-red-500" />} label="Losses" value={user.losses || 0} />
                          </div>

                        {editingUser && editingUser.id === user.id ? (
                          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 mb-4 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[8px] font-bold text-neutral-500 uppercase">Coins</label>
                                <input 
                                  type="number" 
                                  value={editingUser.raheeCoins || 0}
                                  onChange={e => setEditingUser({ ...editingUser, raheeCoins: parseInt(e.target.value) || 0 })}
                                  className="w-full bg-black/40 border border-white/10 p-2 rounded-xl text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] font-bold text-neutral-500 uppercase">Diamonds</label>
                                <input 
                                  type="number" 
                                  value={editingUser.raheeDiamonds || 0}
                                  onChange={e => setEditingUser({ ...editingUser, raheeDiamonds: parseInt(e.target.value) || 0 })}
                                  className="w-full bg-black/40 border border-white/10 p-2 rounded-xl text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] font-bold text-neutral-500 uppercase">XP</label>
                                <input 
                                  type="number" 
                                  value={editingUser.xp || 0}
                                  onChange={e => setEditingUser({ ...editingUser, xp: parseInt(e.target.value) || 0 })}
                                  className="w-full bg-black/40 border border-white/10 p-2 rounded-xl text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] font-bold text-neutral-500 uppercase">Rank</label>
                                <input 
                                  type="number" 
                                  value={editingUser.rank || 0}
                                  onChange={e => setEditingUser({ ...editingUser, rank: parseInt(e.target.value) || 0 })}
                                  className="w-full bg-black/40 border border-white/10 p-2 rounded-xl text-xs"
                                />
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => handleUpdateStats(user.id, editingUser)}
                                className="flex-1 py-2 bg-orange-500 rounded-xl font-black text-[10px] uppercase tracking-widest"
                              >
                                Save
                              </button>
                              <button 
                                onClick={() => setEditingUser(null)}
                                className="flex-1 py-2 bg-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setEditingUser(user)}
                            className="mb-4 py-2 bg-white/5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-colors border border-white/10"
                          >
                            Edit Stats
                          </button>
                        )}

                        <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${user.isApproved ? 'text-green-500' : 'text-yellow-500'}`}>
                            {user.isApproved ? 'Approved' : 'Pending'}
                          </span>
                          {user.isAdmin && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-red-500 px-2 py-1 bg-red-500/10 rounded-lg">Admin</span>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                  </div>
                </div>
              )}

              {activeTab === 'feedback' && (
                <div className="space-y-4">
                  {feedbacks.length === 0 ? (
                    <EmptyState message="No feedback received" />
                  ) : (
                    feedbacks.map(fb => (
                      <motion.div 
                        key={fb.id}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="p-6 bg-black/40 rounded-3xl border border-white/5"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-sm font-black text-white">{fb.userName}</p>
                            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                              {new Date(fb.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <MessageSquare className="text-orange-500/20" size={24} />
                        </div>
                        <p className="text-sm text-neutral-300 leading-relaxed font-bold italic">"{fb.message}"</p>
                      </motion.div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'layout' && (
                <div className="flex flex-col items-center justify-center h-[500px] space-y-8">
                  <div className="p-8 bg-orange-500/10 rounded-[40px] border border-orange-500/20">
                    <Maximize className="text-orange-500 w-24 h-24" />
                  </div>
                  <div className="text-center max-w-md">
                    <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-2">Board Layout Editor</h2>
                    <p className="text-neutral-500 font-bold text-sm leading-relaxed">
                      Visually adjust the size and position of all board elements. Changes will be applied globally to all players.
                    </p>
                  </div>
                  <button 
                    onClick={onEnterEditor}
                    className="px-12 py-4 bg-orange-500 rounded-2xl font-black italic uppercase tracking-tighter text-xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all"
                  >
                    Open Visual Editor
                  </button>
                </div>
              )}

              {activeTab === 'arenas' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">Manage Arenas</h2>
                    <button 
                      onClick={() => setEditingArena({ id: 'arena_' + Date.now(), name: '', entryFee: 100, gameFeePercent: 10 })}
                      className="flex items-center space-x-2 px-4 py-2 bg-orange-500 rounded-xl font-black text-[10px] uppercase tracking-widest"
                    >
                      <Plus size={14} />
                      <span>Add Arena</span>
                    </button>
                  </div>

                  {editingArena && (
                    <div className="p-6 bg-white/5 rounded-3xl border border-orange-500/30 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase">Arena Name</label>
                          <input 
                            type="text" 
                            value={editingArena.name}
                            onChange={e => setEditingArena({ ...editingArena, name: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm"
                            placeholder="e.g. Rahee City"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase">Entry Fee</label>
                          <input 
                            type="number" 
                            value={editingArena.entryFee}
                            onChange={e => setEditingArena({ ...editingArena, entryFee: parseInt(e.target.value) })}
                            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase">Game Fee %</label>
                          <input 
                            type="number" 
                            value={editingArena.gameFeePercent}
                            onChange={e => setEditingArena({ ...editingArena, gameFeePercent: parseInt(e.target.value) })}
                            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <button 
                          onClick={async () => {
                            await ArenaService.saveArena(editingArena);
                            setEditingArena(null);
                            loadData();
                          }}
                          className="flex-1 py-3 bg-orange-500 rounded-xl font-black text-xs uppercase tracking-widest"
                        >
                          Save Arena
                        </button>
                        <button 
                          onClick={() => setEditingArena(null)}
                          className="flex-1 py-3 bg-white/10 rounded-xl font-black text-xs uppercase tracking-widest"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {arenas.map(arena => (
                      <div key={arena.id} className="p-6 bg-black/40 rounded-3xl border border-white/5 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-black text-white">{arena.name}</h3>
                            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">ID: {arena.id}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button onClick={() => setEditingArena(arena)} className="p-2 text-neutral-500 hover:text-white"><Maximize size={16} /></button>
                            <button onClick={async () => {
                              if (window.confirm('Delete this arena?')) {
                                await ArenaService.deleteArena(arena.id);
                                loadData();
                              }
                            }} className="p-2 text-neutral-500 hover:text-red-500"><Trash2 size={16} /></button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                            <p className="text-[8px] font-bold text-neutral-500 uppercase mb-1">Entry Fee</p>
                            <p className="text-sm font-black text-yellow-500">{arena.entryFee} Coins</p>
                          </div>
                          <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                            <p className="text-[8px] font-bold text-neutral-500 uppercase mb-1">House Cut</p>
                            <p className="text-sm font-black text-orange-500">{arena.gameFeePercent}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'bots' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">Manage Bot Players</h2>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => {
                          const names = prompt('Enter bot names separated by commas:');
                          if (names) {
                            const nameList = names.split(',').map(n => n.trim()).filter(n => n);
                            nameList.forEach(async (name) => {
                              await BotService.saveBot({
                                id: 'bot_' + Date.now() + Math.random().toString(36).substr(2, 5),
                                name,
                                rank: Math.floor(Math.random() * 10) + 1,
                                xp: Math.floor(Math.random() * 1000)
                              });
                            });
                            setTimeout(loadData, 1000);
                          }
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-500 rounded-xl font-black text-[10px] uppercase tracking-widest"
                      >
                        <Plus size={14} />
                        <span>Bulk Add</span>
                      </button>
                      <button 
                        onClick={() => setEditingBot({ id: 'bot_' + Date.now(), name: '', rank: 1, xp: 0 })}
                        className="flex items-center space-x-2 px-4 py-2 bg-orange-500 rounded-xl font-black text-[10px] uppercase tracking-widest"
                      >
                        <Plus size={14} />
                        <span>Add Bot</span>
                      </button>
                    </div>
                  </div>

                  {editingBot && (
                    <div className="p-6 bg-white/5 rounded-3xl border border-orange-500/30 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase">Bot Name</label>
                          <input 
                            type="text" 
                            value={editingBot.name}
                            onChange={e => setEditingBot({ ...editingBot, name: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm"
                            placeholder="e.g. Pro_Player"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase">Rank</label>
                          <input 
                            type="number" 
                            value={editingBot.rank}
                            onChange={e => setEditingBot({ ...editingBot, rank: parseInt(e.target.value) })}
                            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase">XP</label>
                          <input 
                            type="number" 
                            value={editingBot.xp}
                            onChange={e => setEditingBot({ ...editingBot, xp: parseInt(e.target.value) })}
                            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <button 
                          onClick={async () => {
                            await BotService.saveBot(editingBot);
                            setEditingBot(null);
                            loadData();
                          }}
                          className="flex-1 py-3 bg-orange-500 rounded-xl font-black text-xs uppercase tracking-widest"
                        >
                          Save Bot
                        </button>
                        <button 
                          onClick={() => setEditingBot(null)}
                          className="flex-1 py-3 bg-white/10 rounded-xl font-black text-xs uppercase tracking-widest"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {bots.map(bot => (
                      <div key={bot.id} className="p-6 bg-black/40 rounded-3xl border border-white/5 flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-neutral-800 overflow-hidden border border-white/10 mb-4">
                          <img src={`https://picsum.photos/seed/${bot.name}/100/100`} alt="Bot" referrerPolicy="no-referrer" />
                        </div>
                        <h3 className="text-lg font-black text-white mb-1">{bot.name}</h3>
                        <div className="flex space-x-2 mb-4">
                          <span className="px-2 py-1 bg-orange-500/10 text-orange-500 rounded-lg text-[8px] font-black uppercase">Rank {bot.rank}</span>
                          <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-[8px] font-black uppercase">{bot.xp} XP</span>
                        </div>
                        <div className="flex space-x-2 w-full">
                          <button onClick={() => setEditingBot(bot)} className="flex-1 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase hover:bg-white/10 transition-colors">Edit</button>
                          <button onClick={async () => {
                            if (window.confirm('Delete this bot?')) {
                              await BotService.deleteBot(bot.id);
                              loadData();
                            }
                          }} className="p-2 text-neutral-500 hover:text-red-500"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'ai' && aiConfig && (
                <div className="space-y-8">
                  <div className="p-8 bg-white/5 rounded-[32px] border border-white/10">
                    <div className="flex items-center space-x-4 mb-8">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                        <Shield className="text-blue-500" size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black italic uppercase tracking-tighter">Global AI Settings</h3>
                        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Affects all bot players by default</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Skill Level ({aiConfig.skillLevel}%)</label>
                          <Target size={14} className="text-blue-500" />
                        </div>
                        <input 
                          type="range" min="0" max="100" 
                          value={aiConfig.skillLevel}
                          onChange={e => setAiConfig({ ...aiConfig, skillLevel: parseInt(e.target.value) })}
                          className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Power Multiplier ({aiConfig.powerMultiplier}x)</label>
                          <Zap size={14} className="text-orange-500" />
                        </div>
                        <input 
                          type="range" min="50" max="150" 
                          value={aiConfig.powerMultiplier * 100}
                          onChange={e => setAiConfig({ ...aiConfig, powerMultiplier: parseInt(e.target.value) / 100 })}
                          className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-500"
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Accuracy ({aiConfig.accuracy}%)</label>
                          <ShieldCheck size={14} className="text-green-500" />
                        </div>
                        <input 
                          type="range" min="0" max="100" 
                          value={aiConfig.accuracy}
                          onChange={e => setAiConfig({ ...aiConfig, accuracy: parseInt(e.target.value) })}
                          className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-green-500"
                        />
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Behavior Profile</label>
                        <select 
                          value={aiConfig.behavior}
                          onChange={e => setAiConfig({ ...aiConfig, behavior: e.target.value as any })}
                          className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm font-bold uppercase tracking-widest"
                        >
                          <option value="noob">Noob (Random & Weak)</option>
                          <option value="balanced">Balanced (Human-like)</option>
                          <option value="pro">Pro (Aggressive & Precise)</option>
                          <option value="aggressive">Aggressive (High Power)</option>
                        </select>
                      </div>
                    </div>

                    <button 
                      onClick={async () => {
                        await ConfigService.saveAiConfig(aiConfig);
                        alert('Global AI Config Saved!');
                      }}
                      className="w-full mt-8 py-4 bg-blue-500 hover:bg-blue-600 rounded-2xl font-black tracking-widest uppercase text-xs transition-all shadow-lg shadow-blue-500/20"
                    >
                      Save Global Config
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter px-2">Player-Specific AI Override</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {allUsers.map(user => (
                        <div key={user.id} className="p-6 bg-black/40 rounded-3xl border border-white/5 flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-xl bg-neutral-800 overflow-hidden border border-white/10">
                              <img src={`https://picsum.photos/seed/${user.name}/100/100`} alt="User" referrerPolicy="no-referrer" />
                            </div>
                            <div>
                              <p className="font-black text-white">{user.name}</p>
                              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                                {user.aiConfig ? 'Custom Config Active' : 'Using Global Config'}
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setEditingAiUser(user)}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                          >
                            <Edit size={16} className="text-neutral-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {editingAiUser && (
                    <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full max-w-2xl bg-neutral-900 rounded-[40px] border border-white/10 p-8 overflow-hidden relative"
                      >
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                              <Bot className="text-orange-500" size={24} />
                            </div>
                            <div>
                              <h3 className="text-xl font-black italic uppercase tracking-tighter">AI Override: {editingAiUser.name}</h3>
                              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Customize AI behavior for this player</p>
                            </div>
                          </div>
                          <button onClick={() => setEditingAiUser(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                            <X size={24} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                          {/* Same controls as global but for specific user */}
                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Skill Level</label>
                            <input 
                              type="range" min="0" max="100" 
                              value={editingAiUser.aiConfig?.skillLevel ?? 50}
                              onChange={e => setEditingAiUser({ 
                                ...editingAiUser, 
                                aiConfig: { ...(editingAiUser.aiConfig || aiConfig || { skillLevel: 50, accuracy: 50, powerMultiplier: 1, reactionTime: 1000, behavior: 'balanced' }), skillLevel: parseInt(e.target.value) } 
                              })}
                              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-500"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Accuracy</label>
                            <input 
                              type="range" min="0" max="100" 
                              value={editingAiUser.aiConfig?.accuracy ?? 50}
                              onChange={e => setEditingAiUser({ 
                                ...editingAiUser, 
                                aiConfig: { ...(editingAiUser.aiConfig || aiConfig || { skillLevel: 50, accuracy: 50, powerMultiplier: 1, reactionTime: 1000, behavior: 'balanced' }), accuracy: parseInt(e.target.value) } 
                              })}
                              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-green-500"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Power Multiplier</label>
                            <input 
                              type="range" min="50" max="150" 
                              value={(editingAiUser.aiConfig?.powerMultiplier ?? 1) * 100}
                              onChange={e => setEditingAiUser({ 
                                ...editingAiUser, 
                                aiConfig: { ...(editingAiUser.aiConfig || aiConfig || { skillLevel: 50, accuracy: 50, powerMultiplier: 1, reactionTime: 1000, behavior: 'balanced' }), powerMultiplier: parseInt(e.target.value) / 100 } 
                              })}
                              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Behavior</label>
                            <select 
                              value={editingAiUser.aiConfig?.behavior ?? 'balanced'}
                              onChange={e => setEditingAiUser({ 
                                ...editingAiUser, 
                                aiConfig: { ...(editingAiUser.aiConfig || aiConfig || { skillLevel: 50, accuracy: 50, powerMultiplier: 1, reactionTime: 1000, behavior: 'balanced' }), behavior: e.target.value as any } 
                              })}
                              className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm font-bold uppercase tracking-widest"
                            >
                              <option value="noob">Noob</option>
                              <option value="balanced">Balanced</option>
                              <option value="pro">Pro</option>
                              <option value="aggressive">Aggressive</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex space-x-4">
                          <button 
                            onClick={async () => {
                              await AuthService.updateUserStats(editingAiUser.id, { aiConfig: editingAiUser.aiConfig });
                              setAllUsers(prev => prev.map(u => u.id === editingAiUser.id ? editingAiUser : u));
                              setEditingAiUser(null);
                              alert('User AI Config Saved!');
                            }}
                            className="flex-1 py-4 bg-orange-500 rounded-2xl font-black tracking-widest uppercase text-xs shadow-lg shadow-orange-500/20"
                          >
                            Save Override
                          </button>
                          <button 
                            onClick={async () => {
                              await AuthService.updateUserStats(editingAiUser.id, { aiConfig: undefined });
                              setAllUsers(prev => prev.map(u => u.id === editingAiUser.id ? { ...u, aiConfig: undefined } : u));
                              setEditingAiUser(null);
                              alert('Override Removed');
                            }}
                            className="flex-1 py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-black tracking-widest uppercase text-xs"
                          >
                            Remove Override
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SidebarItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }> = ({ active, onClick, icon, label, count }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-4 rounded-2xl font-black tracking-widest uppercase text-[10px] transition-all ${
      active ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-neutral-500 hover:text-white hover:bg-white/5'
    }`}
  >
    {icon}
    <span>{label}</span>
    {count !== undefined && count > 0 && (
      <span className={`ml-auto px-2 py-0.5 rounded-full text-[8px] ${active ? 'bg-white text-orange-500' : 'bg-orange-500 text-white'}`}>
        {count}
      </span>
    )}
  </button>
);

const MiniStat: React.FC<{ icon: React.ReactNode; label: string; value: number }> = ({ icon, label, value }) => (
  <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
    <div className="flex items-center space-x-2 mb-1">
      {icon}
      <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-tighter">{label}</span>
    </div>
    <p className="text-sm font-black">{value?.toLocaleString() ?? '0'}</p>
  </div>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center h-[400px] text-neutral-600">
    <X size={48} className="mb-4 opacity-20" />
    <p className="text-xs font-black uppercase tracking-widest">{message}</p>
  </div>
);

export default AdminPanel;
