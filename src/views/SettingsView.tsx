import React, { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { Save, Plus, Trash2, Camera, Palette, Globe, Phone, MapPin, CreditCard, Upload, X, Printer, Coffee } from 'lucide-react';
import { CafeSettings, PaymentMethod } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

const SettingsView: React.FC = () => {
  const { settings, paymentMethods, updateSettings, addPaymentMethod, updatePaymentMethod, deletePaymentMethod, syncLocalToCloud, user, products, discounts, sales } = useApp();
  
  const [localSettings, setLocalSettings] = useState<CafeSettings | null>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const qrisInputRef = React.useRef<HTMLInputElement>(null);

  const handleCopyRLSQuery = () => {
    const query = `ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods DISABLE ROW LEVEL SECURITY;`;
    navigator.clipboard.writeText(query);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleSyncData = async () => {
    setSyncStatus('loading');
    setSyncError(null);
    try {
      await syncLocalToCloud();
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 5000);
    } catch (err: any) {
      setSyncStatus('error');
      setSyncError(err.message || 'Gagal melakukan sinkronisasi data.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'qrisImageUrl') => {
    const file = e.target.files?.[0];
    if (file && localSettings) {
      if (file.size > 1024 * 500) { // 500KB limit for base64 storage
        alert('Ukuran file terlalu besar. Maksimal 500KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalSettings({ ...localSettings, [field]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    if (localSettings) {
      setLocalSettings({ ...localSettings, logoUrl: '' });
    }
  };

  // Sync internal state when settings load
  React.useEffect(() => {
    if (settings && !localSettings) {
      setLocalSettings(settings);
    }
  }, [settings, localSettings]);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localSettings) return;
    setIsSaving(true);
    await updateSettings(localSettings);
    setIsSaving(false);
  };

  const handleAddPayment = () => {
    addPaymentMethod({
      name: 'New Payment',
      type: 'non-cash',
      isActive: true
    });
  };

  if (!localSettings) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-10 pb-20 w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[3rem] border border-coffee-100/60 shadow-xl shadow-coffee-500/5">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 bg-coffee-950 rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-coffee-950/20">
            <Palette className="text-white" size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-coffee-900 tracking-tight leading-none mb-2">Identitas Cafe</h1>
            <p className="text-coffee-400 font-bold text-sm tracking-tight capitalize">Konfigurasi visual, informasi publik, dan sistem kasir.</p>
          </div>
        </div>
        <button
          form="settings-form"
          disabled={isSaving}
          className="flex items-center gap-3 bg-coffee-900 text-white px-8 py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:bg-coffee-950 transition-all shadow-xl shadow-coffee-900/10 disabled:opacity-50 active:scale-95 w-full md:w-auto justify-center"
        >
          <Save size={18} strokeWidth={3} />
          {isSaving ? 'Saving...' : 'Update Settings'}
        </button>
      </div>

      <div className="bg-gradient-to-br from-coffee-900 to-coffee-950 text-white p-8 md:p-10 rounded-[3rem] shadow-xl relative overflow-hidden border border-coffee-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-4 max-w-3xl">
              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] uppercase tracking-widest font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  Pencadangan & Sinkronisasi Cloud
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight">Kirim Data Lokal ke Basis Data Supabase Anda</h2>
              <p className="text-sm text-coffee-200 leading-relaxed font-medium">
                Saat pertama kali Anda menghubungkan Supabase baru atau menonaktifkan kebijakan Row-Level Security (RLS), tabel database Anda di cloud masih sepenuhnya kosong (0 baris). 
                Gunakan panel ini untuk mengunggah dan menyinkronkan seluruh data lapor/cache lokal Anda yang ada di browser ini ke database Supabase secara instan!
              </p>
              <div className="flex flex-wrap gap-4 text-xs font-bold text-coffee-300">
                <span className="bg-white/10 px-4 py-2 rounded-xl">📦 {products.length} Produk Lokal</span>
                <span className="bg-white/10 px-4 py-2 rounded-xl">🏷️ {discounts.length} Diskon Lokal</span>
                <span className="bg-white/10 px-4 py-2 rounded-xl">📝 {sales.length} Riwayat Penjualan</span>
                <span className="bg-white/10 px-4 py-2 rounded-xl">👤 Akun: {user?.username} ({user?.role})</span>
              </div>
            </div>
            
            <div className="shrink-0 w-full lg:w-auto">
              {syncStatus === 'loading' ? (
                <button disabled className="bg-white/20 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest w-full text-center flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Menyinkronkan...
                </button>
              ) : syncStatus === 'success' ? (
                <div className="text-center">
                  <button disabled className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest w-full">
                    ✓ Berhasil Disinkronkan
                  </button>
                  <p className="text-[11px] text-emerald-300 font-bold mt-2">Data berhasil diunggah ke Supabase!</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSyncData}
                  className="bg-white text-coffee-950 hover:bg-coffee-100 transition-all active:scale-95 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-white/10 w-full"
                >
                  Sync Sekarang ke Supabase
                </button>
              )}
            </div>
          </div>

          {syncStatus === 'error' && (
            <div className="mt-8 p-6 bg-red-950/40 border border-red-500/20 rounded-3xl space-y-4 text-left animate-in fade-in duration-300">
              <div className="flex items-center gap-2">
                <span className="text-lg">❌</span>
                <h4 className="font-extrabold text-sm text-red-300 uppercase tracking-wider">Kesalahan Sinkronisasi (RLS Terdeteksi)</h4>
              </div>
              
              <p className="text-xs text-coffee-200 leading-relaxed font-semibold whitespace-pre-line bg-black/10 p-4 rounded-xl border border-white/5">
                {syncError}
              </p>

              {(syncError?.includes("ROW LEVEL SECURITY") || syncError?.includes("profiles")) && (
                <div className="bg-black/40 border border-red-500/25 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-3">
                    <span className="font-mono text-[9px] text-red-300 uppercase tracking-widest font-black">Eksekusi SQL Kueri Berikut:</span>
                    <button
                      type="button"
                      onClick={handleCopyRLSQuery}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white active:scale-95 transition-all rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 self-start sm:self-auto"
                    >
                      {copiedSql ? "✓ Berhasil Disalin!" : "📋 Salin SQL (Disable RLS)"}
                    </button>
                  </div>
                  <pre className="font-mono text-[9px] text-coffee-300 bg-coffee-950 p-4 rounded-xl overflow-x-auto whitespace-pre select-all leading-normal">
{`ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods DISABLE ROW LEVEL SECURITY;`}
                  </pre>
                  <p className="text-[10px] text-coffee-300 font-bold leading-relaxed">
                    💡 Cara Penggunaan: Buka tab <strong className="text-white">SQL Editor</strong> di dashboard Supabase Anda, buat tab query baru, tempel kode di atas, kemudian klik <strong className="text-white">RUN (Ctrl + Enter)</strong>. Setelah itu klik tombol di atas kembali untuk menyelesaikan unggahan Anda.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Cafe Info (Main) */}
        <div className="lg:col-span-8 space-y-10">
          <form id="settings-form" onSubmit={handleSettingsSubmit} className="bg-white rounded-[3rem] border border-coffee-100/60 overflow-hidden shadow-sm">
            <div className="p-8 border-b border-coffee-50 bg-coffee-50/10 flex justify-between items-center">
              <h2 className="font-black text-coffee-900 flex items-center gap-3 uppercase text-xs tracking-widest">
                <Globe size={18} className="text-coffee-500" />
                Informasi Bisnis
              </h2>
              <div className="px-3 py-1 bg-white border border-coffee-100 rounded-lg text-[9px] font-black uppercase text-coffee-300 tracking-widest">
                Public Profile
              </div>
            </div>
            
            <div className="p-8 md:p-10 space-y-10">
              {/* Logo Section - Polished */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-coffee-300 uppercase tracking-[0.2em] pl-1">Brand Identity (Logo)</label>
                <div className="flex flex-col md:flex-row items-center gap-8 p-8 bg-coffee-50/30 border border-coffee-100 rounded-[2.5rem] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16 opacity-40" />
                  
                  <div className="relative">
                    <div className="h-32 w-32 rounded-[2rem] bg-white border border-coffee-100 flex items-center justify-center overflow-hidden shadow-2xl ring-8 ring-white transition-all transform group-hover:rotate-3">
                      {localSettings.logoUrl ? (
                        <img 
                          src={localSettings.logoUrl} 
                          alt="Logo preview" 
                          className="h-full w-full object-cover" 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = "https://picsum.photos/seed/bosskasir/150/150";
                          }}
                        />
                      ) : (
                        <Camera size={48} className="text-coffee-200" strokeWidth={1} />
                      )}
                    </div>
                    {localSettings.logoUrl && (
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors z-10"
                      >
                        <X size={14} strokeWidth={4} />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-5 relative z-10 text-center md:text-left">
                    <div>
                      <h4 className="font-black text-coffee-900 mb-1">Foto Logo Cafe</h4>
                      <p className="text-xs text-coffee-400 font-bold leading-relaxed">
                        Mendukung format PNG, JPG atau SVG. <br className="hidden md:block"/>Ukuran maksimal disarankan 500KB.
                      </p>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, 'logoUrl')} accept="image/*" className="hidden" />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-3 bg-white text-coffee-600 px-6 py-3 rounded-2xl border border-coffee-100 font-black text-[10px] uppercase tracking-widest hover:border-coffee-500 hover:text-coffee-900 transition-all shadow-sm mx-auto md:mx-0"
                    >
                      <Upload size={14} strokeWidth={3} />
                      Ganti Foto Logo
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-coffee-300 uppercase tracking-[0.2em] pl-1">QRIS Image (Optional)</label>
                <div className="flex flex-col md:flex-row items-center gap-8 p-8 bg-coffee-50/30 border border-coffee-100 rounded-[2.5rem]">
                  <div className="h-32 w-32 rounded-[2rem] bg-white border border-coffee-100 flex items-center justify-center overflow-hidden shadow-sm">
                    {localSettings.qrisImageUrl ? (
                      <img src={localSettings.qrisImageUrl} alt="QRIS preview" className="h-full w-full object-contain" />
                    ) : (
                      <CreditCard size={48} className="text-coffee-200" strokeWidth={1} />
                    )}
                  </div>
                  <div className="flex-1 space-y-3 text-center md:text-left">
                    <input type="file" ref={qrisInputRef} onChange={(e) => handleFileChange(e, 'qrisImageUrl')} accept="image/*" className="hidden" />
                    <button
                      type="button"
                      onClick={() => qrisInputRef.current?.click()}
                      className="flex items-center gap-3 bg-white text-coffee-600 px-6 py-3 rounded-2xl border border-coffee-100 font-black text-[10px] uppercase tracking-widest hover:border-coffee-500 hover:text-coffee-900 transition-all shadow-sm mx-auto md:mx-0"
                    >
                      <Upload size={14} strokeWidth={3} />
                      Upload QRIS Foto
                    </button>
                    {localSettings.qrisImageUrl && (
                      <button
                        type="button"
                        onClick={() => setLocalSettings({ ...localSettings, qrisImageUrl: '' })}
                        className="text-xs text-red-500 font-bold hover:underline"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-coffee-400 ml-1 block">Nama Cafe</label>
                  <input
                    type="text"
                    value={localSettings.name}
                    onChange={e => setLocalSettings({ ...localSettings, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-coffee-100 focus:ring-2 focus:ring-coffee-500/20 outline-none font-bold text-coffee-900 transition-all text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-coffee-400 ml-1 block">Kontak Telepon</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-300" size={16} />
                    <input
                      type="text"
                      value={localSettings.phone}
                      onChange={e => setLocalSettings({ ...localSettings, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-coffee-100 focus:ring-2 focus:ring-coffee-500/20 outline-none font-bold text-coffee-900 transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-coffee-300 uppercase tracking-[0.2em] pl-1">Alamat Outlet</label>
                <div className="relative">
                  <MapPin className="absolute left-5 top-5 text-coffee-300" size={18} />
                  <textarea
                    rows={3}
                    value={localSettings.address}
                    onChange={e => setLocalSettings({ ...localSettings, address: e.target.value })}
                    className="w-full pl-14 pr-5 py-4 rounded-2xl bg-white border border-coffee-100 focus:ring-4 focus:ring-coffee-500/10 focus:border-coffee-500 outline-none font-extrabold text-coffee-900 resize-none transition-all text-sm leading-relaxed"
                    placeholder="Tuliskan alamat lengkap outlet anda..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-coffee-50">
                <div className="space-y-6">
                  <h3 className="font-black text-coffee-950 flex items-center gap-3 uppercase text-[10px] tracking-widest">
                    <Palette size={16} className="text-coffee-500" />
                    Branding Colors
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center gap-4 bg-coffee-50/50 p-5 rounded-3xl border border-coffee-100/50 group hover:border-coffee-200 transition-colors">
                      <div className="relative">
                        <input
                          type="color"
                          value={localSettings.primaryColor}
                          onChange={e => setLocalSettings({ ...localSettings, primaryColor: e.target.value })}
                          className="w-12 h-12 rounded-2xl cursor-pointer border-2 border-white shadow-xl group-hover:scale-110 transition-transform"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[8px] font-black text-coffee-400 uppercase tracking-widest block mb-1">Primary Brand</label>
                        <input
                          type="text"
                          value={localSettings.primaryColor}
                          onChange={e => setLocalSettings({ ...localSettings, primaryColor: e.target.value })}
                          className="bg-white px-3 py-2 border border-coffee-100 rounded-2xl text-sm font-mono font-black text-coffee-900 outline-none w-full focus:border-coffee-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="font-black text-coffee-950 flex items-center gap-3 uppercase text-[10px] tracking-widest">
                    <CreditCard size={16} className="text-coffee-500" />
                    Kasir & Pajak
                  </h3>
                  <div className="bg-coffee-50/50 p-5 rounded-3xl border border-coffee-100/50 mt-4 space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase text-coffee-400 ml-1 mb-2 block">Internal Tax Rate (%)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400 font-bold text-xs">%</span>
                        <input
                          type="text"
                          value={localSettings.taxRate.toLocaleString('id-ID')}
                          onChange={e => {
                            const value = e.target.value.replace(/\D/g, '');
                            setLocalSettings({ ...localSettings, taxRate: Number(value) });
                          }}
                          className="w-full pl-10 pr-4 py-3 bg-white border border-coffee-100 rounded-xl focus:ring-2 focus:ring-coffee-500/20 focus:outline-none font-bold text-coffee-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-coffee-400 ml-1 mb-2 block">QRIS Data</label>
                      <input
                        type="text"
                        value={localSettings.qrisData || ''}
                        onChange={e => setLocalSettings({ ...localSettings, qrisData: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-coffee-100 rounded-xl focus:ring-2 focus:ring-coffee-500/20 focus:outline-none font-bold text-coffee-900"
                        placeholder="Masukkan data QRIS..."
                      />
                    </div>
                  </div>
                </div>

                {/* Receipt Styling Section */}
                <div className="pt-10 border-t border-coffee-50 space-y-6">
                  <h3 className="font-black text-coffee-950 flex items-center gap-3 uppercase text-[10px] tracking-widest">
                    <Printer size={16} className="text-coffee-500" />
                    Kustomisasi Struk Pembayaran
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left sub-column: Edit controls */}
                    <div className="space-y-6 bg-coffee-50/30 p-6 md:p-8 rounded-[2rem] border border-coffee-100">
                      <div className="flex items-center justify-between pb-4 border-b border-coffee-100">
                        <div>
                          <label className="text-xs font-black text-coffee-900 uppercase tracking-wider block">Tampilkan Logo Cafe</label>
                          <span className="text-[10px] text-coffee-400 font-bold">Munculkan gambar logo di bagian atas struk</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setLocalSettings({ ...localSettings, receiptShowLogo: localSettings.receiptShowLogo === false ? true : false })}
                          className={cn(
                            "h-8 w-14 rounded-full p-1 transition-all relative shadow-inner",
                            localSettings.receiptShowLogo !== false ? "bg-emerald-500" : "bg-coffee-200"
                          )}
                        >
                          <div className={cn(
                            "h-6 w-6 bg-white rounded-full shadow-md transition-all transform",
                            localSettings.receiptShowLogo !== false ? "translate-x-6" : "translate-x-0"
                          )} />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black text-coffee-900 uppercase tracking-wider block">Slogan / Tagline Bisnis</label>
                        <input
                          type="text"
                          value={localSettings.receiptNote || ''}
                          onChange={e => setLocalSettings({ ...localSettings, receiptNote: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-coffee-100 rounded-xl focus:ring-2 focus:ring-coffee-500/20 focus:outline-none font-bold text-coffee-900 text-sm"
                          placeholder="Contoh: Nikmati ketenangan di setiap tegukan."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black text-coffee-900 uppercase tracking-wider block">Sandi WiFi Kasir (Opsional)</label>
                        <input
                          type="text"
                          value={localSettings.receiptWifiName || ''}
                          onChange={e => setLocalSettings({ ...localSettings, receiptWifiName: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-coffee-100 rounded-xl focus:ring-2 focus:ring-coffee-500/20 focus:outline-none font-bold text-coffee-900 text-sm"
                          placeholder="Masukkan sandi WiFi, atau kosongkan untuk menyembunyikan"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black text-coffee-900 uppercase tracking-wider block">Pesan Kaki (Footer)</label>
                        <input
                          type="text"
                          value={localSettings.receiptFooterMessage || ''}
                          onChange={e => setLocalSettings({ ...localSettings, receiptFooterMessage: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-coffee-100 rounded-xl focus:ring-2 focus:ring-coffee-500/20 focus:outline-none font-bold text-coffee-900 text-sm"
                          placeholder="Contoh: Terima kasih telah berkunjung!"
                        />
                      </div>
                    </div>

                    {/* Right sub-column: Live layout preview of the Receipt */}
                    <div className="flex flex-col justify-center items-center p-6 bg-amber-50/20 rounded-[2rem] border border-amber-900/10 relative overflow-hidden">
                      <span className="absolute top-4 right-4 px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-[9px] font-black uppercase tracking-widest">
                        Live Preview Struk
                      </span>
                      <div className="bg-white rounded-2xl border border-dashed border-coffee-200 p-6 w-full max-w-[260px] shadow-lg text-[10px] space-y-4 text-coffee-800 font-semibold font-sans mt-4">
                        <div className="text-center space-y-1 pb-4 border-b border-dashed border-coffee-150">
                          {localSettings.receiptShowLogo !== false && (
                            localSettings.logoUrl ? (
                              <img 
                                src={localSettings.logoUrl} 
                                alt="Logo" 
                                className="mx-auto w-10 h-10 object-cover rounded-lg mb-2" 
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.src = "https://picsum.photos/seed/bosskasir/150/150";
                                }}
                              />
                            ) : (
                              <div className="mx-auto w-10 h-10 bg-coffee-800 text-cream-50 rounded-lg flex items-center justify-center mb-2">
                                <Coffee size={18} />
                              </div>
                            )
                          )}
                          <h4 className="text-xs font-black text-coffee-900 tracking-tight italic">{localSettings.name || 'BossKasir'}</h4>
                          <p className="text-[8px] text-coffee-400 uppercase tracking-wider">{localSettings.address || 'The Essence of Coffee'}</p>
                          <p className="text-[8px] text-coffee-400">{localSettings.phone || '021-8888-0000'}</p>
                        </div>

                        <div className="space-y-1 text-[8px] text-coffee-500 border-b border-dashed border-coffee-150 pb-3">
                          <div className="flex justify-between">
                            <span>RESI :</span>
                            <span className="text-coffee-900">TX-999901</span>
                          </div>
                          <div className="flex justify-between">
                            <span>METODE :</span>
                            <span className="text-coffee-900 font-bold">CASH</span>
                          </div>
                        </div>

                        <div className="space-y-2 border-b border-dashed border-coffee-150 pb-3">
                          <div className="flex justify-between items-center text-[9px]">
                            <div>
                              <p className="font-bold text-coffee-900">Signature Americano</p>
                              <p className="text-coffee-400 text-[8px]">1 x Rp 25.000</p>
                            </div>
                            <span className="font-bold text-coffee-900">Rp 25.000</span>
                          </div>
                          <div className="flex justify-between items-center text-[9px]">
                            <div>
                              <p className="font-bold text-coffee-900 font-sans">Croissant Almond</p>
                              <p className="text-coffee-400 text-[8px]">1 x Rp 28.000</p>
                            </div>
                            <span className="font-bold text-coffee-900">Rp 28.000</span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-[8px]">
                          <div className="flex justify-between text-coffee-400">
                            <span>Subtotal</span>
                            <span className="text-coffee-900">Rp 53.000</span>
                          </div>
                          <div className="flex justify-between text-coffee-400">
                            <span>PB1 ({localSettings.taxRate}%)</span>
                            <span className="text-coffee-900">Rp {(53000 * localSettings.taxRate / 100).toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex justify-between items-end border-t border-coffee-100 pt-1.5">
                            <span className="font-black text-coffee-900">TOTAL</span>
                            <span className="font-black text-coffee-900 text-xs">Rp {(53000 + (53000 * localSettings.taxRate / 100)).toLocaleString('id-ID')}</span>
                          </div>
                        </div>

                        <div className="text-center space-y-1 pt-3 text-[8px] border-t border-dashed border-coffee-150">
                          <p className="font-bold text-coffee-400 italic">
                            {localSettings.receiptFooterMessage || 'Terima kasih telah berkunjung!'}
                          </p>
                          {localSettings.receiptWifiName && (
                            <div className="pt-1.5 opacity-80">
                              <p className="font-black text-coffee-800 uppercase tracking-widest text-[7px]">WiFi Password:</p>
                              <p className="font-mono text-coffee-500 text-[8px]">{localSettings.receiptWifiName}</p>
                            </div>
                          )}
                          {localSettings.receiptNote && (
                            <p className="text-coffee-400 opacity-75 pt-1.5 italic text-[8px]">{localSettings.receiptNote}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Payment & Tips */}
        <div className="lg:col-span-4 space-y-10">
          <div className="bg-white rounded-[3rem] border border-coffee-100/60 overflow-hidden shadow-sm">
            <div className="p-8 border-b border-coffee-50 bg-coffee-50/10 flex justify-between items-center">
              <h2 className="font-black text-coffee-900 flex items-center gap-3 uppercase text-xs tracking-widest">
                <CreditCard size={18} className="text-coffee-500" />
                Payments
              </h2>
              <button
                onClick={handleAddPayment}
                className="h-10 w-10 bg-coffee-900 text-white rounded-xl hover:bg-coffee-950 transition-all shadow-lg flex items-center justify-center group active:scale-90"
              >
                <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              {paymentMethods.map(pm => (
                <div key={pm.id} className="p-5 bg-coffee-50/50 rounded-[2rem] border border-coffee-100/50 space-y-5 transition-all hover:bg-white hover:shadow-xl hover:shadow-coffee-500/5 hover:border-coffee-200">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={pm.name}
                        onChange={e => updatePaymentMethod({ ...pm, name: e.target.value })}
                        className="bg-white px-3 py-2 border border-coffee-100 focus:border-coffee-800 outline-none font-black text-coffee-950 text-sm w-full mb-1 rounded-2xl"
                        placeholder="Nama Metode..."
                      />
                      <div className="flex items-center gap-2">
                        <div className={cn("w-1.5 h-1.5 rounded-full", pm.isActive ? "bg-emerald-500" : "bg-coffee-200")} />
                        <span className="text-[8px] font-black text-coffee-300 uppercase tracking-widest">{pm.isActive ? 'Active' : 'Disabled'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deletePaymentMethod(pm.id)}
                      className="p-2 text-coffee-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <select
                      value={pm.type}
                      onChange={e => updatePaymentMethod({ ...pm, type: e.target.value as 'cash' | 'non-cash' })}
                      className="bg-white border border-coffee-100 rounded-xl px-4 py-2 text-[10px] font-black text-coffee-700 outline-none shadow-sm cursor-pointer hover:border-coffee-500 transition-colors"
                    >
                      <option value="cash">💵 CASH</option>
                      <option value="non-cash">📱 QRIS / EDC</option>
                    </select>
                    
                    <button 
                      onClick={() => updatePaymentMethod({ ...pm, isActive: !pm.isActive })}
                      className={cn(
                        "h-8 w-14 rounded-full p-1 transition-all relative shadow-inner",
                        pm.isActive ? "bg-emerald-500" : "bg-coffee-200"
                      )}
                    >
                      <div className={cn(
                        "h-6 w-6 bg-white rounded-full shadow-md transition-all transform",
                        pm.isActive ? "translate-x-6" : "translate-x-0"
                      )} />
                    </button>
                  </div>
                </div>
              ))}
              {paymentMethods.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-center opacity-50">
                  <CreditCard size={32} className="text-coffee-200 mb-2" />
                  <p className="text-[10px] font-black text-coffee-400 uppercase tracking-widest">No Methods Found</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-coffee-950 p-8 rounded-[3rem] shadow-2xl shadow-coffee-950/40 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform" />
            <h3 className="font-black text-white mb-4 flex items-center gap-3 text-sm italic tracking-tight">
               <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">💡</div>
               Pro-Tips
            </h3>
            <p className="text-xs text-coffee-400 font-bold leading-relaxed">
              Warna tema yang dipilih akan merubah nuansa <span className="text-white">seluruh elemen visual</span> aplikasi kasir Anda. 
              <br/><br/>
              Pastikan logo cafe memiliki latar belakang transparan (PNG) untuk hasil terbaik di struk pembayaran.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
