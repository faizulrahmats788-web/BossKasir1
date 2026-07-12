import { Product, User, Discount, CafeSettings, PaymentMethod } from './types';

export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_DISCOUNTS: Discount[] = [];
export const INITIAL_USERS: User[] = [];

export const INITIAL_SETTINGS: Omit<CafeSettings, 'id'> = {
  name: 'BossKasir',
  logoUrl: '/BossKasir.jpeg',
  primaryColor: '#3d2b1f', // Coffee Brown
  secondaryColor: '#f7f3f0', // Cream
  address: 'Jl. Kopi No. 123, Jakarta Selatan',
  phone: '0812-3456-7890',
  currency: 'Rp',
  taxRate: 10,
  receiptFooterMessage: 'Terima kasih telah berkunjung!',
  receiptWifiName: 'rahasiakami',
  receiptNote: 'Nikmati ketenangan di setiap tegukan.',
  receiptShowLogo: true
};

export const INITIAL_PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'cash-id', name: 'Tunai', type: 'cash', isActive: true },
  { id: 'qris-id', name: 'QRIS', type: 'non-cash', isActive: true },
  { id: 'debit-id', name: 'Debit Card', type: 'non-cash', isActive: true },
];

export const APP_LOGO_URL = '/boss_kasir_logo_1783856818255.jpg';
