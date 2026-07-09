import React, { useState } from 'react';
import { AppProvider, useApp } from './hooks/useApp';
import LoginView from './views/LoginView';
import VerifyOtpView from './views/VerifyOtpView';
import ResetPasswordView from './views/ResetPasswordView';
import POSView from './views/POSView';
import InventoryView from './views/InventoryView';
import ReportsView from './views/ReportsView';
import DiscountView from './views/DiscountView';
import SettingsView from './views/SettingsView';
import Navbar from './components/Navbar';
import { motion, AnimatePresence } from 'motion/react';
import { APP_LOGO_URL } from './constants';
import { cn } from './lib/utils';

const AppContent: React.FC = () => {
  const { user, isLoading, authError, dbWarning, clearDbWarning, settings } = useApp();
  const [activeView, setActiveView] = useState<'pos' | 'inventory' | 'reports' | 'discounts' | 'settings'>('pos');
  const [copiedSql, setCopiedSql] = useState(false);

  // Simple Router
  const path = window.location.pathname;
  const hash = window.location.hash;
  const isResetPassword = path.includes('/reset-password') || hash.includes('type=recovery');
  const isVerifyOtp = path.includes('/verify-otp');
  
  // Inject dynamic theme colors
  React.useEffect(() => {
    if (settings) {
      document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
      document.documentElement.style.setProperty('--secondary-color', settings.secondaryColor);
    }
  }, [settings]);

  const handleCopyRLSQuery = () => {
    const query = `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own data" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can access own data" ON public.products FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own data" ON public.discounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own data" ON public.sales FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own data" ON public.sale_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own data" ON public.inventory_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own data" ON public.cafe_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own data" ON public.payment_methods FOR ALL USING (auth.uid() = user_id);`;
    navigator.clipboard.writeText(query);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center font-sans p-4 text-center">
        <div className="w-12 h-12 border-4 border-coffee-200 border-t-coffee-800 rounded-full animate-spin"></div>
        <p className="mt-4 text-coffee-600 font-bold animate-pulse">Menghubungkan ke Database...</p>
      </div>
    );
  }

  if (isResetPassword) {
    return <ResetPasswordView />;
  }

  if (isVerifyOtp) {
    return <VerifyOtpView />;
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col font-sans">
      <Navbar activeView={activeView} setActiveView={setActiveView} logoUrl={APP_LOGO_URL} />
      
      <main className="flex-1 container mx-auto px-4 py-8 overflow-hidden flex flex-col">
        {dbWarning && (
          <div className="mb-6 bg-orange-50/90 dark:bg-amber-950/20 border-2 border-orange-200 dark:border-amber-900/50 p-6 md:p-8 rounded-[2rem] shadow-sm text-sm">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              <div className="flex gap-4">
                <span className="text-2xl mt-1">⚠️</span>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-black text-orange-850 dark:text-amber-400 uppercase tracking-wider text-xs">⚠️ Kontrol Akses Database Terblokir (Sistem Beroperasi Offline)</h4>
                    <p className="mt-2 text-coffee-800 dark:text-cream-50 whitespace-pre-line leading-relaxed font-bold">{dbWarning}</p>
                  </div>

                  {dbWarning.includes("DISABLE ROW LEVEL SECURITY") && (
                    <div className="bg-coffee-950/95 text-coffee-100 p-5 rounded-2xl border border-coffee-800 space-y-4 max-w-2xl">
                      <div className="flex justify-between items-center text-xs border-b border-coffee-850 pb-3">
                        <span className="font-mono text-coffee-400 text-[10px]">SUPABASE SQL SCRIPT:</span>
                        <button
                          type="button"
                          onClick={handleCopyRLSQuery}
                          className="px-3.5 py-2 bg-white text-coffee-950 hover:bg-coffee-100 transition-all rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1.5"
                        >
                          {copiedSql ? "✓ Berhasil Disalin!" : "📋 Salin Script SQL"}
                        </button>
                      </div>
                      <pre className="font-mono text-[10px] text-coffee-250 bg-black/30 p-4 rounded-xl overflow-x-auto whitespace-pre leading-relaxed select-all">
{`ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own data" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can access own data" ON public.products FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own data" ON public.discounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own data" ON public.sales FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own data" ON public.sale_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own data" ON public.inventory_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own data" ON public.cafe_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own data" ON public.payment_methods FOR ALL USING (auth.uid() = user_id);`}
                      </pre>
                      <p className="text-[11px] text-orange-300 font-bold leading-relaxed">
                        💡 Tempel script SQL di atas ke dalam SQL Editor Supabase Anda dan klik RUN. Ini akan membuka akses penuh agar aplikasi kasir dapat menyinkronkan data.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={clearDbWarning}
                className="shrink-0 text-orange-600 hover:text-orange-850 dark:hover:text-amber-300 font-extrabold px-5 py-3 rounded-xl border border-orange-200 hover:bg-white dark:hover:bg-amber-950/50 transition-all text-xs"
              >
                Sembunyikan Peringatan
              </button>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col"
          >
            {activeView === 'pos' && <POSView />}
            <div className={cn(activeView === 'pos' ? 'hidden' : 'block')}>
              {activeView === 'inventory' && <InventoryView />}
              {activeView === 'reports' && <ReportsView />}
              {activeView === 'discounts' && <DiscountView />}
              {activeView === 'settings' && <SettingsView />}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
      
      <footer className="bg-white border-t border-coffee-100 py-4 px-8 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-coffee-300">
        <div>&copy; 2024 {settings?.name || 'Café Harmony'} • Business Intelligence</div>
        <div className="flex gap-4">
           <span>Service Status: <span className="text-emerald-500">Operational</span></span>
           <span>Version 2.4.0</span>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
