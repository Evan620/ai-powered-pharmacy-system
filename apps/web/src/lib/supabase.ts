import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types (based on blueprint schema)
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          pharmacy_id: string;
          role: 'owner' | 'manager' | 'cashier';
          name: string;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          pharmacy_id: string;
          role: 'owner' | 'manager' | 'cashier';
          name: string;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          pharmacy_id?: string;
          role?: 'owner' | 'manager' | 'cashier';
          name?: string;
          phone?: string | null;
          created_at?: string;
        };
      };
      pharmacies: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          timezone: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          timezone?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          timezone?: string;
          created_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          pharmacy_id: string;
          sku: string;
          generic_name: string;
          brand: string | null;
          form: string;
          unit: string;
          barcode: string | null;
          sell_price: number;
          tax_code: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          pharmacy_id: string;
          sku: string;
          generic_name: string;
          brand?: string | null;
          form: string;
          unit: string;
          barcode?: string | null;
          sell_price: number;
          tax_code?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          pharmacy_id?: string;
          sku?: string;
          generic_name?: string;
          brand?: string | null;
          form?: string;
          unit?: string;
          barcode?: string | null;
          sell_price?: number;
          tax_code?: string | null;
          active?: boolean;
          created_at?: string;
        };
      };
      suppliers: {
        Row: {
          id: string;
          pharmacy_id: string;
          name: string;
          contact: string | null;
          lead_time_days: number;
          min_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          pharmacy_id: string;
          name: string;
          contact?: string | null;
          lead_time_days?: number;
          min_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          pharmacy_id?: string;
          name?: string;
          contact?: string | null;
          lead_time_days?: number;
          min_order?: number;
          created_at?: string;
        };
      };
      batches: {
        Row: {
          id: string;
          product_id: string;
          batch_no: string;
          expiry_date: string;
          qty_received: number;
          qty_available: number;
          supplier_id: string | null;
          cost_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          batch_no: string;
          expiry_date: string;
          qty_received: number;
          qty_available: number;
          supplier_id?: string | null;
          cost_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          batch_no?: string;
          expiry_date?: string;
          qty_received?: number;
          qty_available?: number;
          supplier_id?: string | null;
          cost_price?: number;
          created_at?: string;
        };
      };
      sales: {
        Row: {
          id: string;
          invoice_no: string;
          date: string;
          cashier_id: string;
          payment_type: string;
          total: number;
          pharmacy_id: string;
          status: 'pending' | 'completed' | 'cancelled';
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_no: string;
          date: string;
          cashier_id: string;
          payment_type: string;
          total: number;
          pharmacy_id: string;
          status?: 'pending' | 'completed' | 'cancelled';
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_no?: string;
          date?: string;
          cashier_id?: string;
          payment_type?: string;
          total?: number;
          pharmacy_id?: string;
          status?: 'pending' | 'completed' | 'cancelled';
          created_at?: string;
        };
      };
    };
  };
};
