import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../hooks/useApp';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldCheck, RefreshCw } from 'lucide-react';
import { APP_LOGO_URL } from '../constants';

const VerifyOtpView: React.FC = () => {
  const { loginVerifyOtp, sendOtp, logout, authError } = useApp();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [type, setType] = useState<'login' | 'signup'>('login');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    const usernameParam = params.get('username');
    const typeParam = params.get('type');
    if (emailParam) setEmail(emailParam);
    if (usernameParam) setUsername(usernameParam);
    if (typeParam === 'signup' || typeParam === 'login') setType(typeParam);
    
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
    if (otp.length !== 6) {
      setError('OTP harus 6 digit.');
      return;
    }
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      // 1. Verifikasi OTP
      let success = false;
      const pwd = sessionStorage.getItem('temp_pwd') || undefined;
      
      if (type === 'login') {
        success = await loginVerifyOtp(username, email, otp, pwd);
      } else {
        // Untuk signup, masih pakai Supabase standard OTP verification for signup
        const { data, error } = await supabase.auth.verifyOtp({
          email: email,
          token: otp,
          type: 'signup'
        });
        
        if (error) {
          if (error.message.includes("expired")) {
            throw new Error("Kode OTP telah kedaluwarsa.");
          } else if (error.message.includes("invalid") || error.message.includes("incorrect")) {
            throw new Error("Kode OTP tidak valid.");
          } else {
            throw new Error("Verifikasi gagal: " + error.message);
          }
        }
        
        if (!data?.session) {
          throw new Error("Sesi tidak valid. Silakan login ulang.");
        }
        
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user!.id,
          email: data.user!.email,
          username: username || data.user!.email?.split('@')[0],
          name: username || data.user!.email?.split('@')[0],
          role: 'admin'
        });
        
        if (profileError) {
          console.warn("Profile creation failed", profileError);
        }

        // Register session on backend so we have a persistent pos_session_token
        let currentDeviceId = localStorage.getItem('pos_device_id');
        if (!currentDeviceId) {
          currentDeviceId = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
          localStorage.setItem('pos_device_id', currentDeviceId);
        }

        try {
          const registerSessionRes = await fetch('/api/auth/register-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user!.id,
              email: data.user!.email,
              deviceId: currentDeviceId
            })
          });

          if (registerSessionRes.ok) {
            const registerSessionData = await registerSessionRes.json();
            if (registerSessionData.sessionToken) {
              localStorage.setItem("pos_session_token", registerSessionData.sessionToken);
              localStorage.setItem("pos_device_id", currentDeviceId);
              localStorage.setItem("currentUser", JSON.stringify(data.user));
              localStorage.setItem("otpVerified", "true");
            }
          }
        } catch (sessionErr) {
          console.warn("Failed to register session token on backend:", sessionErr);
        }

        success = true;
      }

      if (success) {
        console.log('OTP Verification successful');
        sessionStorage.removeItem('temp_pwd');
        setMessage('Verifikasi berhasil! Mengarahkan...');
        setTimeout(() => {
          console.log('Redirecting to dashboard');
          window.location.href = '/';
        }, 1000);
      } else if (type === 'login') {
         console.log('OTP Verification failed');
         setError("Verifikasi OTP gagal. Silakan coba lagi.");
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
      let resendError = null;
      if (type === 'signup') {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: email
        });
        resendError = error;
      } else {
        const pwd = sessionStorage.getItem('temp_pwd');
        if (!pwd) {
          throw new Error("Sesi tidak valid untuk kirim ulang OTP. Silakan login ulang.");
        }
        
        const res = await fetch('/api/auth/login-initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password: pwd })
        });
        
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error("API Backend tidak aktif. Vercel deployment memerlukan Serverless function. Silakan deploy ke Cloud Run.");
        }
        
        if (!res.ok) {
          let resData;
          try { resData = await res.json(); } catch(e) {}
          throw new Error(resData?.error || "Gagal mengirimkan OTP.");
        }
      }
      
      if (resendError) {
        if (resendError.message.includes("rate limit") || resendError.message.includes("Too many") || resendError.message.includes("security purposes")) {
          throw new Error("Terlalu banyak percobaan. Silakan tunggu beberapa menit.");
        }
        throw resendError;
      }
      
      setMessage('Kode OTP baru telah dikirim.');
      setResendCooldown(60);
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
                <img src={APP_LOGO_URL} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-2xl font-black text-coffee-900 tracking-tighter uppercase italic text-center mb-2">
                {type === 'signup' ? 'Verifikasi Registrasi' : 'Verifikasi Login'}
            </h2>
            <p className="text-xs text-coffee-500 font-bold text-center leading-relaxed">
                Masukkan 6 digit kode OTP yang dikirim ke <span className="text-coffee-800">{email}</span>
            </p>
        </div>
        
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-coffee-400 ml-1">Kode OTP</label>
            <input
              type="text"
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
            className="w-full bg-coffee-800 hover:bg-coffee-900 disabled:opacity-50 text-cream-50 py-4 rounded-2xl font-black text-sm tracking-widest transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? 'MEMPROSES...' : <><ShieldCheck size={18} /> VERIFIKASI</>}
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
