import React, { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { Plus, Minus, Edit2, Trash2, Package, Search, ChevronRight, Hash, DollarSign, Image as ImageIcon, History, Upload, X } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';

const InventoryView: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, toggleReady } = useApp();
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState<Product | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const ProductForm: React.FC<{ initialData?: Product; onCancel: () => void }> = ({ initialData, onCancel }) => {
    const [formData, setFormData] = useState({
      name: initialData?.name || '',
      category: initialData?.category || 'Coffee',
      price: initialData?.price || 0,
      isReady: initialData?.isReady ?? true
    });

    const categories: Product['category'][] = ['Coffee', 'Non-Coffee', 'Food', 'Snack', 'Pastry'];

    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      console.log("Submitting menu:", formData);
      try {
        const productData = { ...formData, isReady: formData.isReady };
        console.log("Final product data being sent:", productData);
        if (initialData) {
          await updateProduct({ ...productData, id: initialData.id });
        } else {
          await addProduct(productData);
        }
        console.log("Menu submission successful");
        onCancel();
      } catch (err: any) {
        console.error("Operation failed:", err);
        setError(err.message || 'Gagal menyimpan menu. Silakan coba lagi.');
      }
    };

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-[2rem] border border-coffee-100 shadow-xl"
      >
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">
            {error}
          </div>
        )}
        <h3 className="text-xl font-bold text-coffee-900 mb-6 flex items-center gap-2">
          {initialData ? <Edit2 size={20} /> : <Plus size={20} />}
          {initialData ? 'Ubah Menu' : 'Tambah Menu Baru'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-coffee-400 ml-1">Nama Menu</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-cream-50 border border-coffee-100 rounded-xl focus:ring-2 focus:ring-coffee-500/20 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-coffee-400 ml-1">Kategori</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-4 py-3 bg-cream-50 border border-coffee-100 rounded-xl focus:ring-2 focus:ring-coffee-500/20 focus:outline-none"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-coffee-400 ml-1">Harga (IDR)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400 font-bold text-xs">Rp</span>
                <input
                  required
                  type="text"
                  value={formData.price.toLocaleString('id-ID')}
                  onChange={e => {
                    const value = e.target.value.replace(/\D/g, '');
                    setFormData({ ...formData, price: Number(value) });
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-cream-50 border border-coffee-100 rounded-xl focus:ring-2 focus:ring-coffee-500/20 focus:outline-none font-bold text-coffee-900"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-coffee-400 ml-1">Status Awal</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isReady: true })}
                  className={cn("flex-1 py-3 rounded-xl text-xs font-bold border transition-all", formData.isReady ? "bg-green-500 text-white border-green-500" : "bg-white text-coffee-300 border-coffee-100")}
                >
                  READY
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isReady: false })}
                  className={cn("flex-1 py-3 rounded-xl text-xs font-bold border transition-all", !formData.isReady ? "bg-red-500 text-white border-red-500" : "bg-white text-coffee-300 border-coffee-100")}
                >
                  HABIS
                </button>
              </div>
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
              Simpan Menu
            </button>
          </div>
        </form>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-8">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-coffee-900 tracking-tight">Manajemen Menu</h2>
          <p className="text-coffee-400 font-medium text-sm">Atur ketersediaan dan daftar menu café Anda.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="px-6 py-3 bg-coffee-800 text-white rounded-2xl flex items-center gap-2 font-bold hover:bg-coffee-900 transition-all shadow-lg shadow-coffee-800/20"
        >
          <Plus size={20} />
          Tambah Menu
        </button>
      </div>

      <AnimatePresence>
        {(isAdding || isEditing) && (
          <div className="fixed inset-0 z-[60] bg-coffee-950/20 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
               <ProductForm 
                 initialData={isEditing || undefined} 
                 onCancel={() => { setIsAdding(false); setIsEditing(null); }} 
               />
            </div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex-1 bg-white rounded-[2.5rem] border border-coffee-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-coffee-50 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400" size={18} />
            <input
              type="text"
              placeholder="Cari menu..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-cream-50 border border-coffee-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-coffee-500/20 text-sm font-medium"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white z-10 border-b border-coffee-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-coffee-300">Menu</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-coffee-300">Kategori</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-coffee-300">Harga</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-coffee-300 text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-coffee-300 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-coffee-50">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-cream-50/50 group transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-coffee-900">{p.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold px-3 py-1 bg-coffee-50 text-coffee-600 rounded-full">{p.category}</span>
                  </td>
                  <td className="px-6 py-4 font-bold text-coffee-800">{formatCurrency(p.price)}</td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => toggleReady(p.id)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                        p.isReady ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-red-50 text-red-600 hover:bg-red-100"
                      )}
                    >
                      {p.isReady ? 'READY' : 'HABIS'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                         onClick={() => setIsEditing(p)}
                         className="p-2 text-coffee-400 hover:text-coffee-800 transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => deleteProduct(p.id)}
                        className="p-2 text-coffee-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredProducts.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="h-20 w-20 bg-coffee-50 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-coffee-100">
                <Search size={32} className="text-coffee-200" />
              </div>
              <h4 className="text-sm font-black text-coffee-900 uppercase">Tidak Ada Hasil</h4>
              <p className="text-xs text-coffee-400 mt-1">Coba cari dengan kata kunci lain.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryView;
