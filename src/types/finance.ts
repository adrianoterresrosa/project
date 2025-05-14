import { Database } from './supabase';

export interface Group {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Subgroup {
  id: string;
  user_id: string;
  group_id: string;
  name: string;
  created_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  subgroup_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Entry {
  id: string;
  user_id: string;
  account_id: string;
  date: string;
  amount: number;
  type: 'planned' | 'actual';
  description?: string;
  created_at: string;
  bank_account_id?: string | null;
  accounts_receivable_id?: string | null;
  accounts_payable_id?: string | null;
  customer_name?: string | null;
  supplier_name?: string | null;
}

export interface CostCenter {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface CashFlow {
  id: string;
  user_id: string;
  group_id: string;
  month: string;
  planned_amount: number;
  actual_amount: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: 'income' | 'expense';
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface PaymentAgent {
  id: string;
  user_id: string;
  name: string;
  type: 'payment' | 'receipt' | 'both';
  default_fee: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountsReceivable {
  id: string;
  user_id: string;
  partner_id: string;
  document_type: 'invoice' | 'receipt' | 'other';
  document_number: string;
  issue_date: string;
  description: string;
  total_amount: number;
  installments: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // From view
  partner_name?: string;
  partner_document?: string;
  total_installments?: number;
  paid_installments?: number;
  total_paid_amount?: number;
  remaining_amount?: number;
  next_due_date?: string;
}

export interface AccountsReceivableInstallment {
  id: string;
  accounts_receivable_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  fee_percentage: number;
  fee_amount: number;
  net_amount: number;
  payment_agent_id?: string;
  status: 'open' | 'paid' | 'cancelled' | 'partial';
  paid_amount: number;
  paid_date?: string;
  bank_account_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AccountsPayable {
  id: string;
  user_id: string;
  partner_id: string;
  document_type: 'invoice' | 'receipt' | 'other';
  document_number: string;
  issue_date: string;
  description: string;
  total_amount: number;
  installments: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // From view
  partner_name?: string;
  partner_document?: string;
  total_installments?: number;
  paid_installments?: number;
  total_paid_amount?: number;
  remaining_amount?: number;
  next_due_date?: string;
}

export interface AccountsPayableInstallment {
  id: string;
  accounts_payable_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  fee_percentage: number;
  fee_amount: number;
  net_amount: number;
  payment_agent_id?: string;
  status: 'open' | 'paid' | 'cancelled' | 'partial';
  paid_amount: number;
  paid_date?: string;
  bank_account_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Partner {
  id: string;
  user_id: string;
  person_type: 'individual' | 'company';
  type: 'customer' | 'supplier' | 'both';
  description: string;
  trading_name?: string;
  document: string;
  email: string;
  street?: string;
  street_number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  phone_fixed?: string;
  phone_mobile?: string;
  whatsapp?: string;
  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  bank_account_type?: 'checking' | 'savings';
  bank_account_holder?: string;
  created_at: string;
}