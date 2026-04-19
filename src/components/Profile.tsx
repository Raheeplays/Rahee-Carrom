import React from 'react';
import { motion } from 'motion/react';
import { User } from '../types';
import { Trophy, Coins, Diamond, ArrowLeft, Calendar, ShieldCheck } from 'lucide-react';

interface ProfileProps {
  user: User;
  currentUser?: User;
  onBack: () => void;
  backLabel?: string;
  onLogout?: () => void;
  onSendFriendRequest?: (userId: string) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, currentUser, onBack, backLabel = 'Back to Menu', onLogout, onSendFriendRequest }) => {
  const winRate = user.wins + user.losses > 0 
    ? ((user.wins / (user.wins + user.losses)) * 100).toFixed(1) 
    : '0';

  const isFriend = currentUser?.friends?.includes(user.id);
  const isSelf = currentUser?.id === user.id;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 font-sans flex flex-col items-center">
      <div className="w-full max-w-md">
        <button 
          onClick={onBack}
          className="mb-8 flex items-center text-neutral-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="mr-2" size={20} />
          <span className="font-bold tracking-widest uppercase text-xs">{backLabel}</span>
        </button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 rounded-[40px] border border-white/10 p-8 text-center relative overflow-hidden"
        >
          {/* Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-orange-500/20 rounded-full blur-[80px] -z-10" />

          <div className="relative inline-block mb-6">
            <div className="w-32 h-32 rounded-[32px] bg-neutral-800 overflow-hidden border-4 border-orange-500 shadow-2xl">
              <img 
                src={`https://picsum.photos/seed/${user.name}/200/200`} 
                alt="Avatar" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            {user.isAdmin && (
              <div className="absolute -bottom-2 -right-2 bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border-2 border-neutral-950">
                Admin
              </div>
            )}
          </div>

          <h2 className="text-3xl font-black italic tracking-tighter mb-1">{user.name}</h2>
          <p className="text-neutral-500 font-bold tracking-widest uppercase text-[10px] mb-6">Player ID: {user.id}</p>

          {!isSelf && !isFriend && onSendFriendRequest && (
            <button 
              onClick={() => onSendFriendRequest(user.id)}
              className="mb-8 w-full py-3 bg-blue-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
            >
              Send Friend Request
            </button>
          )}

          {isFriend && (
            <div className="mb-8 w-full py-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center space-x-2">
              <ShieldCheck size={14} />
              <span>Already Friends</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <StatCard 
              icon={<Coins className="text-yellow-500" size={16} />} 
              label="Rahee Coins" 
              value={user.raheeCoins.toLocaleString()} 
            />
            <StatCard 
              icon={<Trophy className="text-orange-500" size={16} />} 
              label="Rank" 
              value={`Rank ${user.rank || 1}`} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <StatCard 
              icon={<Diamond className="text-blue-400" size={16} />} 
              label="Rahee Diamonds" 
              value={user.raheeDiamonds.toLocaleString()} 
            />
            <StatCard 
              icon={<ShieldCheck className="text-blue-500" size={16} />} 
              label="Total XP" 
              value={(user.xp || 0).toLocaleString()} 
            />
          </div>

          <div className="bg-black/40 rounded-3xl p-6 border border-white/5 space-y-6">
            <div className="flex justify-between items-center">
              <div className="text-left">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter mb-1">Win Rate</p>
                <p className="text-2xl font-black italic text-orange-500">{winRate}%</p>
              </div>
              <Trophy className="text-orange-500/20" size={48} />
            </div>

            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-white/5">
              <div className="text-left">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">Wins</p>
                <p className="text-xl font-black">{user.wins}</p>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">Losses</p>
                <p className="text-xl font-black">{user.losses}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center space-y-4">
            <div className="flex items-center justify-center text-neutral-600 space-x-2">
              <Calendar size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Joined {new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
            
            <button 
              onClick={() => {
                if (onLogout) {
                  onLogout();
                } else {
                  localStorage.removeItem('rahee_user');
                  window.location.reload();
                }
              }}
              className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl font-black uppercase tracking-widest hover:bg-red-500/20 transition-all text-xs"
            >
              Logout Account
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-left">
    <div className="flex items-center space-x-2 mb-1">
      {icon}
      <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-lg font-black tracking-tight">{value}</p>
  </div>
);

export default Profile;
