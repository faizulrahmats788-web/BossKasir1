import React, { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { Plus, Trash2, Tag, Calendar, DollarSign, Percent, Info, AlertCircle } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Discount } from '../types';
import { format, parseISO } from 'date-fns';

const DiscountView: React.FC = () => {
  const { discounts, addDiscount, deleteDiscount } = useApp();
  const [isAdding, setIsAdding] = useState(false);

  const DiscountForm: React.FC<{ onCancel: () => void }> = ({ onCancel }) => {
    const [formData, setFormData] = useState({
      name: '',
      type: 'percentage' as 'percentage' | 'fixed',
      value: 0,
      startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      endDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
      minPurchase: 0
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await addDiscount({
          ...formData,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: new Date(formData.endDate).toISOString(),
        });
        onCancel();
      } catch (err) {
        console.error("Failed to add discount:", err);
      }
    };

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-[2rem] border border-coffee-100 shadow-xl w-full max-w-lg"
      >
        <h3 className="text-xl font-bold text-coffee-900 mb-6 flex items-center gap-2">
          <Tag size={20} />
          Tambah Diskon Baru
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-coffee-400 ml-1">Nama Promo</label>
            <input
              required
              type="text"
              placeholder="e.g. Promo Merdeka"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-cream-50 border border-coffee-100 rounded-xl focus:ring-2 focus:ring-coffee-500/20 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-coffee-400 ml-1">Tipe</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-4 py-3 bg-cream-50 border border-coffee-100 rounded-xl focus:ring-2 focus:ring-coffee-500/20 focus:outline-none font-bold"
              >
                <option value="percentage">Persentase (%)</option>
                <option value="fixed">Fixed (Rp)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-coffee-400 ml-1">Nilai</label>
              <div className="relative">
                {formData.type === 'percentage' ? (
                  <Percent size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-300" />
                ) : (
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400 font-bold text-xs">Rp</span>
                )}
                <input
                  required
                  type="text"
                  value={formData.type === 'percentage' ? formData.value : formData.value.toLocaleString('id-ID')}
                  onChange={e => {
                    const value = e.target.value.replace(/\D/g, '');
                    setFormData({ ...formData, value: Number(value) });
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-cream-50 border border-coffee-100 rounded-xl focus:ring-2 focus:ring-coffee-500/20 focus:outline-none font-bold"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-coffee-400 ml-1">Waktu Mulai</label>
              <input
                required
                type="datetime-local"
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-3 bg-cream-50 border border-coffee-100 rounded-xl focus:ring-2 focus:ring-coffee-500/20 focus:outline-none text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-coffee-400 ml-1">Waktu Selesai</label>
              <input
                required
                type="datetime-local"
                value={formData.endDate}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-3 bg-cream-50 border border-coffee-100 rounded-xl focus:ring-2 focus:ring-coffee-500/20 focus:outline-none text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-coffee-400 ml-1">Minimal Pembelian (Opsional)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400 font-bold text-xs">Rp</span>
              <input
                type="text"
                value={formData.minPurchase.toLocaleString('id-ID')}
                onChange={e => {
                  const value = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, minPurchase: Number(value) });
                }}
                className="w-full pl-10 pr-4 py-3 bg-cream-50 border border-coffee-100 rounded-xl focus:ring-2 focus:ring-coffee-500/20 focus:outline-none font-bold"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 border border-coffee-100 text-coffee-600 rounded-xl font-bold hover:bg-cream-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-coffee-800 text-white rounded-xl font-bold hover:bg-coffee-900 transition-all shadow-lg shadow-coffee-800/20"
            >
              Simpan Diskon
            </button>
          </div>
        </form>
      </motion.div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-coffee-900 tracking-tight">Sistem Diskon</h2>
          <p className="text-coffee-400 font-medium text-sm">Kelola event dan promo spesial di café Anda.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="px-6 py-3 bg-coffee-800 text-white rounded-2xl flex items-center gap-2 font-bold hover:bg-coffee-900 transition-all shadow-lg shadow-coffee-800/10"
        >
          <Plus size={20} />
          Tambah Promo
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2.5rem] flex gap-4 items-start">
        <div className="p-3 bg-amber-500 text-white rounded-2xl">
          <Info size={24} />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-amber-900">Aturan Diskon Otomatis</h4>
          <p className="text-sm text-amber-700 leading-relaxed font-bold">
            Sistem Harmony akan otomatis menerapkan diskon yang berlaku berdasarkan tanggal dan minimal pembelian. 
            Jika terdapat lebih dari satu promo aktif, sistem akan <span className="font-black underline italic">memilih diskon dengan nilai tertinggi</span> untuk pelanggan.
          </p>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] bg-coffee-950/40 backdrop-blur-md flex items-center justify-center p-4">
             <DiscountForm onCancel={() => setIsAdding(false)} />
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {discounts.map((d) => {
          const now = new Date();
          const start = parseISO(d.startDate);
          const end = parseISO(d.endDate);
          const isActive = now >= start && now <= end;

          return (
            <motion.div
              layout
              key={d.id}
              whileHover={{ y: -5 }}
              className={cn(
                "bg-white rounded-[3rem] border border-coffee-100/60 p-8 flex flex-col relative overflow-hidden transition-all shadow-sm hover:shadow-2xl hover:shadow-coffee-500/10",
                !isActive && "opacity-60 bg-cream-50 grayscale-[0.3]"
              )}
            >
              <div className="absolute top-0 right-0 p-8">
                <div className={cn(
                  "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border",
                  isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-coffee-50 text-coffee-300 border-coffee-100"
                )}>
                  {isActive ? 'Live Now' : 'Pending'}
                </div>
              </div>

              <div className="mb-8">
                <div className="w-14 h-14 bg-coffee-50 rounded-2xl flex items-center justify-center text-coffee-800 mb-6 border border-coffee-100/50 transition-transform hover:scale-110">
                  <Tag size={28} strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-black text-coffee-900 mb-2 truncate pr-20">{d.name}</h3>
                <div className="text-5xl font-black text-coffee-900 tracking-tighter flex items-start">
                  <span className={cn(d.type === 'fixed' && "text-xl mt-3 mr-1")}>{d.type === 'fixed' ? 'Rp' : ''}</span>
                  {d.type === 'percentage' ? `${d.value}%` : d.value.toLocaleString()}
                </div>
              </div>

              <div className="space-y-4 flex-1 pb-8 border-b border-coffee-50">
                <div className="flex items-center gap-3 text-xs font-bold text-coffee-400">
                  <div className="h-2 w-2 rounded-full bg-coffee-200" />
                  <span>Periode: </span>
                  <span className="text-coffee-600 font-black">{format(start, 'dd MMM')} - {format(end, 'dd MMM yyyy')}</span>
                </div>
                {d.minPurchase && d.minPurchase > 0 && (
                  <div className="flex items-center gap-3 text-xs font-bold text-coffee-400">
                    <div className="h-2 w-2 rounded-full bg-coffee-200" />
                    <span>Syarat Min: </span>
                    <span className="text-coffee-600 font-black">{formatCurrency(d.minPurchase)}</span>
                  </div>
                )}
              </div>

              <div className="pt-8 flex justify-between items-center">
                 <button 
                   onClick={() => deleteDiscount(d.id)}
                   className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100 flex items-center gap-2 shadow-sm"
                 >
                   <Trash2 size={14} strokeWidth={3} />
                   Hapus Promo
                 </button>
                 
                 <div className="flex flex-col items-end">
                    {isActive ? (
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Berlangsung</span>
                    ) : now < start ? (
                      <span className="text-[9px] font-black text-coffee-300 uppercase tracking-widest italic">Akan Datang</span>
                    ) : (
                      <span className="text-[9px] font-black text-red-300 uppercase tracking-widest italic">Selesai</span>
                    )}
                 </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {discounts.length === 0 && (
        <div className="h-80 rounded-[3rem] border-2 border-dashed border-coffee-100/50 flex flex-col items-center justify-center text-center p-10 bg-white/50">
           <div className="w-20 h-20 bg-coffee-50 rounded-full flex items-center justify-center mb-6">
              <Tag size={40} className="text-coffee-200" strokeWidth={1} />
           </div>
           <h4 className="font-black uppercase tracking-widest text-coffee-900 mb-2">Belum Ada Promo</h4>
           <p className="text-sm text-coffee-400 font-bold max-w-xs">Mulai buat promo spesial untuk meningkatkan penjualan Anda hari ini.</p>
           <button 
             onClick={() => setIsAdding(true)}
             className="mt-8 px-6 py-3 bg-white border border-coffee-100 text-coffee-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-coffee-500 transition-all shadow-sm"
           >
             Buat Promo Sekarang
           </button>
        </div>
      )}
    </div>
  );
};

export default DiscountView;
