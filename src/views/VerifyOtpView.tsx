import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../hooks/useApp';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldCheck, RefreshCw } from 'lucide-react';
import { APP_LOGO_URL } from '../constants';

const VerifyOtpView: React.FC = () => {
  const { verifyRegisterOtp, resendRegisterOtp, logout, authError } = useApp();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [type, setType] = useState<'signup'>('signup');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [urlSimulatedOtp, setUrlSimulatedOtp] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    const usernameParam = params.get('username');
    const simParam = params.get('simulatedOtp');
    if (emailParam) setEmail(emailParam);
    if (usernameParam) setUsername(usernameParam);
    if (simParam) setUrlSimulatedOtp(simParam);
    
    // Redirect if no email
    if (!emailParam) {
      window.location.href = '/';
    }
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown(c => c - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedOtp = otp.trim();
    
    if (!cleanedOtp) {
      setError('Kode OTP tidak boleh kosong.');
      return;
    }
    
    if (cleanedOtp.length !== 6) {
      setError('Kode OTP harus terdiri dari 6 digit.');
      return;
    }
    
    if (!/^\d+$/.test(cleanedOtp)) {
      setError('Kode OTP hanya boleh berisi angka (0-9).');
      return;
    }

    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const res = await verifyRegisterOtp(email, otp);
      if (res.success) {
        setMessage('Verifikasi berhasil! Akun Anda telah aktif. Mengarahkan ke halaman login...');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        setError(res.error || 'Kode OTP salah atau telah kedaluwarsa.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal memverifikasi OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = async () => {
    await logout();
    window.location.href = '/';
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const res = await resendRegisterOtp(email);
      if (res.success) {
        if (res.simulatedOtp) {
          setUrlSimulatedOtp(res.simulatedOtp);
          setMessage('Kode OTP baru telah disimulasikan di bawah.');
        } else {
          setMessage('Kode OTP baru telah dikirim.');
        }
        setResendCooldown(60);
      } else {
        setError(res.error || 'Gagal mengirim ulang OTP.');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim ulang OTP.');
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
        <button 
            onClick={handleBack}
            className="flex items-center gap-2 text-coffee-400 hover:text-coffee-600 mb-6 transition-colors"
        >
            <ArrowLeft size={16} /> <span className="text-xs font-bold uppercase tracking-widest">Kembali</span>
        </button>

        <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-cream-50 text-white rounded-2xl flex items-center justify-center mb-4 overflow-hidden border border-coffee-100 shadow-inner">
                <img 
                  src={APP_LOGO_URL} 
                  alt="Logo" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = "https://picsum.photos/seed/bosskasir/150/150";
                  }}
                />
            </div>
            <h2 className="text-2xl font-black text-coffee-900 tracking-tighter uppercase italic text-center mb-2">
                Verifikasi Registrasi
            </h2>
            <p className="text-xs text-coffee-500 font-bold text-center leading-relaxed">
                Masukkan 6 digit kode OTP yang dikirim ke <span className="text-coffee-800">{email}</span>
            </p>
        </div>

        {urlSimulatedOtp && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl text-xs font-bold text-center mb-6 space-y-1 shadow-sm">
            <p className="text-amber-700 uppercase tracking-wider font-extrabold text-[10px]">⚠️ SMTP Email Belum Aktif / Error</p>
            <p className="text-coffee-600 font-medium text-[11px]">Gunakan kode OTP simulasi di bawah ini untuk memverifikasi akun Anda:</p>
            <div className="text-xl font-mono font-black tracking-widest text-amber-950 bg-white border border-amber-100 py-2 rounded-xl mt-1 select-all">
              {urlSimulatedOtp}
            </div>
          </div>
        )}
        
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-coffee-400 ml-1">Kode OTP</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="••••••"
              className="w-full px-4 py-4 rounded-2xl bg-cream-50 border border-coffee-100 text-center tracking-[0.5em] text-2xl font-black text-coffee-900 placeholder:text-coffee-200 shadow-inner focus:outline-none focus:border-coffee-500"
            />
          </div>
          
          {(error || message) && (
            <div className={`${message ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-500 border-red-100'} p-3 rounded-2xl text-xs font-bold text-center border`}>
              {message || error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-coffee-800 hover:bg-coffee-900 disabled:opacity-50 text-cream-50 py-4 rounded-2xl font-black text-sm tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-coffee-800/10 active:scale-95"
          >
            {isLoading ? 'MEMPROSES...' : <><ShieldCheck size={18} /> VERIFIKASI</>}
          </button>

          <button
            type="button"
            onClick={handleBack}
            className="w-full bg-cream-50 hover:bg-cream-100 border border-coffee-200 text-coffee-850 py-4 rounded-2xl font-black text-sm tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <ArrowLeft size={16} /> KEMBALI KE MENU AWAL
          </button>
        </form>

        <div className="mt-6 text-center">
            <button
                type="button"
                disabled={resendCooldown > 0 || isLoading}
                onClick={handleResend}
                className="text-xs font-bold text-coffee-600 hover:text-coffee-800 disabled:text-coffee-300 flex items-center justify-center gap-1 mx-auto"
            >
                <RefreshCw size={12} className={resendCooldown > 0 ? "animate-spin" : ""} />
                {resendCooldown > 0 ? `Kirim Ulang (${resendCooldown}s)` : 'Kirim Ulang OTP'}
            </button>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyOtpView;
