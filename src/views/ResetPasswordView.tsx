import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { ArrowLeft, Save } from 'lucide-react';

const ResetPasswordView: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.replace('#', '?'));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');

    if (type === 'recovery' && accessToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || ''
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Password dan Konfirmasi Password tidak sama.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password harus minimal 6 karakter.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setMessage('Password berhasil diubah. Mengarahkan ke halaman login...');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Gagal mengubah password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white border border-coffee-100 p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-coffee-900/5"
      >
        <h2 className="text-2xl font-black text-coffee-900 tracking-tighter uppercase italic text-center mb-6">
          Reset Password
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-coffee-400 ml-1">Password Baru</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-2xl bg-cream-50 border border-coffee-100 focus:outline-none focus:border-coffee-500 transition-all text-sm font-bold text-coffee-900 placeholder:text-coffee-300"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-coffee-400 ml-1">Konfirmasi Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-2xl bg-cream-50 border border-coffee-100 focus:outline-none focus:border-coffee-500 transition-all text-sm font-bold text-coffee-900 placeholder:text-coffee-300"
            />
          </div>
          {(error || message) && (
            <div className={`${message ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500'} p-3 rounded-2xl text-xs font-bold text-center border`}>
              {message || error}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-coffee-800 hover:bg-coffee-900 disabled:opacity-50 text-cream-50 py-4 rounded-2xl font-black text-sm tracking-widest transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? 'MEMPROSES...' : <><Save size={18} /> UBAH PASSWORD</>}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPasswordView;
