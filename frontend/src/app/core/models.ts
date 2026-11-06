export interface Category {
  id: number;
  name: string;
  productsCount: number;
}

export interface Product {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  isAvailable: boolean;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PosCategory {
  id: number;
  name: string;
}

export interface PosProduct {
  id: number;
  categoryId: number;
  name: string;
  price: number;
  image: string | null;
}

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
}

export interface CheckoutPayload {
  items: { productId: number; quantity: number }[];
  notes: string;
  paymentMethod: 'CASH' | 'QRIS';
  amountReceived: number | null;
}

export interface CheckoutResult {
  orderId: number;
  invoiceNumber: string;
  total: number;
  paymentMethod: string;
  status: string;
  amountReceived: number | null;
  change: number | null;
  createdAt: string;
}

export interface PaymentInfo {
  orderId: number;
  invoiceNumber: string;
  total: number;
  status: string;
  qrUrl: string | null;
  expiresAt: string | null;
  isSandbox: boolean;
}

export interface OrderListItem {
  id: number;
  invoiceNumber: string;
  createdAt: string;
  cashierName: string;
  paymentMethod: string;
  total: number;
  status: string;
}

export interface OrdersResponse extends Paged<OrderListItem> {
  summary: { count: number; total: number };
}

export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Receipt {
  id: number;
  invoiceNumber: string;
  createdAt: string;
  cashierName: string;
  paymentMethod: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  amountReceived: number | null;
  changeAmount: number | null;
  notes: string | null;
  items: ReceiptItem[];
  store: { name: string; address: string };
}
export interface DashboardData {
  stats: {
    revenue: number;
    revenueChange: number | null;
    orders: number;
    ordersChange: number | null;
    todayRevenue: number;
    todayOrders: number;
    products: number;
  };
  weekly: { date: string; value: number }[];
  topProducts: { name: string; sold: number; revenue: number }[];
  recentOrders: {
    id: number;
    invoice: string;
    cashier: string;
    items: string;
    total: number;
    status: string;
    createdAt: string;
  }[];
}

export interface ReportData {
  from: string;
  to: string;
  summary: { total: number; count: number; average: number };
  byMethod: { method: string; count: number; total: number }[];
  daily: { date: string; count: number; total: number }[];
  topProducts: { name: string; sold: number; revenue: number }[];
}