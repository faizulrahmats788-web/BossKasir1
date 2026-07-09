import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, User, Discount, Sale, InventoryLog, SaleItem, CafeSettings, PaymentMethod } from '../types';
import { INITIAL_PRODUCTS, INITIAL_DISCOUNTS, INITIAL_SETTINGS, INITIAL_PAYMENT_METHODS } from '../constants';
import { isWithinInterval, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';

interface AppContextType {
  user: User | null;
  products: Product[];
  discounts: Discount[];
  sales: Sale[];
  inventoryLogs: InventoryLog[];
  cart: SaleItem[];
  settings: CafeSettings | null;
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  authError: string | null;
  dbWarning: string | null;
  theme: 'light' | 'dark';
  
  login: (username: string, email: string, password?: string) => Promise<boolean>;
  loginVerifyOtp: (username: string, email: string, otp: string, password?: string) => Promise<boolean>;
  register: (username: string, password?: string, name?: string, role?: 'admin' | 'cashier') => Promise<boolean>;
  sendOtp: (username: string, email: string) => Promise<void>;
  logout: () => void;
  clearAuthError: () => void;
  clearDbWarning: () => void;
  toggleTheme: () => void;
  
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  updateCartNote: (productId: string, note: string) => void;
  clearCart: () => void;
  
  processTransaction: (paymentMethodId: string, customerName: string) => Promise<Sale | null>;
  
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  
  addDiscount: (discount: Omit<Discount, 'id'>) => Promise<void>;
  updateDiscount: (discount: Discount) => Promise<void>;
  deleteDiscount: (id: string) => Promise<void>;
  
  updateSettings: (settings: CafeSettings) => Promise<void>;
  
  addPaymentMethod: (method: Omit<PaymentMethod, 'id'>) => Promise<void>;
  updatePaymentMethod: (method: PaymentMethod) => Promise<void>;
  deletePaymentMethod: (id: string) => Promise<void>;
  
  toggleReady: (productId: string) => Promise<void>;
  syncLocalToCloud: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const getDeterministicUUID = (username: string, email: string): string => {
  const combined = `${username.toLowerCase().trim()}:${email.toLowerCase().trim()}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padEnd(32, 'a');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(12, 15)}-a${hex.slice(15, 18)}-${hex.slice(18, 30)}`;
};

const generateUUIDv4 = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const formatSupabaseError = (error: any, tableName: string): Error => {
  if (!error) return new Error('Terjadi kesalahan database yang tidak diketahui.');
  const code = error.code || '';
  const msg = (error.message || '').toLowerCase();
  
  if (code === '42501' || msg.includes('row-level security') || msg.includes('violates row-level security') || msg.includes('policy')) {
    return new Error(
      `Keamanan Database (Row-Level Security / RLS) di Supabase memblokir operasi pada tabel '${tableName}'.\n\n` +
      `Solusi Cara Mengatasi RLS & Kunci Asing Secara Permanen untuk Semua Tabel:\n` +
      `1. Buka dashboard/konsol Supabase Anda.\n` +
      `2. Buka menu 'SQL Editor' dari menu samping kiri.\n` +
      `3. Tempel (copy-paste) kueri SQL berikut dan tekan tombol RUN:\n\n` +
      `   ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;\n` +
      `   ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;\n` +
      `   ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;\n` +
      `   ALTER TABLE public.discounts DISABLE ROW LEVEL SECURITY;\n` +
      `   ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;\n` +
      `   ALTER TABLE public.sale_items DISABLE ROW LEVEL SECURITY;\n` +
      `   ALTER TABLE public.inventory_logs DISABLE ROW LEVEL SECURITY;\n` +
      `   ALTER TABLE public.cafe_settings DISABLE ROW LEVEL SECURITY;\n` +
      `   ALTER TABLE public.payment_methods DISABLE ROW LEVEL SECURITY;\n\n` +
      `4. Setelah itu, silakan ulangi kembali langkah Anda.`
    );
  }
  
  if (code === '42703' || msg.includes('column') || msg.includes('does not exist')) {
    return new Error(
      `Struktur kolom pada tabel '${tableName}' tidak cocok atau kurang lengkap di database Anda.\n\n` +
      `Solusi:\n` +
      `Silakan jalankan script dari file SUPABASE_SCHEMA.sql yang telah kami sediakan untuk melengkapi kolom yang dibutuhkan.`
    );
  }

  if (code === '42P01' || msg.includes('relation') || msg.includes('does not exist')) {
    return new Error(
      `Tabel '${tableName}' tidak ditemukan di database Supabase Anda.\n\n` +
      `Solusi:\n` +
      `Silakan buka 'SQL Editor' di Supabase, jalankan script skema tabels yang ada di file SUPABASE_SCHEMA.sql.`
    );
  }

  if (code === '23503' || msg.includes('foreign key') || msg.includes('violates foreign key constraint') || msg.includes('fkey')) {
    return new Error(
      `Operasi gagal karena kendala Kunci Asing (Foreign Key / fkey) pada tabel '${tableName}'.\n\n` +
      `Ini biasanya terjadi jika akun profil Anda tidak dapat disimpan ke tabel 'profiles' karena terhalang oleh kebijakan Row-Level Security (RLS) atau karena ID relasi fkey menuntut input yang ada di tabel 'auth.users' asli.\n\n` +
      `Cara Mengatasi Secara Instan Tanpa Kehilangan Data:\n` +
      `1. Buka dashboard/konsol Supabase Anda.\n` +
      `2. Buka menu 'SQL Editor' dari menu samping kiri.\n` +
      `3. Tempel (copy-paste) kueri SQL berikut untuk menghapus kendala kunci asing dan menonaktifkan RLS pada seluruh tabel, lalu tekan tombol RUN:\n\n` +
      `   ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;\n` +
      `   ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;\n` +
      `   ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;\n` +
      `   ALTER TABLE public.discounts DISABLE ROW LEVEL SECURITY;\n` +
      `   ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;\n` +
      `   ALTER TABLE public.sale_items DISABLE ROW LEVEL SECURITY;\n` +
      `   ALTER TABLE public.inventory_logs DISABLE ROW LEVEL SECURITY;\n` +
      `   ALTER TABLE public.cafe_settings DISABLE ROW LEVEL SECURITY;\n` +
      `   ALTER TABLE public.payment_methods DISABLE ROW LEVEL SECURITY;\n\n` +
      `4. Setelah query selesai dijalankan, silakan langsung ulangi kembali langkah sinkronisasi Anda.`
    );
  }
  
  return new Error(error.message || `Kesalahan database: ${JSON.stringify(error)}`);
};

// Fungsi helper agar fetch ke /api tidak error di Vercel/Static host karena rewrite ke index.html
const fetchApiJson = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, options);
  
  // Baca response sebagai teks terlebih dahulu untuk menangani error HTML
  const text = await res.text();
  
  if (!res.ok) {
    // Coba deteksi jika ini adalah HTML error page
    if (text.toLowerCase().includes('<html>') || text.toLowerCase().includes('<!doctype html>')) {
      throw new Error(`API Error (${res.status}): Server mengembalikan halaman error HTML. Pastikan backend server terkonfigurasi dengan benar.`);
    }
    
    // Coba parse JSON dari teks jika memungkinkan
    let errorMsg = `API Error (${res.status})`;
    try {
      const data = JSON.parse(text);
      errorMsg = data.error || data.message || errorMsg;
    } catch (e) {
      errorMsg += `: ${text.substring(0, 100)}`;
    }
    throw new Error(errorMsg);
  }
  
  // Jika res.ok, coba parse JSON
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error('Server mengembalikan format tidak valid (bukan JSON). API tidak tersedia.');
  }
  
  return { res, data };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('pos_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [discounts, setDiscounts] = useState<Discount[]>(INITIAL_DISCOUNTS);
  const [sales, setSales] = useState<Sale[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [settings, setSettings] = useState<CafeSettings | null>(INITIAL_SETTINGS);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(INITIAL_PAYMENT_METHODS);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [dbWarning, setDbWarning] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);
  const clearDbWarning = () => setDbWarning(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('pos_theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('pos_theme', theme);
  }, [theme]);

  // Sync user to localStorage for session persistence
  useEffect(() => {
    if (user) localStorage.setItem('pos_user', JSON.stringify(user));
    else localStorage.removeItem('pos_user');
  }, [user]);

  // Track Device ID and Session Token (Guarantees Single Browser/Device Limit)
  const [deviceId] = useState<string>(() => {
    let id = localStorage.getItem('pos_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem('pos_device_id', id);
    }
    return id;
  });

  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    return localStorage.getItem('pos_session_token');
  });

  useEffect(() => {
    if (sessionToken) {
      localStorage.setItem('pos_session_token', sessionToken);
    } else {
      localStorage.removeItem('pos_session_token');
    }
  }, [sessionToken]);

  // Periodic active session monitor (Every 10 seconds, checks if another login force logout)
  useEffect(() => {
    if (!user || !sessionToken) return;

    const interval = setInterval(async () => {
      try {
        const { res, data } = await fetchApiJson('/api/auth/session-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            sessionToken,
            deviceId
          })
        });

        if (res.ok) {
          if (data.valid === false) {
            console.warn("Session invalidated globally. Forcing user logout:", data.message);
            // Invalidate session values locally to force a logout screen
            setSessionToken(null);
            setUser(null);
            setCart([]);
            setAuthError(data.message || "Sesi Anda dinonaktifkan karena login terdeteksi dari perangkat lain.");
          }
        }
      } catch (err) {
        console.warn("Session connectivity check failed. Allowing local POS execution offline:", err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [user?.id, sessionToken, deviceId]);

  // Sync state changes to localStorage
  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem('pos_products', JSON.stringify(products));
    }
  }, [products]);

  useEffect(() => {
    if (discounts.length > 0) {
      localStorage.setItem('pos_discounts', JSON.stringify(discounts));
    }
  }, [discounts]);

  useEffect(() => {
    localStorage.setItem('pos_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('pos_inventory_logs', JSON.stringify(inventoryLogs));
  }, [inventoryLogs]);

  useEffect(() => {
    if (settings) {
      localStorage.setItem('pos_settings', JSON.stringify(settings));
    }
  }, [settings]);

  useEffect(() => {
    if (paymentMethods.length > 0) {
      localStorage.setItem('pos_payment_methods', JSON.stringify(paymentMethods));
    }
  }, [paymentMethods]);

  // Initial Supabase Auth check & Session Restoration
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleUser(session.user);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        handleUser(session.user);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleUser = async (authUser: any) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();
        
      if (error) throw error;
      
      // Get the real email confirmed status from Supabase auth
      const { data: { user: authUserReal } } = await supabase.auth.getUser();

      const baseUser: User = {
        id: authUser.id,
        username: profile?.username || authUser.email?.split('@')[0] || 'user',
        email: authUser.email || '',
        name: profile?.name || authUser.user_metadata?.full_name || 'User',
        role: profile?.role || 'admin',
        email_confirmed_at: authUserReal?.email_confirmed_at || null
      };

      setUser(baseUser);
      setIsLoading(false);
    } catch (error) {
      console.warn("Trouble loading database profile, continuing with local session:", error);
      // Fallback to local session details
      const fallbackUser: User = {
        id: authUser.id,
        username: authUser.email?.split('@')[0] || 'guest',
        email: authUser.email || '',
        name: authUser.user_metadata?.full_name || 'User',
        role: 'admin',
        email_confirmed_at: authUser.email_confirmed_at || null
      };

      // Try a last-ditch profile insertion directly in the background just in case database was unreachable but is now active
      try {
        await supabase.from('profiles').insert({
          id: fallbackUser.id,
          username: fallbackUser.username,
          email: fallbackUser.email,
          name: fallbackUser.name,
          role: fallbackUser.role
        });
      } catch (insertErr) {
        // ignore background insert error
      }

      setUser(fallbackUser);
      setIsLoading(false);
    }
  };

  // Supabase Realtime Subscriptions
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Fetch initial data
    const fetchData = async () => {
      try {
        const [pRes, dRes, sRes, lRes, sSetRes, pmRes] = await Promise.all([
          supabase.from('products').select('*').eq('user_id', user.id),
          supabase.from('discounts').select('*').eq('user_id', user.id),
          supabase.from('sales').select('*, sale_items(*)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
          supabase.from('inventory_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
          supabase.from('cafe_settings').select('*').eq('user_id', user.id).single(),
          supabase.from('payment_methods').select('*').eq('user_id', user.id)
        ]);
        
        if (pRes.data && pRes.data.length > 0) {
          const mappedProducts = pRes.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            price: Number(p.price || 0),
            isReady: p.isReady !== undefined ? p.isReady : (p.is_ready !== undefined ? p.is_ready : true),
            imageUrl: p.imageUrl !== undefined ? p.imageUrl : p.image_url
          }));
          setProducts(mappedProducts);
          localStorage.setItem('pos_products', JSON.stringify(mappedProducts));
        }

        if (dRes.data && dRes.data.length > 0) {
          const mappedDiscounts = dRes.data.map((d: any) => ({
            id: d.id,
            name: d.name,
            value: Number(d.value || 0),
            type: d.type,
            startDate: d.startDate !== undefined ? d.startDate : d.start_date,
            endDate: d.endDate !== undefined ? d.endDate : d.end_date,
            minPurchase: d.minPurchase !== undefined ? Number(d.minPurchase) : Number(d.min_purchase || 0)
          }));
          setDiscounts(mappedDiscounts);
          localStorage.setItem('pos_discounts', JSON.stringify(mappedDiscounts));
        }

        if (sRes.data && sRes.data.length > 0) {
          const mappedSales = sRes.data.map((s: any) => {
            const rawItems = s.sale_items || [];
            const mappedItems = rawItems.map((item: any) => ({
              productId: item.product_id,
              name: item.product_name,
              price: Number(item.price || 0),
              quantity: Number(item.quantity || 0),
              note: item.note,
              total: Number(item.total || 0)
            }));

            return {
              id: s.id,
              timestamp: s.created_at || s.timestamp,
              items: mappedItems,
              subtotal: Number(s.subtotal || 0),
              discountAmount: s.discount_amount !== undefined ? Number(s.discount_amount) : Number(s.discountAmount || 0),
              discountName: s.discount_name !== undefined ? s.discount_name : s.discountName,
              tax: Number(s.tax || 0),
              total: Number(s.total || 0),
              paymentMethod: s.payment_method_id,
              userId: s.user_id || s.userId,
              userName: s.cashier_name || s.userName || 'Kasir',
              customerName: s.customer_name || s.customerName || 'Pelanggan Umum'
            };
          });
          setSales(mappedSales);
          localStorage.setItem('pos_sales', JSON.stringify(mappedSales));
        }

        if (lRes.data && lRes.data.length > 0) {
          const mappedLogs = lRes.data.map((l: any) => ({
            id: l.id,
            productId: l.product_id || l.productId,
            productName: l.product_name || l.productName,
            change: l.change_amount !== undefined ? Number(l.change_amount) : Number(l.change || 0),
            reason: l.reason,
            timestamp: l.created_at || l.timestamp
          }));
          setInventoryLogs(mappedLogs);
          localStorage.setItem('pos_inventory_logs', JSON.stringify(mappedLogs));
        }

        if (sSetRes.data) {
          const s = sSetRes.data;
          const mappedSettings: CafeSettings = {
            id: 'current',
            name: s.name,
            logoUrl: s.logoUrl !== undefined ? s.logoUrl : s.logo_url,
            primaryColor: s.primaryColor !== undefined ? s.primaryColor : s.primary_color,
            secondaryColor: s.secondaryColor !== undefined ? s.secondaryColor : s.secondary_color,
            address: s.address,
            phone: s.phone,
            currency: s.currency,
            taxRate: s.taxRate !== undefined ? Number(s.taxRate) : Number(s.tax_rate || 10),
            qrisData: s.qrisData !== undefined ? s.qrisData : s.qris_data,
            qrisImageUrl: s.qrisImageUrl !== undefined ? s.qrisImageUrl : s.qris_image_url,
            receiptFooterMessage: s.receipt_footer_message !== undefined ? s.receipt_footer_message : (s.receiptFooterMessage !== undefined ? s.receiptFooterMessage : 'Terima kasih telah berkunjung!'),
            receiptWifiName: s.receipt_wifi_name !== undefined ? s.receipt_wifi_name : (s.receiptWifiName !== undefined ? s.receiptWifiName : 'rahasiakami'),
            receiptNote: s.receipt_note !== undefined ? s.receipt_note : (s.receiptNote !== undefined ? s.receiptNote : 'Nikmati ketenangan di setiap tegukan.'),
            receiptShowLogo: s.receipt_show_logo !== undefined ? s.receipt_show_logo : (s.receiptShowLogo !== undefined ? s.receiptShowLogo : true)
          };
          setSettings(mappedSettings);
          localStorage.setItem('pos_settings', JSON.stringify(mappedSettings));
        }

        if (pmRes.data && pmRes.data.length > 0) {
          const mappedPm = pmRes.data.map((pm: any) => ({
            id: pm.id,
            name: pm.name,
            type: pm.type,
            isActive: pm.isActive !== undefined ? pm.isActive : pm.is_active
          }));
          setPaymentMethods(mappedPm);
          localStorage.setItem('pos_payment_methods', JSON.stringify(mappedPm));
        }
      } catch (err) {
        console.warn("Could not fetch cloud data, utilizing local storage cache instead:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Set up Realtime subscriptions
    let channels: any[] = [];
    try {
      channels = [
        supabase.channel('products').on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `user_id=eq.${user.id}` }, (payload) => fetchData()).subscribe(),
        supabase.channel('discounts').on('postgres_changes', { event: '*', schema: 'public', table: 'discounts', filter: `user_id=eq.${user.id}` }, (payload) => fetchData()).subscribe(),
        supabase.channel('sales').on('postgres_changes', { event: '*', schema: 'public', table: 'sales', filter: `user_id=eq.${user.id}` }, (payload) => fetchData()).subscribe(),
        supabase.channel('inventory_logs').on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_logs', filter: `user_id=eq.${user.id}` }, (payload) => fetchData()).subscribe(),
        supabase.channel('payment_methods').on('postgres_changes', { event: '*', schema: 'public', table: 'payment_methods', filter: `user_id=eq.${user.id}` }, (payload) => fetchData()).subscribe(),
      ];
    } catch (realtimeErr) {
      console.warn("Realtime subscription failed, default to polling/local states:", realtimeErr);
    }

    return () => {
      try {
        channels.forEach(ch => supabase.removeChannel(ch));
      } catch (err) {
        console.error(err);
      }
    };
  }, [user?.id, fetchTrigger]);

  const seedUserData = async (userId: string) => {
    try {
      // 1. Settings - Always start with default branding
      const { error: settingsError } = await supabase.from('cafe_settings').upsert({
        user_id: userId,
        name: INITIAL_SETTINGS.name,
        logo_url: INITIAL_SETTINGS.logoUrl,
        primary_color: INITIAL_SETTINGS.primaryColor,
        secondary_color: INITIAL_SETTINGS.secondaryColor,
        address: INITIAL_SETTINGS.address,
        phone: INITIAL_SETTINGS.phone,
        currency: INITIAL_SETTINGS.currency,
        tax_rate: INITIAL_SETTINGS.taxRate
      });
      if (settingsError) {
        console.warn("Settings seeding warning (continuing locally):", settingsError);
      }

      // 2. Payment Methods - Standard defaults
      const pmData = INITIAL_PAYMENT_METHODS.map(pm => {
        return {
          user_id: userId,
          name: pm.name,
          type: pm.type,
          is_active: pm.isActive
        };
      });
      const { error: pmError } = await supabase.from('payment_methods').upsert(pmData);
      if (pmError) {
        console.warn("Payment methods seeding warning (continuing locally):", pmError);
      }
    } catch (error) {
      console.warn("Seeding warning (continuing locally):", error);
    }
  };

  const healUserProfile = async () => {
    if (!user) return;
    console.log("Attempting to heal missing database profile for user:", user.id);
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      username: user.username,
      email: user.email || `${user.username}@temp.app`,
      name: user.name,
      role: user.role || 'admin'
    });
    
    if (profileError) {
      console.error("Database profile healing failed:", profileError);
      throw formatSupabaseError(profileError, 'profiles');
    }
    
    console.log("Successfully healed database profile!");
    await seedUserData(user.id);
  };

  const register = async (username: string, password?: string, email?: string) => {
    setAuthError(null);
    setIsLoading(true);
    
    if (!username || !email || !password) {
      setAuthError("Username, email, dan password wajib diisi");
      setIsLoading(false);
      return false;
    }

    try {
      const emailValue = email.toLowerCase().trim();
      
      // 1. Cek apakah email sudah terdaftar DAN sudah terverifikasi
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id, email_confirmed_at")
        .eq("email", emailValue)
        .single();
      
      if (existingUser?.email_confirmed_at) {
        setAuthError("Email ini sudah terdaftar. Silakan login.");
        setIsLoading(false);
        return false;
      }
      
      // 2. signUp menggunakan email dan password
      const { data, error } = await supabase.auth.signUp({
        email: emailValue,
        password: password,
      });

      if (error) {
        if (error.message.includes("rate limit") || error.message.includes("Too many") || error.message.includes("security purposes")) {
          throw new Error("Terlalu banyak percobaan. Silakan tunggu beberapa menit.");
        }
        throw error;
      }
      
      // 3. Pastikan profil terbuat di tabel 'profiles'
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          username: username,
          email: emailValue,
          name: username,
          role: 'admin'
        });
        if (profileError) {
          console.error("Gagal membuat profil user:", profileError);
          // Kita tetap lanjut karena auth berhasil, user bisa mencoba login nanti dan sistem akan mem-heal profilnya
        }
      }
      
      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error("Registration initiation error:", error);
      setAuthError(error.message || "Gagal mendaftar.");
      setIsLoading(false);
      return false;
    }
  };

  const login = async (username: string, email: string, password?: string) => {
    setAuthError(null);
    setIsLoading(true);

    try {
      const emailClean = email.toLowerCase().trim();
      const usernameClean = username.toLowerCase().trim();
      
      if (!password) {
        setAuthError("Password wajib diisi.");
        setIsLoading(false);
        return false;
      }

      // 1. Cek apakah user ada (cari by username atau email)
      const { data: userByUsernameOrEmail, error: findError } = await supabase
        .from("profiles")
        .select("id, email, username")
        .or(`username.eq.${usernameClean},email.eq.${emailClean}`)
        .maybeSingle();
      
      if (findError) {
        setAuthError("Gagal memeriksa data user.");
        setIsLoading(false);
        return false;
      }

      if (!userByUsernameOrEmail) {
        setAuthError("Username atau Email tidak terdaftar.");
        setIsLoading(false);
        return false;
      }

      // Gunakan email dari database untuk memastikan konsistensi
      const userEmail = userByUsernameOrEmail.email;

      // 2. Validasi password menggunakan Supabase Auth
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password,
      });

      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          setAuthError("Password salah.");
        } else {
          setAuthError("Gagal login: " + signInError.message);
        }
        setIsLoading(false);
        return false;
      }

      // Password BENAR, sign out segera untuk OTP
      await supabase.auth.signOut();

      // 3. Generate & Kirim OTP manual via backend
      const { res, data: resData } = await fetchApiJson('/api/auth/login-initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userByUsernameOrEmail.username, email: userEmail, password })
      });
      
      if (!res.ok) {
        setAuthError(resData.error || "Gagal mengirimkan OTP.");
        setIsLoading(false);
        return false;
      }

      setIsLoading(false);
      return true; // Perlu verifikasi OTP
    } catch (error: any) {
      console.error("Login initiation error:", error);
      setAuthError(error.message || "Gagal memproses login.");
      setIsLoading(false);
      return false;
    }
  };

  const loginVerifyOtp = async (username: string, email: string, otp: string, password?: string) => {
    setAuthError(null);
    setIsLoading(true);

    try {
      const eStr = email.toLowerCase().trim();
      const deviceId = localStorage.getItem("device_id") || "web-" + Date.now();
      
      // 1. Verifikasi OTP menggunakan backend
      const { res, data: resData } = await fetchApiJson('/api/auth/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email: eStr, otp, password, deviceId })
      });

      if (!res.ok) {
        setAuthError(resData.error || "Kode OTP salah.");
        setIsLoading(false);
        return false;
      }

      // Backend returns the real Supabase session, so we set it
      if (resData.session) {
        await supabase.auth.setSession(resData.session);
        setUser(resData.session.user);
      } else {
        // Fallback: If backend doesn't return session, we use signInWithPassword
        const { data, error } = await supabase.auth.signInWithPassword({
          email: eStr,
          password: password || 'default123'
        });
        if (error) throw error;
        setUser(data.user as any);
      }
      
      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error("Login verification failed:", error);
      setAuthError(error.message || "Verifikasi OTP Gagal.");
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
    // Deep clear session details locally
    setSessionToken(null);
    setUser(null);
    setProducts(INITIAL_PRODUCTS);
    setDiscounts(INITIAL_DISCOUNTS);
    setSales([]);
    setInventoryLogs([]);
    setSettings(INITIAL_SETTINGS);
    setPaymentMethods(INITIAL_PAYMENT_METHODS);

    // Clear local storage
    const keysToClear = [
      'pos_user', 'pos_session_token', 'pos_products', 'pos_discounts', 
      'pos_sales', 'pos_inventory_logs', 'pos_settings', 'pos_payment_methods', 'pos_theme'
    ];
    keysToClear.forEach(key => localStorage.removeItem(key));
  };

  const clearAuthError = () => setAuthError(null);

  const sendOtp = async (username: string, email: string) => {
    setAuthError(null);
    setIsLoading(true);

    try {
      const uStr = username.toLowerCase().trim();
      const eStr = email.toLowerCase().trim();

      const { res, data } = await fetchApiJson('/api/auth/login-initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: uStr, email: eStr, password: 'default123' }) // Sending dummy password for login OTP
      });

      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirimkan OTP.");
      }

      setIsLoading(false);
    } catch (error: any) {
      console.error("sendOtp error:", error);
      setAuthError(error.message || "Gagal mengirimkan OTP.");
      setIsLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    if (!product.isReady) return;
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        );
      }
      return [...prev, { 
        productId: product.id, 
        name: product.name, 
        price: product.price, 
        quantity: 1, 
        total: product.price 
      }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product || quantity <= 0) return;
    setCart(prev => prev.map(item => 
      item.productId === productId 
        ? { ...item, quantity, total: quantity * item.price }
        : item
    ));
  };

  const updateCartNote = (productId: string, note: string) => {
    setCart(prev => prev.map(item => 
      item.productId === productId ? { ...item, note } : item
    ));
  };

  const clearCart = () => setCart([]);

  const getBestDiscount = (total: number) => {
    const now = new Date();
    const activeDiscounts = discounts.filter(d => {
      const start = parseISO(d.startDate);
      const end = parseISO(d.endDate);
      const isDateValid = isWithinInterval(now, { start, end });
      const isMinPurchaseMet = !d.minPurchase || total >= d.minPurchase;
      return isDateValid && isMinPurchaseMet;
    });

    if (activeDiscounts.length === 0) return null;

    return activeDiscounts.reduce((best, current) => {
      const currentVal = current.type === 'percentage' ? (total * current.value) / 100 : current.value;
      const bestVal = best.type === 'percentage' ? (total * best.value) / 100 : best.value;
      return currentVal > bestVal ? current : best;
    });
  };

  const processTransaction = async (paymentMethodId: string, customerName: string) => {
    if (cart.length === 0 || !user) return null;
    
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const bestDiscount = getBestDiscount(subtotal);
    const discountAmount = bestDiscount 
      ? (bestDiscount.type === 'percentage' ? (subtotal * bestDiscount.value) / 100 : bestDiscount.value)
      : 0;
    
    const taxRate = settings?.taxRate || 10;
    const tax = (subtotal - discountAmount) * (taxRate / 100); 
    const total = subtotal - discountAmount + tax;
    
    const saleId = generateUUIDv4();
    const mappedItems: SaleItem[] = cart.map(item => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      note: item.note,
      total: item.total
    }));
    
    const newSale: Sale = {
      id: saleId,
      timestamp: new Date().toISOString(),
      items: mappedItems,
      subtotal,
      discountAmount,
      discountName: bestDiscount?.name || 'No Discount',
      tax,
      total,
      paymentMethod: paymentMethodId,
      userId: user.id,
      userName: user.name,
      customerName: customerName || 'Pelanggan Umum'
    };

    // Update local states directly for instant speed
    setSales(prev => [newSale, ...prev]);
    
    const newLogs: InventoryLog[] = cart.map(item => ({
      id: generateUUIDv4(),
      productId: item.productId,
      productName: item.name,
      change: -item.quantity,
      reason: `Sale ${saleId}`,
      timestamp: new Date().toISOString()
    }));
    setInventoryLogs(prev => [...newLogs, ...prev]);

    // Apply inventory change in local products array of products is managed locally
    setProducts(prev => prev.map(p => {
      const cartItem = cart.find(c => c.productId === p.id);
      return p; // In our POS, products are just listed, inventory tracking isn't hard-blocking stock limits, but log is saved.
    }));

    setCart([]);

    // Attempt DB sync in the background
    try {
      const { error: saleError } = await supabase
        .from('sales')
        .insert({
          id: saleId,
          user_id: user.id,
          customer_name: customerName || 'Pelanggan Umum',
          subtotal,
          discount_amount: discountAmount,
          discount_name: bestDiscount?.name || 'No Discount',
          tax,
          total,
          payment_method_id: paymentMethodId,
          cashier_name: user.name
        });

      if (!saleError) {
        const dbSaleItems = cart.map(item => ({
          sale_id: saleId,
          product_id: item.productId,
          product_name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.total
        }));
        await supabase.from('sale_items').insert(dbSaleItems);

        const dbInventoryLogs = cart.map(item => ({
          user_id: user.id,
          product_id: item.productId,
          product_name: item.name,
          change_amount: -item.quantity,
          reason: `Sale ${saleId}`
        }));
        await supabase.from('inventory_logs').insert(dbInventoryLogs);
      } else {
        const msg = (saleError.message || '').toLowerCase();
        if (saleError.code === '23503' || msg.includes('foreign key') || msg.includes('violates foreign key constraint') || msg.includes('sales_user_id_fkey')) {
          console.warn("Foreign Key error in processTransaction sales insert. Healing profile and retrying...");
          await healUserProfile();
          // Retry inserting sale
          const { error: retryError } = await supabase
            .from('sales')
            .insert({
              id: saleId,
              user_id: user.id,
              customer_name: customerName || 'Pelanggan Umum',
              subtotal,
              discount_amount: discountAmount,
              discount_name: bestDiscount?.name || 'No Discount',
              tax,
              total,
              payment_method_id: paymentMethodId,
              cashier_name: user.name
            });
          if (!retryError) {
            const dbSaleItems = cart.map(item => ({
              sale_id: saleId,
              product_id: item.productId,
              product_name: item.name,
              price: item.price,
              quantity: item.quantity,
              total: item.total
            }));
            await supabase.from('sale_items').insert(dbSaleItems);

            const dbInventoryLogs = cart.map(item => ({
              user_id: user.id,
              product_id: item.productId,
              product_name: item.name,
              change_amount: -item.quantity,
              reason: `Sale ${saleId}`
            }));
            await supabase.from('inventory_logs').insert(dbInventoryLogs);
          } else {
            console.warn("Retry sales insert failed:", retryError);
          }
        } else {
          console.warn("DB Sale insertion failed, transaction preserved locally:", saleError);
        }
      }
    } catch (error: any) {
      console.warn("Supabase Transaction Sync Error, transaction preserved locally:", error);
    }

    return newSale;
  };

  const addProduct = async (p: Omit<Product, 'id'>) => {
    if (!user) return;
    const newId = generateUUIDv4();
    const newProduct: Product = { ...p, id: newId };
    
    try {
      const { error } = await supabase.from('products').insert({
        id: newId,
        user_id: user.id,
        name: p.name,
        category: p.category,
        price: p.price,
        is_ready: p.isReady,
        image_url: p.imageUrl
      });
      if (error) {
        if (error.message && (error.message.includes("column") || error.message.includes("does not exist") || error.code === '42703')) {
          console.warn("Snake_case product insert failed. Retrying with camelCase columns...");
          const { error: camelError } = await supabase.from('products').insert({
            id: newId,
            user_id: user.id,
            name: p.name,
            category: p.category,
            price: p.price,
            isReady: p.isReady,
            imageUrl: p.imageUrl
          });
          if (camelError) {
            throw formatSupabaseError(camelError, 'products');
          }
        } else {
          throw formatSupabaseError(error, 'products');
        }
      }
      setProducts(prev => [...prev, newProduct]);
    } catch (error: any) {
      const msg = (error.message || '').toLowerCase();
      if (error.code === '23503' || msg.includes('foreign key') || msg.includes('violates foreign key constraint') || msg.includes('profiles-user_id-fkey') || msg.includes('products_user_id_fkey') || msg.includes('violates foreign key constraint "products_user_id_fkey"')) {
        console.warn("Foreign Key error detected during addProduct. Healing profile and retrying...");
        try {
          await healUserProfile();
          const { error: retryError } = await supabase.from('products').insert({
            id: newId,
            user_id: user.id,
            name: p.name,
            category: p.category,
            price: p.price,
            is_ready: p.isReady,
            image_url: p.imageUrl
          });
          if (retryError) {
            if (retryError.message && (retryError.message.includes("column") || retryError.message.includes("does not exist") || retryError.code === '42703')) {
              console.warn("Snake_case product retry insert failed. Retrying with camelCase columns...");
              const { error: camelRetryError } = await supabase.from('products').insert({
                id: newId,
                user_id: user.id,
                name: p.name,
                category: p.category,
                price: p.price,
                isReady: p.isReady,
                imageUrl: p.imageUrl
              });
              if (camelRetryError) {
                throw formatSupabaseError(camelRetryError, 'products');
              }
            } else {
              throw formatSupabaseError(retryError, 'products');
            }
          }
          setProducts(prev => [...prev, newProduct]);
          return;
        } catch (retryEx: any) {
          console.error("Retry after profile healing failed:", retryEx);
          setProducts(prev => [...prev, newProduct]);
          setDbWarning(retryEx.message || "Gagal melakukan sinkronisasi profil ke database Supabase Anda.");
          return;
        }
      }
      console.error("Supabase Add Product Error:", error);
      setProducts(prev => [...prev, newProduct]);
      const formatted = error instanceof Error ? error : formatSupabaseError(error, 'products');
      setDbWarning(formatted.message);
    }
  };

  const updateProduct = async (p: Product) => {
    if (!user) return;

    try {
      const { id, ...data } = p;
      const { error } = await supabase.from('products').update({
        name: data.name,
        category: data.category,
        price: data.price,
        is_ready: data.isReady,
        image_url: data.imageUrl
      }).eq('id', id);
      
      if (error) {
        if (error.message && (error.message.includes("column") || error.message.includes("does not exist") || error.code === '42703')) {
          console.warn("Snake_case product update failed. Retrying with camelCase columns...");
          const { error: camelError } = await supabase.from('products').update({
            name: data.name,
            category: data.category,
            price: data.price,
            isReady: data.isReady,
            imageUrl: data.imageUrl
          }).eq('id', id);
          if (camelError) {
            throw formatSupabaseError(camelError, 'products');
          }
        } else {
          throw formatSupabaseError(error, 'products');
        }
      }
      setProducts(prev => prev.map(item => item.id === p.id ? p : item));
    } catch (error: any) {
      console.error("Supabase Update Product Error:", error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        throw formatSupabaseError(error, 'products');
      }
      setProducts(prev => prev.filter(item => item.id !== id));
    } catch (error: any) {
      console.error("Supabase Delete Product Error:", error);
      throw error;
    }
  };

  const addDiscount = async (d: Omit<Discount, 'id'>) => {
    if (!user) return;
    const newId = generateUUIDv4();
    const newDiscount: Discount = { ...d, id: newId };
    // Update locally first
    setDiscounts(prev => [...prev, newDiscount]);

    try {
      const { error } = await supabase.from('discounts').insert({
        id: newId,
        user_id: user.id,
        name: d.name,
        value: d.value,
        type: d.type,
        start_date: d.startDate,
        end_date: d.endDate,
        min_purchase: d.minPurchase
      });
      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (error.code === '23503' || msg.includes('foreign key') || msg.includes('violates foreign key constraint')) {
          console.warn("Foreign key constraint failed in addDiscount. Healing profile and retrying...");
          await healUserProfile();
          const { error: retryError } = await supabase.from('discounts').insert({
            id: newId,
            user_id: user.id,
            name: d.name,
            value: d.value,
            type: d.type,
            start_date: d.startDate,
            end_date: d.endDate,
            min_purchase: d.minPurchase
          });
          if (retryError) console.warn("Retry inserting discount failed:", retryError);
        } else {
          console.warn("Supabase DB discount insertion failed:", error);
        }
      }
    } catch (error: any) {
      const msg = (error.message || '').toLowerCase();
      if (error.code === '23503' || msg.includes('foreign key') || msg.includes('violates foreign key constraint')) {
        console.warn("Exception with foreign key in addDiscount. Healing profile and retrying...");
        await healUserProfile();
        try {
          await supabase.from('discounts').insert({
            id: newId,
            user_id: user.id,
            name: d.name,
            value: d.value,
            type: d.type,
            start_date: d.startDate,
            end_date: d.endDate,
            min_purchase: d.minPurchase
          });
        } catch (retryEx) {
          console.error("Retry discount save exception:", retryEx);
        }
      } else {
        console.error("Supabase Add Discount Error:", error);
      }
    }
  };

  const updateDiscount = async (d: Discount) => {
    if (!user) return;
    // Update locally first
    setDiscounts(prev => prev.map(item => item.id === d.id ? d : item));

    try {
      const { id, ...data } = d;
      const { error } = await supabase.from('discounts').update({
        name: data.name,
        value: data.value,
        type: data.type,
        start_date: data.startDate,
        end_date: data.endDate,
        min_purchase: data.minPurchase
      }).eq('id', id);
      if (error) console.warn("Supabase DB discount update failed:", error);
    } catch (error) {
      console.error("Supabase Update Discount Error:", error);
    }
  };

  const deleteDiscount = async (id: string) => {
    if (!user) return;
    // Update locally first
    setDiscounts(prev => prev.filter(item => item.id !== id));

    try {
      const { error } = await supabase.from('discounts').delete().eq('id', id);
      if (error) console.warn("Supabase DB discount deletion failed:", error);
    } catch (error) {
      console.error("Supabase Delete Discount Error:", error);
    }
  };

  const updateSettings = async (s: CafeSettings) => {
    if (!user) return;
    // Update locally first
    setSettings(s);

    try {
      const { id, ...data } = s;
      const { error } = await supabase.from('cafe_settings').update({
        name: data.name,
        logo_url: data.logoUrl,
        primary_color: data.primaryColor,
        secondary_color: data.secondaryColor,
        address: data.address,
        phone: data.phone,
        currency: data.currency,
        tax_rate: data.taxRate,
        qris_data: data.qrisData,
        qris_image_url: data.qrisImageUrl,
        receipt_footer_message: data.receiptFooterMessage,
        receipt_wifi_name: data.receiptWifiName,
        receipt_note: data.receiptNote,
        receipt_show_logo: data.receiptShowLogo
      }).eq('user_id', user.id);
      if (error) console.warn("Supabase DB settings update failed, preserved locally:", error);
    } catch (error) {
      console.error("Supabase Update Settings Error:", error);
    }
  };

  const addPaymentMethod = async (pm: Omit<PaymentMethod, 'id'>) => {
    if (!user) return;
    const newId = generateUUIDv4();
    const newMethod: PaymentMethod = { ...pm, id: newId };
    // Update locally first
    setPaymentMethods(prev => [...prev, newMethod]);

    try {
      const { error } = await supabase.from('payment_methods').insert({
        id: newId,
        user_id: user.id,
        name: pm.name,
        type: pm.type,
        is_active: pm.isActive
      });
      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (error.code === '23503' || msg.includes('foreign key') || msg.includes('violates foreign key constraint') || msg.includes('payment_methods_user_id_fkey')) {
          console.warn("Foreign key constraint failed in addPaymentMethod. Healing profile and retrying...");
          await healUserProfile();
          const { error: retryError } = await supabase.from('payment_methods').insert({
            id: newId,
            user_id: user.id,
            name: pm.name,
            type: pm.type,
            is_active: pm.isActive
          });
          if (retryError) console.warn("Retry inserting payment method failed:", retryError);
        } else {
          console.warn("Supabase DB payment methods insertion failed:", error);
        }
      }
    } catch (error: any) {
      const msg = (error.message || '').toLowerCase();
      if (error.code === '23503' || msg.includes('foreign key') || msg.includes('violates foreign key constraint')) {
        console.warn("Exception with foreign key in addPaymentMethod. Healing profile and retrying...");
        await healUserProfile();
        try {
          await supabase.from('payment_methods').insert({
            id: newId,
            user_id: user.id,
            name: pm.name,
            type: pm.type,
            is_active: pm.isActive
          });
        } catch (retryEx) {
          console.error("Retry payment method save exception:", retryEx);
        }
      } else {
        console.error("Supabase Add Payment Method Error:", error);
      }
    }
  };

  const updatePaymentMethod = async (pm: PaymentMethod) => {
    if (!user) return;
    // Update locally first
    setPaymentMethods(prev => prev.map(item => item.id === pm.id ? pm : item));

    try {
      const { id, ...data } = pm;
      const { error } = await supabase.from('payment_methods').update({
        name: data.name,
        type: data.type,
        is_active: data.isActive
      }).eq('id', id);
      if (error) console.warn("Supabase DB payment method update failed:", error);
    } catch (error) {
      console.error("Supabase Update Payment Method Error:", error);
    }
  };

  const deletePaymentMethod = async (id: string) => {
    if (!user) return;
    // Update locally first
    setPaymentMethods(prev => prev.filter(item => item.id !== id));

    try {
      const { error } = await supabase.from('payment_methods').delete().eq('id', id);
      if (error) console.warn("Supabase DB payment method deletion failed:", error);
    } catch (error) {
      console.error("Supabase Delete Payment Method Error:", error);
    }
  };

  const toggleReady = async (productId: string) => {
    if (!user) return;
    // Update locally first
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, isReady: !p.isReady } : p));

    const product = products.find(p => p.id === productId);
    if (!product) return;
    try {
      const { error } = await supabase.from('products').update({ is_ready: !product.isReady }).eq('id', productId);
      if (error) console.warn("Supabase DB toggle ready failed:", error);
    } catch (error) {
      console.error("Supabase Toggle Ready Error:", error);
    }
  };

  const syncLocalToCloud = async () => {
    if (!user) {
      throw new Error("Anda harus masuk (login) terlebih dahulu untuk melakukan sinkronisasi.");
    }
    
    setIsLoading(true);
    setDbWarning(null);

    try {
      // 1. Pastikan profil di tabel 'profiles' terdaftar
      await healUserProfile();

      // 2. Sinkronkan Pengaturan Cafe (cafe_settings)
      if (settings) {
        const { error: setErr } = await supabase.from('cafe_settings').upsert({
          user_id: user.id,
          name: settings.name,
          logo_url: settings.logoUrl || '',
          primary_color: settings.primaryColor,
          secondary_color: settings.secondaryColor,
          address: settings.address,
          phone: settings.phone,
          currency: settings.currency,
          tax_rate: settings.taxRate,
          qris_data: settings.qrisData || '',
          qris_image_url: settings.qrisImageUrl || '',
          receipt_footer_message: settings.receiptFooterMessage,
          receipt_wifi_name: settings.receiptWifiName,
          receipt_note: settings.receiptNote,
          receipt_show_logo: settings.receiptShowLogo
        });
        if (setErr) console.warn("Sinkronisasi cafe_settings dibatasi, lanjut...", setErr);
      }

      // 3. Sinkronkan Metode Pembayaran (payment_methods)
      if (paymentMethods && paymentMethods.length > 0) {
        const pmData = paymentMethods.map(pm => ({
          id: pm.id,
          user_id: user.id,
          name: pm.name,
          type: pm.type,
          is_active: pm.isActive
        }));
        const { error: pmErr } = await supabase.from('payment_methods').upsert(pmData);
        if (pmErr) console.warn("Sinkronisasi payment_methods dibatasi, lanjut...", pmErr);
      }

      // 4. Sinkronkan Produk (products)
      if (products && products.length > 0) {
        const prodData = products.map(p => ({
          id: p.id,
          user_id: user.id,
          name: p.name,
          category: p.category,
          price: p.price,
          is_ready: p.isReady,
          image_url: p.imageUrl || ''
        }));
        const { error: prodErr } = await supabase.from('products').upsert(prodData);
        if (prodErr) {
          console.warn("Sinkronisasi products gagal (mungkin kolom camelCase), mencoba fallback...", prodErr);
          await supabase.from('products').upsert(products.map(p => ({
            id: p.id,
            user_id: user.id,
            name: p.name,
            category: p.category,
            price: p.price,
            isReady: p.isReady,
            imageUrl: p.imageUrl || ''
          })));
        }
      }

      // 5. Sinkronkan Diskon (discounts)
      if (discounts && discounts.length > 0) {
        const discData = discounts.map(d => ({
          id: d.id,
          user_id: user.id,
          name: d.name,
          value: d.value,
          type: d.type,
          start_date: d.startDate || '',
          end_date: d.endDate || '',
          min_purchase: d.minPurchase
        }));
        const { error: discErr } = await supabase.from('discounts').upsert(discData);
        if (discErr) {
          console.warn("Sinkronisasi discounts gagal (mungkin kolom camelCase), mencoba fallback...", discErr);
          await supabase.from('discounts').upsert(discounts.map(d => ({
            id: d.id,
            user_id: user.id,
            name: d.name,
            value: d.value,
            type: d.type,
            startDate: d.startDate || '',
            endDate: d.endDate || '',
            minPurchase: d.minPurchase
          })));
        }
      }

      // 6. Sinkronkan Riwayat Penjualan (sales & sale_items)
      if (sales && sales.length > 0) {
        for (const s of sales) {
          // Upsert sale
          const { error: saleErr } = await supabase.from('sales').upsert({
            id: s.id,
            user_id: user.id,
            subtotal: s.subtotal,
            discount_amount: s.discountAmount,
            discount_name: s.discountName || '',
            tax: s.tax,
            total: s.total,
            payment_method_id: s.paymentMethod,
            cashier_name: s.userName,
            customer_name: s.customerName,
            created_at: s.timestamp
          });
          if (saleErr) {
            console.warn("Sinkronisasi riwayat penjualan ditolak/gagal, lanjut...", saleErr);
            continue;
          }

          // Upsert items for this sale
          if (s.items && s.items.length > 0) {
            const itemsData = s.items.map(item => ({
              user_id: user.id,
              sale_id: s.id,
              product_id: item.productId,
              product_name: item.name,
              price: item.price,
              quantity: item.quantity,
              note: item.note || '',
              total: item.total
            }));
            await supabase.from('sale_items').upsert(itemsData);
          }
        }
      }

      // Trigger standard cloud fetch to synchronize React states
      setFetchTrigger(prev => prev + 1);

    } catch (error: any) {
      console.error("Terjadi galat sinkronisasi manual:", error);
      throw formatSupabaseError(error, 'general_sync');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <AppContext.Provider value={{
      user, products, discounts, sales, inventoryLogs, cart, settings, paymentMethods, isLoading, authError, dbWarning, theme,
      login, loginVerifyOtp, register, sendOtp, logout, clearAuthError, clearDbWarning, toggleTheme, addToCart, removeFromCart, updateCartQuantity, updateCartNote, clearCart,
      processTransaction, addProduct, updateProduct, deleteProduct,
      addDiscount, updateDiscount, deleteDiscount,
      updateSettings, addPaymentMethod, updatePaymentMethod, deletePaymentMethod,
      toggleReady, syncLocalToCloud
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
