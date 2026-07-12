import React, { useState, useEffect } from 'react';
import { useApp } from '../hooks/useApp';
import { Coffee, ShieldCheck, User as UserIcon, LogIn, ChevronRight, UserPlus, ArrowLeft, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APP_LOGO_URL } from '../constants';

import { supabase } from '../lib/supabase';

const LoginView: React.FC = () => {
  const { 
    login, 
    loginVerifyOtp, 
    register, 
    authError, 
    sendOtp, 
    clearAuthError, 
    isLoading 
  } = useApp();

  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isForgotUsername, setIsForgotUsername] = useState(false);
  
  // Forgot password states
  const [otpSent, setOtpSent] = useState(false); 
  const [otp, setOtp] = useState(''); 
  const [newPassword, setNewPassword] = useState(''); 

  // Regular Login multi-step states
  const [isLoginOtpStep, setIsLoginOtpStep] = useState(false);
  const [loginOtp, setLoginOtp] = useState('');
  const [localIsLoading, setLocalIsLoading] = useState(false); // Add local loading state

  // Sesi inputs
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  
  // Custom alerts
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Use local loading state to avoid overwriting global app loading
  const isLoadingFinal = localIsLoading || isLoading;

  useEffect(() => {
    // Only clear on initial load if needed, but not on error
    clearAuthError();
  }, []);

  // 60-Second Resend Cooldown Management
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown(c => c - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setMessage('');
    try {
      if (isForgotPassword) {
        if (!email) {
          setError('Email wajib diisi.');
          return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage('Instruksi reset password baru telah dikirim ke email Anda.');
      } else {
        if (!username || !email || !password) {
          setError('Kredensial login tidak lengkap.');
          return;
        }
        const success = await login(username, email, password);
        if (success) {
          setMessage('Kode OTP verifikasi masuk baru telah dikirim ke email Anda.');
        }
      }
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Gagal mengirimkan ulang kode.');
    }
  };

  const handleForgotUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (!email) throw new Error('Email wajib diisi.');
      
      const res = await fetch('/api/auth/forgot-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      let data;
      try {
        data = await res.json();
      } catch (err) {
        throw new Error('Server mengembalikan format yang tidak valid (Unexpected end of JSON). API tidak tersedia.');
      }
      
      if (!res.ok) throw new Error(data?.error || 'Terjadi kesalahan.');

      setMessage(data.message);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal mengirim username');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (!email) throw new Error('Email wajib diisi.');
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        if (error.message.includes("rate limit") || error.message.includes("Too many") || error.message.includes("security purposes")) {
          throw new Error("Terlalu banyak percobaan. Silakan tunggu beberapa menit.");
        }
        throw error;
      }
      
      setMessage('Instruksi reset password telah dikirim ke email Anda.');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal mengirim instruksi reset password');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isForgotUsername) {
      return handleForgotUsername(e);
    }
    if (isForgotPassword) {
      return handleResetPassword(e);
    }
    setError('');
    setMessage('');
    clearAuthError();
    
    if (isRegister) {
      if (!username || !email) {
        setError('Nama dan Email wajib diisi');
        return;
      }
      if (!password) {
        setError('Password wajib diisi');
        return;
      }
      
      setLocalIsLoading(true);
      const res = await register(username, email, password);
      setLocalIsLoading(false);
      if (res.success) {
        setMessage('Pendaftaran berhasil! Mengarahkan ke halaman verifikasi OTP...');
        const targetEmail = res.email || email;
        const simulatedParam = res.simulatedOtp ? `&simulatedOtp=${encodeURIComponent(res.simulatedOtp)}` : '';
        setTimeout(() => {
          window.location.href = `/verify-otp?email=${encodeURIComponent(targetEmail)}&type=signup&username=${encodeURIComponent(username)}${simulatedParam}`;
        }, 1500);
      } else {
        setError(res.error || 'Gagal mendaftar akun baru.');
      }
    } else {
      if (!identifier) {
        setError('Email wajib diisi');
        return;
      }
      if (!password) {
        setError('Password wajib diisi');
        return;
      }
 
      setLocalIsLoading(true);
      setError('');
 
      try {
        const res = await login(identifier, password);
        if (res.success) {
          // Login successful, the app state will auto-route to dashboard
        } else if (res.isUnverified) {
          setMessage('Akun belum diverifikasi. Mengarahkan ke verifikasi OTP...');
          const targetEmail = res.email || identifier;
          setTimeout(() => {
            window.location.href = `/verify-otp?email=${encodeURIComponent(targetEmail)}&type=signup`;
          }, 1500);
        } else {
          setError(res.error || 'Gagal memproses login.');
        }
      } catch (err: any) {
        console.error("Login Error:", err);
        setError(err.message || 'Terjadi kesalahan saat memproses login.');
      } finally {
        setLocalIsLoading(false);
      }
    }
  };

  const handleBackToLogin = () => {
    setIsForgotPassword(false);
    setIsForgotUsername(false);
    setOtpSent(false);
    setOtp('');
    setError('');
    setMessage('');
    clearAuthError();
  };

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <motion.div 
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white border border-coffee-100 p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-coffee-900/5"
      >
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
          <h1 className="text-2xl font-black text-coffee-900 tracking-tighter uppercase italic text-center">
            BossKasir
          </h1>
          <p className="text-coffee-400 text-xs font-bold mt-1 tracking-widest uppercase text-center">
            {isForgotPassword 
              ? (otpSent ? 'Langkah 2: Reset Password' : 'Langkah 1: Lupa Password') 
              : isRegister 
                ? 'Buat Akun Baru' 
                : 'Selamat Datang Kembali'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <AnimatePresence mode="wait">
            {/* Lupa Password Form */}
            {isForgotPassword && (
              <motion.div 
                key="forgot-step"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <p className="text-xs text-coffee-500 font-bold mb-2 leading-relaxed">
                  Masukkan Email Anda. Kami akan mengirimkan instruksi untuk reset password.
                </p>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-coffee-400 ml-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    name="bosskasir_login_email"
                    autoComplete="off"
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="budi@gmail.com"
                    className="w-full px-4 py-3 rounded-2xl bg-cream-50 border border-coffee-100 focus:outline-none focus:border-coffee-500 transition-all text-sm font-bold text-coffee-900 placeholder:text-coffee-300"
                  />
                </div>
              </motion.div>
            )}

            {/* Lupa Username Form */}
            {isForgotUsername && (
              <motion.div 
                key="forgot-username"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <p className="text-xs text-coffee-500 font-bold mb-2 leading-relaxed">
                  Masukkan Email terdaftar. Kami akan mengirimkan username Anda.
                </p>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-coffee-400 ml-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    name="bosskasir_login_email"
                    autoComplete="off"
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="budi@gmail.com"
                    className="w-full px-4 py-3 rounded-2xl bg-cream-50 border border-coffee-100 focus:outline-none focus:border-coffee-500 transition-all text-sm font-bold text-coffee-900 placeholder:text-coffee-300"
                  />
                </div>
              </motion.div>
            )}

            {/* Normal Login/Register Fields */}
            {(!isForgotPassword && !isForgotUsername) && (
              <motion.div 
                key="login-normal"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {isRegister ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-coffee-400 ml-1">Nama</label>
                      <input
                        type="text"
                        value={username}
                        name="bosskasir_register_username"
                        autoComplete="off"
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Nama Lengkap Anda"
                        className="w-full px-4 py-3 rounded-2xl bg-cream-50 border border-coffee-100 focus:outline-none focus:border-coffee-500 transition-all text-sm font-bold text-coffee-900 placeholder:text-coffee-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-coffee-400 ml-1">Email</label>
                      <input
                        type="email"
                        value={email}
                        name="bosskasir_register_email"
                        autoComplete="off"
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="budi@gmail.com"
                        className="w-full px-4 py-3 rounded-2xl bg-cream-50 border border-coffee-100 focus:outline-none focus:border-coffee-500 transition-all text-sm font-bold text-coffee-900 placeholder:text-coffee-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-coffee-400 ml-1">Password</label>
                      <input
                        type="password"
                        value={password}
                        name="bosskasir_register_password"
                        autoComplete="new-password"
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 rounded-2xl bg-cream-50 border border-coffee-100 focus:outline-none focus:border-coffee-500 transition-all text-sm font-bold text-coffee-900 placeholder:text-coffee-300"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-coffee-400 ml-1">Email</label>
                      <input
                        type="email"
                        value={identifier}
                        name="bosskasir_login_identifier"
                        autoComplete="email"
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="budi@gmail.com"
                        className="w-full px-4 py-3 rounded-2xl bg-cream-50 border border-coffee-100 focus:outline-none focus:border-coffee-500 transition-all text-sm font-bold text-coffee-900 placeholder:text-coffee-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-coffee-400 ml-1">Password</label>
                      <input
                        type="password"
                        value={password}
                        name="bosskasir_login_password"
                        autoComplete="current-password"
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 rounded-2xl bg-cream-50 border border-coffee-100 focus:outline-none focus:border-coffee-500 transition-all text-sm font-bold text-coffee-900 placeholder:text-coffee-300"
                      />
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feedback messages */}
          {(error || authError || message) && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`${message ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-500 border-red-100'} p-3 rounded-2xl text-xs font-bold text-center border`}
            >
              {message || error || authError}
            </motion.div>
          )}

          {/* Cooldown Resend Area */}
          {((isForgotPassword || isForgotUsername) && otpSent) && (
            <div className="flex justify-between items-center text-xs mt-2 px-1">
              <span className="text-coffee-400 font-bold">Tidak menerima email?</span>
              <button
                type="button"
                disabled={resendCooldown > 0}
                onClick={handleResendOtp}
                className="text-coffee-800 font-black hover:underline disabled:text-coffee-300 flex items-center gap-1"
              >
                <RefreshCw size={10} className={resendCooldown > 0 ? "animate-spin" : ""} />
                {resendCooldown > 0 ? `Kirim Ulang (${resendCooldown}s)` : 'Kirim Ulang OTP'}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoadingFinal}
            className="w-full bg-coffee-800 hover:bg-coffee-900 disabled:opacity-50 disabled:cursor-not-allowed text-cream-50 py-4 mt-2 rounded-2xl font-black text-sm tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-coffee-800/20 active:scale-95"
          >
            {isLoadingFinal 
              ? 'MEMPROSES...' 
              : isForgotPassword 
                ? 'KIRIM RESET LINK'
                : isForgotUsername
                  ? 'KIRIM USERNAME'
                : isRegister 
                  ? <><UserPlus size={18} /> DAFTAR SEKARANG</> 
                  : isLoginOtpStep 
                    ? <><ShieldCheck size={18} /> VERIFIKASI SEKARANG</> 
                    : <><LogIn size={18} /> MASUK APLIKASI</>}
          </button>

          {(isRegister || isForgotPassword || isForgotUsername || isLoginOtpStep) && (
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setIsForgotPassword(false);
                setIsForgotUsername(false);
                setIsLoginOtpStep(false);
                setError('');
                setMessage('');
                clearAuthError();
              }}
              className="w-full bg-cream-50 hover:bg-cream-100 border border-coffee-200 text-coffee-850 py-4 mt-2 rounded-2xl font-black text-sm tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
            >
              <ArrowLeft size={16} /> KEMBALI KE MENU AWAL
            </button>
          )}
        </form>

        <div className="mt-8 pt-6 border-t border-coffee-50 text-center">
          {(!isForgotPassword && !isForgotUsername) && (
            <>
              <p className="text-coffee-400 text-xs font-bold tracking-tight">
                {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}
              </p>
              <button 
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                  setMessage('');
                  clearAuthError();
                }}
                className="text-coffee-800 text-sm font-black mt-2 hover:text-coffee-900 transition-colors underline decoration-2 underline-offset-4"
              >
                {isRegister ? 'Login di sini' : 'Daftar akun baru'}
              </button>
            </>
          )}

          {/* Back Action buttons for OTP modes */}
          {(isForgotPassword || isForgotUsername) && (
            <button
              onClick={handleBackToLogin}
              className="text-coffee-600 text-xs font-black hover:text-coffee-800 transition-colors flex items-center justify-center gap-1 mx-auto"
            >
              <ArrowLeft size={12} /> Kembali ke halaman Login
            </button>
          )}

          {(!isForgotPassword && !isForgotUsername && !isRegister) && (
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => {
                  setIsForgotPassword(true);
                  setError('');
                  setMessage('');
                }}
                className="text-coffee-500 text-xs font-bold hover:text-coffee-700 transition-colors"
              >
                Lupa password?
              </button>
              <button
                onClick={() => {
                  setIsForgotUsername(true);
                  setError('');
                  setMessage('');
                }}
                className="text-coffee-500 text-xs font-bold hover:text-coffee-700 transition-colors"
              >
                Lupa username?
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default LoginView;
