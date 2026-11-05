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
  amountReceived: number;
}

export interface CheckoutResult {
  orderId: number;
  invoiceNumber: string;
  total: number;
  amountReceived: number;
  change: number;
  createdAt: string;
}