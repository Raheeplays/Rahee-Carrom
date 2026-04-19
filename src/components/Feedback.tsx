import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User } from '../types';
import { AuthService } from '../services/authService';
import { ArrowLeft, Send, CheckCircle } from 'lucide-react';

interface FeedbackProps {
  user: User;
  onBack: () => void;
}

const Feedback: React.FC<FeedbackProps> = ({ user, onBack }) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      await AuthService.submitFeedback(user.id, user.name, message);
      setIsSuccess(true);
      setMessage('');
    } catch (error) {
      console.error('Feedback error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 font-sans flex flex-col items-center">
      <div className="w-full max-w-md">
        <button 
          onClick={onBack}
          className="mb-8 flex items-center text-neutral-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="mr-2" size={20} />
          <span className="font-bold tracking-widest uppercase text-xs">Back to Menu</span>
        </button>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 rounded-[40px] border border-white/10 p-8 text-center"
        >
          <h2 className="text-3xl font-black italic tracking-tighter mb-2 uppercase">Feedback</h2>
          <p className="text-neutral-500 font-bold tracking-widest uppercase text-[10px] mb-8">Tell us what you think</p>

          {isSuccess ? (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="py-12 flex flex-col items-center"
            >
              <CheckCircle className="text-green-500 mb-4" size={64} />
              <p className="text-xl font-black italic mb-2">Thank You!</p>
              <p className="text-neutral-500 font-bold tracking-widest uppercase text-xs">Your feedback has been received.</p>
              <button 
                onClick={() => setIsSuccess(false)}
                className="mt-8 text-orange-500 font-black tracking-widest uppercase text-xs hover:underline"
              >
                Send another message
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-4">Your Message</label>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your feedback here..."
                  className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-sm font-bold focus:outline-none focus:border-orange-500 min-h-[200px] resize-none transition-colors"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-5 rounded-3xl flex items-center justify-center space-x-3 transition-all shadow-lg shadow-orange-500/20"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="uppercase tracking-widest">Submit Feedback</span>
                    <Send size={18} />
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Feedback;
