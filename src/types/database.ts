export type UserRole = "owner" | "resepsionis";
export type PaymentMethod = "qris" | "cash";
export type TransactionType = "income" | "expense";
export type TransactionCategory =
  | "service_income"
  | "commission_payout"
  | "meal_allowance"
  | "operational"
  | "other";

export interface Branch {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  branch_id: string | null;
  created_at: string;
}

export interface Therapist {
  id: string;
  name: string;
  phone: string | null;
  branch_id: string;
  active: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  active: boolean;
  created_at: string;
}

// Harga & fee terapis sebuah layanan di satu cabang.
// Tidak ada baris = layanan tidak tersedia di cabang itu.
export interface ServicePrice {
  service_id: string;
  branch_id: string;
  price: number;
  commission_amount: number;
}

export interface NoPatientDay {
  id: string;
  branch_id: string;
  day: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number | null;
  phone: string | null;
  created_at: string;
}

export interface Visit {
  id: string;
  branch_id: string;
  visit_date: string;
  patient_id: string | null;
  patient_name: string;
  age: number | null;
  complaint: string | null;
  recommendation: string | null;
  therapist_id: string;
  service_id: string;
  note: string | null;
  price: number;
  commission_amount: number;
  payment_method: PaymentMethod;
  is_special: boolean;
  created_by: string | null;
  created_at: string;
}

export interface CashTransaction {
  id: string;
  branch_id: string;
  transaction_date: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  payment_method: PaymentMethod | null;
  description: string | null;
  visit_id: string | null;
  therapist_id: string | null;
  created_by: string | null;
  created_at: string;
}

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "done";

export interface Booking {
  id: string;
  branch_id: string;
  patient_name: string;
  patient_phone: string;
  visit_date: string;
  service_id: string | null;
  note: string | null;
  status: BookingStatus;
  created_at: string;
}

export interface DailySummary {
  transaction_date: string;
  branch_id: string;
  branch_name: string;
  jumlah_pasien: number;
  jumlah_pasien_istimewa: number;
  total_qris: number;
  total_cash_masuk: number;
  total_pengeluaran: number;
  saldo: number;
  tidak_ada_pasien: boolean;
  catatan_tidak_ada_pasien: string | null;
}
