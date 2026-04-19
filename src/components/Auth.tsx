import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AuthService } from '../services/authService';
import { User } from '../types';

interface AuthProps {
  onAuthSuccess: (user: User) => void;
  onSwitchToSignup: () => void;
  onSwitchToLogin: () => void;
  mode: 'login' | 'signup';
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess, onSwitchToSignup, onSwitchToLogin, mode }) => {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (mode === 'signup') {
        const user = await AuthService.signup(name, key);
        if (user.isAdmin || user.isApproved) {
          onAuthSuccess(user);
        } else {
          setError('Signup successful! Please wait for Rahee to approve your account.');
        }
      } else {
        const user = await AuthService.login(name, key);
        onAuthSuccess(user);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white p-6">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-neutral-800 p-8 rounded-[40px] border border-white/10 shadow-2xl"
      >
        <h1 className="text-4xl font-black italic tracking-tighter text-center mb-8">
          {mode === 'login' ? 'LOGIN' : 'SIGNUP'}
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-4">Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-neutral-900 border border-white/5 rounded-2xl p-4 focus:border-orange-500 outline-none transition-colors"
              placeholder="Enter your name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-4">RaheeKey</label>
            <input 
              type="password" 
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full bg-neutral-900 border border-white/5 rounded-2xl p-4 focus:border-orange-500 outline-none transition-colors"
              placeholder="Enter your key"
              required
            />
          </div>

          {error && (
            <p className={`text-sm text-center font-semibold ${error.includes('successful') ? 'text-green-500' : 'text-red-500'}`}>
              {error}
            </p>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl font-black tracking-widest hover:from-orange-300 hover:to-orange-500 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'PROCESSING...' : (mode === 'login' ? 'ENTER GAME' : 'CREATE ACCOUNT')}
          </button>
        </form>

        <div className="mt-8 text-center">
          {mode === 'login' ? (
            <p className="text-neutral-400 text-sm">
              Don't have an account?{' '}
              <button onClick={onSwitchToSignup} className="text-orange-500 font-bold hover:underline">Sign Up</button>
            </p>
          ) : (
            <p className="text-neutral-400 text-sm">
              Already have an account?{' '}
              <button onClick={onSwitchToLogin} className="text-orange-500 font-bold hover:underline">Log In</button>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
