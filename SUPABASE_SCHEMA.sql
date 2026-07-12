-- SUPABASE DATABASE SETUP SCHEMA
-- Copy and paste the queries below into the SQL Editor of your Supabase dashboard.

-- 1. PROFILES Table (Saves cashier and admin profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    name TEXT,
    role TEXT DEFAULT 'cashier' CHECK (role IN ('admin', 'cashier')),
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PRODUCTS Table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT CHECK (category IN ('Coffee', 'Non-Coffee', 'Food', 'Snack', 'Pastry')),
    price NUMERIC NOT NULL DEFAULT 0,
    is_ready BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. DISCOUNTS Table
CREATE TABLE IF NOT EXISTS public.discounts (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    value NUMERIC NOT NULL,
    type TEXT CHECK (type IN ('percentage', 'fixed')),
    start_date TEXT,
    end_date TEXT,
    min_purchase NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. SALES Table
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    discount_name TEXT,
    tax NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    payment_method_id TEXT,
    cashier_name TEXT,
    customer_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. SALE ITEMS Table
CREATE TABLE IF NOT EXISTS public.sale_items (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    sale_id TEXT REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id TEXT,
    product_name TEXT,
    price NUMERIC NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    note TEXT,
    total NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. INVENTORY LOGS Table
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id TEXT,
    product_name TEXT,
    change_amount NUMERIC NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. CAFE SETTINGS Table
CREATE TABLE IF NOT EXISTS public.cafe_settings (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT DEFAULT 'BossKasir',
    logo_url TEXT,
    primary_color TEXT DEFAULT '#3d2b1f',
    secondary_color TEXT DEFAULT '#f7f3f0',
    address TEXT,
    phone TEXT,
    currency TEXT DEFAULT 'Rp',
    tax_rate NUMERIC DEFAULT 10,
    qris_data TEXT,
    qris_image_url TEXT,
    receipt_footer_message TEXT DEFAULT 'Terima kasih telah berkunjung!',
    receipt_wifi_name TEXT DEFAULT 'rahasiakami',
    receipt_note TEXT DEFAULT 'Nikmati ketenangan di setiap tegukan.',
    receipt_show_logo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. PAYMENT METHODS Table
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('cash', 'non-cash')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. OTP CODES Table (Supports Login & Reset Password OTP verify)
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,          -- Hashed OTP code stored for verification
    type TEXT CHECK (type IN ('login', 'forgot_password', 'signup', 'register')),
    expired_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9b. OTPS Table (Standard OTP table for Register/Login security)
CREATE TABLE IF NOT EXISTS public.otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    otp TEXT NOT NULL,                -- Hashed OTP code stored for verification
    type TEXT DEFAULT 'register' CHECK (type IN ('login', 'forgot_password', 'signup', 'register')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. ACTIVE SESSIONS Table (Guarantees Single Active Session per User Account)
CREATE TABLE IF NOT EXISTS public.active_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ENABLE ROW LEVEL SECURITY (RLS) FOR ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- CREATE POLICIES: Users can only access own data
CREATE POLICY "Users can only access own data" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can only access own data" ON public.products FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access own data" ON public.discounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access own data" ON public.sales FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access own data" ON public.sale_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access own data" ON public.inventory_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access own data" ON public.cafe_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access own data" ON public.payment_methods FOR ALL USING (auth.uid() = user_id);

-- 11. USER SESSIONS Table (Vercel Fix)
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    device_id TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
