import React, { useState, useMemo } from 'react';
import { useApp } from '../hooks/useApp';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, ShoppingCart, Info, CheckCircle2, Ticket, User as UserIcon, X, Coffee } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Sale, PaymentMethod } from '../types';
import ReceiptModal from '../components/ReceiptModal';

const POSView: React.FC = () => {
  const { 
    products, cart, addToCart, removeFromCart, updateCartQuantity, updateCartNote,
    processTransaction, clearCart, discounts, settings, paymentMethods
  } = useApp();
  
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [category, setCategory] = useState('All');
  const [showReceipt, setShowReceipt] = useState(false);
  const [showQRIS, setShowQRIS] = useState(false);
  const [pendingPaymentMethodId, setPendingPaymentMethodId] = useState<string | null>(null);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  const categories = ['All', 'Coffee', 'Non-Coffee', 'Food', 'Snack', 'Pastry'];
  
  // Dynamic currency and tax from settings
  const taxRate = settings?.taxRate || 10;
  
  // Menggunakan API QR Server untuk generate QR Code dinamis
  const qrisImage = React.useMemo(() => {
    if (settings?.qrisImageUrl) return settings.qrisImageUrl;
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(settings?.qrisData || (settings?.name || 'BossKasir'))}`;
  }, [settings?.name, settings?.qrisData, settings?.qrisImageUrl]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'All' || p.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  
  // Predict discount for UI
  const bestDiscount = useMemo(() => {
    if (subtotal === 0) return null;
    const now = new Date();
    const active = discounts.filter(d => {
      const start = new Date(d.startDate);
      const end = new Date(d.endDate);
      return now >= start && now <= end && (!d.minPurchase || subtotal >= d.minPurchase);
    });
    if (active.length === 0) return null;
    return active.reduce((b, c) => {
      const cV = c.type === 'percentage' ? (subtotal * c.value) / 100 : c.value;
      const bV = b.type === 'percentage' ? (subtotal * b.value) / 100 : b.value;
      return cV > bV ? c : b;
    });
  }, [subtotal, discounts]);

  const discountAmount = bestDiscount 
    ? (bestDiscount.type === 'percentage' ? (subtotal * bestDiscount.value) / 100 : bestDiscount.value)
    : 0;
  
  const tax = (subtotal - discountAmount) * (taxRate / 100);
  const total = subtotal - discountAmount + tax;

  const handleCheckout = (pm: PaymentMethod) => {
    if (pm.type === 'non-cash') {
      setPendingPaymentMethodId(pm.id);
      setShowQRIS(true);
      return;
    }
    
    confirmPayment(pm.id);
  };

  const confirmPayment = async (methodId: string) => {
    const sale = await processTransaction(methodId, customerName);
    if (sale) {
      setLastSale(sale);
      setShowReceipt(true);
      setCustomerName('');
      setShowQRIS(false);
      setPendingPaymentMethodId(null);
    }
  };

  const activePaymentMethods = paymentMethods.filter(pm => pm.isActive);

  return (
    <div className="h-full flex gap-6">
      {/* Product Selection Section */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400" size={20} />
            <input
              type="text"
              placeholder="Cari menu favorit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-coffee-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-coffee-500/20 focus:border-coffee-500 transition-all font-medium shadow-sm shadow-coffee-100/30"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-xl whitespace-nowrap text-xs font-bold transition-all border shadow-sm",
                  category === cat
                    ? "bg-coffee-800 text-white border-coffee-800"
                    : "bg-white text-coffee-500 border-coffee-100 hover:border-coffee-200"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
          <AnimatePresence>
            {filteredProducts.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => p.isReady && addToCart(p)}
                className={cn(
                  "bg-white rounded-2xl border border-coffee-100 cursor-pointer group hover:shadow-md hover:shadow-coffee-100/30 transition-all relative flex flex-col p-5 gap-3",
                  !p.isReady && "opacity-60 grayscale pointer-events-none"
                )}
              >
                {!p.isReady && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/5 rounded-2xl">
                    <span className="bg-red-500 text-white px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">Habis</span>
                  </div>
                )}
                
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-coffee-50 rounded-lg text-coffee-400 group-hover:bg-coffee-100 group-hover:text-coffee-600 transition-colors">
                      <Coffee size={16} />
                    </div>
                    <span className="text-[10px] font-bold text-coffee-300 uppercase tracking-widest truncate">{p.category}</span>
                  </div>
                  
                  <h3 className="font-bold text-coffee-900 group-hover:text-coffee-600 transition-colors text-sm mb-4 line-clamp-2 leading-tight flex-1">{p.name}</h3>
                  
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-coffee-50">
                    <span className="text-coffee-800 font-black text-sm">{formatCurrency(p.price)}</span>
                    <div className="h-8 w-8 rounded-full bg-coffee-50 flex items-center justify-center text-coffee-400 group-hover:bg-coffee-800 group-hover:text-white transition-all">
                      <Plus size={16} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Cart / Order Section */}
      <div className="w-96 bg-white border border-coffee-100 rounded-[2.5rem] shadow-2xl shadow-coffee-200/40 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-coffee-50 flex flex-col gap-4 bg-coffee-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-coffee-100 rounded-xl text-coffee-800">
                <ShoppingCart size={20} />
              </div>
              <div>
                <h2 className="font-bold text-coffee-900 leading-none">Order Details</h2>
                <p className="text-xs text-coffee-400 mt-1">{cart.reduce((s, i) => s + i.quantity, 0)} items</p>
              </div>
            </div>
            <button 
              onClick={clearCart}
              className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              Reset
            </button>
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400">
              <UserIcon size={14} />
            </div>
            <input 
              type="text"
              placeholder="Nama Pelanggan..."
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-coffee-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-coffee-500/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-cream-100 rounded-full flex items-center justify-center mb-4 text-coffee-300">
                <ShoppingCart size={32} />
              </div>
              <p className="text-coffee-400 font-medium">Belum ada pesanan.</p>
              <p className="text-[10px] text-coffee-300 mt-1 uppercase tracking-widest">Silakan pilih menu di samping</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {cart.map((item) => (
                <motion.div
                  key={item.productId}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-cream-50/50 p-3 rounded-2xl border border-transparent hover:border-coffee-100 transition-all flex items-center gap-3 group"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-coffee-900 text-sm truncate">{item.name}</h4>
                    <p className="text-xs font-medium text-coffee-500">{formatCurrency(item.price)}</p>
                    <input 
                      type="text" 
                      placeholder="Add note..."
                      value={item.note || ''}
                      onChange={(e) => updateCartNote(item.productId, e.target.value)}
                      className="w-full mt-1.5 text-[10px] bg-white/50 border-b border-coffee-100 focus:border-coffee-400 focus:outline-none py-0.5 text-coffee-600 font-medium placeholder:text-coffee-200"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-white rounded-xl border border-coffee-100 p-1">
                    <button 
                      onClick={() => item.quantity > 1 ? updateCartQuantity(item.productId, item.quantity - 1) : removeFromCart(item.productId)}
                      className="p-1 hover:bg-coffee-50 rounded-lg text-coffee-400 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-coffee-800">{item.quantity}</span>
                    <button 
                      onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                      className="p-1 hover:bg-coffee-50 rounded-lg text-coffee-800 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.productId)}
                    className="p-2 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        <div className="p-6 bg-coffee-50/30 border-t border-coffee-100 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-coffee-400">Subtotal</span>
              <span className="text-coffee-800">{formatCurrency(subtotal)}</span>
            </div>
            
            {bestDiscount && (
              <div className="flex justify-between text-sm font-bold text-green-600 bg-green-50 p-2 rounded-xl border border-green-100">
                <div className="flex items-center gap-1.5">
                  <Ticket size={14} />
                  <span>Diskon: {bestDiscount.name}</span>
                </div>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm font-medium">
              <span className="text-coffee-400">Pajak (PB1 {taxRate}%)</span>
              <span className="text-coffee-800">{formatCurrency(tax)}</span>
            </div>
            
            <div className="pt-3 border-t border-coffee-100 flex justify-between items-end">
              <span className="text-sm font-bold text-coffee-400 uppercase tracking-widest">Total Bayar</span>
              <span className="text-2xl font-black text-coffee-900 tracking-tight">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {activePaymentMethods.map(pm => (
              <button
                key={pm.id}
                disabled={cart.length === 0}
                onClick={() => handleCheckout(pm)}
                className={cn(
                  "flex flex-col items-center gap-1 py-4 border rounded-2xl transition-all group disabled:opacity-50 disabled:pointer-events-none",
                  pm.type === 'cash' 
                    ? "bg-white border-coffee-200 hover:border-coffee-800 hover:bg-coffee-50"
                    : "bg-coffee-800 border-coffee-800 hover:bg-coffee-900 text-white shadow-lg shadow-coffee-800/20"
                )}
              >
                {pm.type === 'cash' ? <Banknote className="text-coffee-400 group-hover:text-coffee-800 transition-colors" size={24} /> : <CreditCard size={24} />}
                <span className={cn("text-[10px] font-bold tracking-wider uppercase", pm.type === 'cash' ? "text-coffee-800" : "text-white")}>
                  {pm.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {showReceipt && lastSale && (
        <ReceiptModal 
          sale={lastSale} 
          onClose={() => {
            setShowReceipt(false);
            setLastSale(null);
          }} 
        />
      )}

      <AnimatePresence>
        {showQRIS && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-coffee-950/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] shadow-2xl w-full max-w-sm flex flex-col items-center p-8 overflow-hidden relative"
            >
              <div className="w-full flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-coffee-900 tracking-tight italic">Scan QRIS</h3>
                <button 
                  onClick={() => setShowQRIS(false)} 
                  className="p-2 hover:bg-cream-100 rounded-full transition-colors text-coffee-400"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="text-center mb-6">
                <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-widest mb-1">Total Pembayaran</p>
                <h2 className="text-3xl font-black text-coffee-900 tracking-tight">{formatCurrency(total)}</h2>
              </div>

              <div className="bg-white p-4 rounded-[2.5rem] border-2 border-coffee-100 shadow-xl shadow-coffee-100/20 mb-8 w-full aspect-square flex items-center justify-center overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                <div className="relative w-full h-full flex items-center justify-center">
                  <img 
                    src={qrisImage} 
                    alt="QRIS Pembayaran" 
                    className="w-full h-full object-contain relative z-10" 
                    onLoad={() => console.log("QRIS Loaded")}
                    onError={(e) => {
                      console.error("QRIS Failed to load. URL:", qrisImage);
                      (e.target as HTMLImageElement).src = "https://placehold.co/400x400?text=QRIS+Error";
                    }}
                  />
                </div>
              </div>

              <div className="w-full grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowQRIS(false)}
                  className="py-4 bg-white border border-coffee-200 rounded-2xl text-coffee-900 font-bold text-sm hover:bg-cream-50 transition-all shadow-sm"
                >
                  Batal
                </button>
                <button 
                  onClick={() => pendingPaymentMethodId && confirmPayment(pendingPaymentMethodId)}
                  className="py-4 bg-coffee-800 text-white rounded-2xl font-bold text-sm hover:bg-coffee-900 transition-all shadow-lg shadow-coffee-800/40"
                >
                  Sudah Bayar
                </button>
              </div>
              
              <div className="mt-6 flex flex-col items-center gap-1 opacity-40">
                <p className="text-[8px] font-bold text-coffee-400 uppercase tracking-[0.2em]">Sacred Cafe Payment System</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default POSView;
