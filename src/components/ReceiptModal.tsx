import React, { useRef } from 'react';
import { Sale } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { Printer, X, CheckCircle2, Coffee } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../hooks/useApp';

interface ReceiptModalProps {
  sale: Sale;
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  const { settings } = useApp();
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-coffee-950/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm flex flex-col overflow-hidden max-h-[90vh]"
      >
        <div className="p-6 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 size={24} />
            <span className="font-bold tracking-tight">Pembayaran Berhasil!</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-cream-100 rounded-full transition-colors text-coffee-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-4 scrollbar-hide print:p-0">
          <div 
            ref={receiptRef}
            className="bg-cream-50/50 rounded-3xl p-6 border border-dashed border-coffee-200 print:border-none print:bg-white"
          >
            <div className="text-center space-y-1 mb-8 border-b-2 border-dashed border-coffee-100 pb-6">
              {(settings?.receiptShowLogo !== false) && (
                settings?.logoUrl ? (
                  <img 
                    src={settings.logoUrl} 
                    alt="Logo" 
                    className="mx-auto w-12 h-12 object-cover rounded-xl mb-3" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = "https://picsum.photos/seed/bosskasir/150/150";
                    }}
                  />
                ) : (
                  <div className="mx-auto w-12 h-12 bg-coffee-800 text-cream-50 rounded-xl flex items-center justify-center mb-3">
                    <Coffee size={24} />
                  </div>
                )
              )}
              <h2 className="text-xl font-black text-coffee-900 tracking-tight italic">{settings?.name || 'BossKasir'}</h2>
              <p className="text-[10px] text-coffee-400 font-medium tracking-widest uppercase">{settings?.address || 'The Essence of Coffee'}</p>
              <p className="text-[10px] text-coffee-400 font-medium">{settings?.phone || '021-8888-0000'}</p>
            </div>

            <div className="space-y-1 text-[10px] text-coffee-500 font-semibold mb-6">
              <div className="flex justify-between">
                <span>RESI :</span>
                <span className="text-coffee-900">{sale.id}</span>
              </div>
              <div className="flex justify-between">
                <span>TANGGAL :</span>
                <span className="text-coffee-900">{formatDate(new Date(sale.timestamp))}</span>
              </div>
              <div className="flex justify-between">
                <span>KASIR :</span>
                <span className="text-coffee-900">{sale.userName}</span>
              </div>
              <div className="flex justify-between border-t border-coffee-100 mt-1 pt-1">
                <span>CUST :</span>
                <span className="text-coffee-900 font-bold">{sale.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>METODE :</span>
                <span className="text-coffee-900 uppercase">{sale.paymentMethod}</span>
              </div>
            </div>

            <div className="space-y-4 mb-6 pt-4 border-t border-dashed border-coffee-100">
              {sale.items.map((item, id) => (
                <div key={id} className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-coffee-900">{item.name}</p>
                    <p className="text-[10px] text-coffee-400">{item.quantity} x {formatCurrency(item.price)}</p>
                    {item.note && (
                      <p className="text-[9px] text-coffee-500 italic mt-0.5 ml-1">
                        * {item.note}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-bold text-coffee-900">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-4 border-t-2 border-dashed border-coffee-100">
              <div className="flex justify-between text-xs font-medium text-coffee-400">
                <span>Subtotal</span>
                <span className="text-coffee-900">{formatCurrency(sale.subtotal)}</span>
              </div>
              
              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-xs font-bold text-green-600">
                  <span>Promo ({sale.discountName})</span>
                  <span>-{formatCurrency(sale.discountAmount)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-xs font-medium text-coffee-400">
                <span>PB1 ({settings?.taxRate || 10}%)</span>
                <span className="text-coffee-900">{formatCurrency(sale.tax)}</span>
              </div>
              
              <div className="flex justify-between items-end pt-2">
                <span className="text-xs font-black text-coffee-400 uppercase tracking-widest">TOTAL</span>
                <span className="text-lg font-black text-coffee-900">{formatCurrency(sale.total)}</span>
              </div>
            </div>

            <div className="mt-8 text-center space-y-1">
              <p className="text-[10px] font-bold text-coffee-400 italic">
                {settings?.receiptFooterMessage || 'Terima kasih telah berkunjung!'}
              </p>
              {settings?.receiptWifiName && (
                <div className="pt-2">
                  <p className="text-[9px] font-black text-coffee-800 uppercase tracking-widest">WiFi Password:</p>
                  <p className="text-[10px] font-mono text-coffee-500">{settings.receiptWifiName}</p>
                </div>
              )}
              {settings?.receiptNote && (
                <p className="text-[9px] text-coffee-300 pt-2">{settings.receiptNote}</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-coffee-50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-white border border-coffee-200 rounded-2xl text-coffee-900 font-bold text-sm hover:bg-cream-50 transition-all border-b-4 active:border-b-0 active:translate-y-1"
          >
            Tutup
          </button>
          <button 
            onClick={handlePrint}
            className="flex-1 py-3 bg-coffee-800 text-white rounded-2xl font-bold text-sm hover:bg-coffee-900 transition-all flex items-center justify-center gap-2 border-b-4 border-coffee-950 active:border-b-0 active:translate-y-1 shadow-lg shadow-coffee-800/30"
          >
            <Printer size={18} />
            Cetak Struk
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ReceiptModal;
