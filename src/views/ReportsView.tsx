import React, { useMemo } from 'react';
import { useApp } from '../hooks/useApp';
import { 
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import { formatCurrency, cn } from '../lib/utils';
import { TrendingUp, Users, ShoppingBag, Wallet, Calendar, Coffee, ArrowUpRight, BarChart3 as BarChart } from 'lucide-react';
import { startOfDay, endOfDay, subDays, isWithinInterval, format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

const ReportsView: React.FC = () => {
  const { sales, products, theme } = useApp();

  const chartColors = {
    text: theme === 'dark' ? '#e0e0e0' : '#a1887f',
    grid: theme === 'dark' ? '#333333' : '#f0f0f0',
    primary: theme === 'dark' ? '#d7ccc8' : '#3e2723',
    tooltipBg: theme === 'dark' ? '#111111' : '#ffffff',
    tooltipBorder: theme === 'dark' ? '#333333' : '#efebe9'
  };

  const stats = useMemo(() => {
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const totalTransactions = sales.length;
    const totalItemsSold = sales.reduce((sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.quantity, 0), 0);
    const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    return [
      { label: 'Pendapatan Total', value: formatCurrency(totalRevenue), icon: TrendingUp, color: 'bg-coffee-800 text-cream-50', delta: '+12.5%' },
      { label: 'Total Transaksi', value: totalTransactions.toString(), icon: ShoppingBag, color: 'bg-coffee-100 text-coffee-800', delta: '+5.2%' },
      { label: 'Item Terjual', value: totalItemsSold.toString(), icon: Coffee, color: 'bg-coffee-100 text-coffee-800', delta: '+8.1%' },
      { label: 'Rata-rata Struk', value: formatCurrency(avgTransactionValue), icon: Wallet, color: 'bg-coffee-100 text-coffee-800', delta: '+3.4%' },
    ];
  }, [sales]);

  const salesData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const daySales = sales.filter(s => {
        return isWithinInterval(new Date(s.timestamp), {
          start: startOfDay(d),
          end: endOfDay(d)
        });
      });

      return {
        name: format(d, 'EEE'),
        revenue: daySales.reduce((sum, s) => sum + s.total, 0),
        count: daySales.length
      };
    });
    return last7Days;
  }, [sales]);

  const topProducts = useMemo(() => {
    const counts: Record<string, { name: string; quantity: number; revenue: number }> = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!counts[item.productId]) {
          counts[item.productId] = { name: item.name, quantity: 0, revenue: 0 };
        }
        counts[item.productId].quantity += item.quantity;
        counts[item.productId].revenue += item.total;
      });
    });

    return Object.values(counts)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [sales]);

  const categoryMix = useMemo(() => {
    const categories: Record<string, number> = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          categories[prod.category] = (categories[prod.category] || 0) + item.total;
        }
      });
    });

    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [sales, products]);

  const COLORS = ['#3e2723', '#5d4037', '#795548', '#8d6e63', '#a1887f'];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-coffee-900 tracking-tight">Laporan Penjualan</h2>
          <p className="text-coffee-400 font-medium text-sm">Monitor performa bisnis café Anda secara realtime.</p>
        </div>
        <div className="text-xs font-bold text-coffee-400 uppercase tracking-widest flex items-center gap-2 bg-coffee-50 px-4 py-2 rounded-xl border border-coffee-100">
          <Calendar size={14} />
          7 Hari Terakhir
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[2.5rem] border border-coffee-100/60 shadow-sm flex flex-col group hover:shadow-2xl hover:shadow-coffee-500/10 transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-coffee-50 rounded-full -mr-12 -mt-12 opacity-40 group-hover:scale-125 transition-transform" />
            
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 relative z-10 shadow-lg", stat.color)}>
              <stat.icon size={24} strokeWidth={2.5} />
            </div>
            
            <div className="relative z-10">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-coffee-300 mb-2 block">{stat.label}</span>
              <div className="flex items-baseline gap-2">
                <h4 className="text-2xl font-black text-coffee-900 tracking-tighter">{stat.value}</h4>
              </div>
              <div className="mt-3 flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg w-fit">
                <TrendingUp size={10} strokeWidth={3} />
                <span className="text-[10px] font-black">{stat.delta}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-coffee-100/60 shadow-xl shadow-coffee-500/5 h-[500px] flex flex-col group">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-lg font-black text-coffee-900 tracking-tight">Tren Pendapatan</h3>
              <p className="text-[10px] font-bold text-coffee-300 uppercase tracking-widest mt-1">Grafik mingguan cafe anda</p>
            </div>
            <div className="h-10 w-10 bg-coffee-50 rounded-xl flex items-center justify-center text-coffee-400 group-hover:text-coffee-600 transition-colors">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3e2723" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3e2723" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="6 6" vertical={false} stroke={chartColors.grid} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: chartColors.text, fontSize: 10, fontWeight: 800}}
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: chartColors.text, fontSize: 10, fontWeight: 700}}
                  tickFormatter={(val) => `Rp${val/1000}k`}
                />
                <RechartsTooltip 
                  cursor={{ stroke: chartColors.primary, strokeWidth: 1, strokeDasharray: '4 4' }}
                  contentStyle={{ 
                    borderRadius: '20px', 
                    border: `1px solid ${chartColors.tooltipBorder}`, 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', 
                    background: chartColors.tooltipBg,
                    padding: '12px 16px'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: '900', color: chartColors.primary }}
                  labelStyle={{ fontSize: '10px', fontWeight: '800', color: chartColors.text, marginBottom: '4px', textTransform: 'uppercase' }}
                  formatter={(value: any) => [formatCurrency(value), 'Pendapatan']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke={chartColors.primary} 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border border-coffee-100/60 shadow-xl shadow-coffee-500/5 flex flex-col">
          <h3 className="text-lg font-black text-coffee-900 mb-8 tracking-tight flex items-center gap-2">
            Peringkat Menu
            <span className="text-[10px] font-black bg-coffee-50 text-coffee-400 px-2 py-0.5 rounded-lg uppercase tracking-widest">Top 5</span>
          </h3>
          <div className="flex-1 space-y-6">
            {topProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-4 group cursor-pointer">
                <div className="relative">
                  <span className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black transition-all shadow-sm",
                    i === 0 ? "bg-amber-100 text-amber-700 shadow-amber-100/50 scale-110" : "bg-coffee-50 text-coffee-400 group-hover:bg-coffee-900 group-hover:text-white"
                  )}>
                    {i + 1}
                  </span>
                  {i === 0 && (
                    <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white rounded-full p-0.5">
                      <TrendingUp size={10} strokeWidth={4} />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-coffee-900 truncate leading-none mb-1.5">{p.name}</p>
                  <div className="w-full bg-coffee-50 h-1 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(p.revenue / topProducts[0].revenue) * 100}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="bg-coffee-900 h-full rounded-full" 
                    />
                  </div>
                  <p className="text-[9px] text-coffee-300 font-bold uppercase tracking-widest mt-1">{p.quantity} Terjual</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-coffee-900">{formatCurrency(p.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[3rem] border border-coffee-50 shadow-sm flex flex-col items-center">
            <h3 className="text-lg font-black text-coffee-900 self-start mb-4 tracking-tight">Komposisi Kategori</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryMix}
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {categoryMix.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={8} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {categoryMix.map((c, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[10px] font-bold text-coffee-400 uppercase tracking-widest">{c.name}</span>
                </div>
              ))}
            </div>
        </div>

        <div className="bg-coffee-900 p-8 rounded-[3rem] border border-coffee-800 shadow-xl shadow-coffee-900/30 text-cream-50 flex flex-col relative overflow-hidden">
           <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl opacity-50" />
           <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-3xl opacity-50" />
           
           <div className="z-10 flex flex-col h-full">
              <h3 className="text-lg font-bold tracking-tight mb-2 opacity-80 uppercase text-[10px] tracking-[0.2em]">Kesehatan Bisnis</h3>
              <p className="text-2xl font-black mb-6">Pekerjaan Bagus, Tim!</p>
              
              <div className="space-y-4 flex-1">
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                   <p className="text-xs font-bold opacity-60">Transaksi Teramai</p>
                   <p className="text-lg font-bold mt-1">10 AM - 12 PM</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                   <p className="text-xs font-bold opacity-60">Kategori Primadona</p>
                   <p className="text-lg font-bold mt-1">{categoryMix[0]?.name || 'Coffee'}</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20">
                    <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100&h=100&auto=format&fit=crop" alt="" />
                 </div>
                 <div>
                    <p className="text-xs font-bold opacity-60 italic whitespace-nowrap">"Layanan yang tenang, hati pun senang."</p>
                    <p className="text-[10px] font-black uppercase tracking-widest mt-1">- Manager Harmony</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-coffee-50 shadow-sm overflow-hidden">
        <h3 className="text-lg font-black text-coffee-900 p-8 pb-4 tracking-tight">Detail Transaksi Terbaru</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-coffee-50">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-coffee-400">Waktu</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-coffee-400">Pelanggan</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-coffee-400">Pesanan</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-coffee-400 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-coffee-50">
              {[...sales].reverse().slice(0, 20).map((sale) => (
                <tr key={sale.id} className="hover:bg-cream-50/30 transition-colors">
                  <td className="px-8 py-4 text-xs font-medium text-coffee-400">
                    {format(new Date(sale.timestamp), 'HH:mm • dd MMM')}
                  </td>
                  <td className="px-8 py-4">
                    <span className="text-sm font-bold text-coffee-900">{sale.customerName}</span>
                  </td>
                  <td className="px-8 py-4 max-w-xs">
                    <div className="flex flex-wrap gap-1">
                      {sale.items.map((item, id) => (
                        <div key={id} className="flex flex-col mb-1 last:mb-0">
                          <span className="text-[10px] font-bold bg-cream-100 text-coffee-600 px-2 py-0.5 rounded-lg whitespace-nowrap self-start">
                            {item.quantity}x {item.name}
                          </span>
                          {item.note && (
                            <span className="text-[9px] text-coffee-400 font-medium italic ml-2 mt-0.5">
                              Note: {item.note}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <span className="text-sm font-black text-coffee-800">{formatCurrency(sale.total)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
