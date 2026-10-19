import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Category = {
  id: string;
  name: string;
  created_at: string;
};

export type Item = {
  id: string;
  name: string;
  category_id: string | null;
  image: string | null;
  actual_price: number;
  percentage: number;
  quantity: number;
  notes: string | null;
  created_at: string;
};

export type Settings = {
  id: number;
  default_percentage: number;
};

export type Sale = {
  id: string;
  item_id: string | null;
  item_name: string;
  quantity: number;
  sale_price: number;
  profit: number;
  sold_at: string;
};

export type ItemWithCategory = Item & { categories: Category | null };

export function formatPKR(amount: number): string {
  return 'Rs. ' + Math.round(amount).toLocaleString('en-PK');
}

export function sellingPrice(actualPrice: number, percentage: number): number {
  return actualPrice + (actualPrice * percentage) / 100;
}

export function profitAmount(actualPrice: number, percentage: number): number {
  return (actualPrice * percentage) / 100;
}
