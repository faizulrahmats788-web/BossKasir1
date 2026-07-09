export type UserRole = 'admin' | 'cashier';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  email: string;
  password?: string;
  email_confirmed_at?: string | null;
}

export interface Product {
  id: string;
  name: string;
  category: 'Coffee' | 'Non-Coffee' | 'Food' | 'Snack' | 'Pastry';
  price: number;
  isReady: boolean;
  imageUrl?: string;
}

export interface Discount {
  id: string;
  name: string;
  value: number; // percentage or fixed
  type: 'percentage' | 'fixed';
  startDate: string; // ISO string
  endDate: string; // ISO string
  minPurchase?: number;
}

export interface SaleItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
  total: number;
}

export interface Sale {
  id: string;
  timestamp: string;
  items: SaleItem[];
  subtotal: number;
  discountAmount: number;
  discountName?: string;
  tax: number;
  total: number;
  paymentMethod: string;
  userId: string;
  userName: string;
  customerName: string;
}

export interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  change: number; // positive for addition, negative for deduction
  reason: string;
  timestamp: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'cash' | 'non-cash';
  isActive: boolean;
}

export interface CafeSettings {
  id: 'current';
  name: string;
  logoUrl: string;
  primaryColor: string; // hex
  secondaryColor: string; // hex
  address: string;
  phone: string;
  currency: string;
  taxRate: number; // percentage
  qrisData?: string; // URL or text data for QR
  qrisImageUrl?: string; // QRIS image URL/Base64
  receiptFooterMessage?: string;
  receiptWifiName?: string;
  receiptNote?: string;
  receiptShowLogo?: boolean;
}
