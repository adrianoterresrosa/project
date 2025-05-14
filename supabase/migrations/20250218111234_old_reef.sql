-- Create enum for payment status
CREATE TYPE payment_status AS ENUM ('open', 'paid', 'cancelled', 'partial');

-- Create enum for document type
CREATE TYPE document_type AS ENUM ('invoice', 'receipt', 'other');

-- Create table for payment/receipt agents (like Stone, Cielo, etc)
CREATE TABLE payment_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('payment', 'receipt', 'both')),
  default_fee decimal(5,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create table for accounts receivable
CREATE TABLE accounts_receivable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  partner_id uuid REFERENCES partners(id) ON DELETE RESTRICT NOT NULL,
  document_type document_type NOT NULL DEFAULT 'invoice',
  document_number text,
  issue_date date NOT NULL,
  description text NOT NULL,
  total_amount decimal(15,2) NOT NULL,
  installments integer NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create table for accounts receivable installments
CREATE TABLE accounts_receivable_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accounts_receivable_id uuid REFERENCES accounts_receivable(id) ON DELETE CASCADE NOT NULL,
  installment_number integer NOT NULL,
  due_date date NOT NULL,
  amount decimal(15,2) NOT NULL,
  fee_percentage decimal(5,2) DEFAULT 0,
  fee_amount decimal(15,2) DEFAULT 0,
  net_amount decimal(15,2) NOT NULL,
  payment_agent_id uuid REFERENCES payment_agents(id) ON DELETE RESTRICT,
  status payment_status DEFAULT 'open',
  paid_amount decimal(15,2) DEFAULT 0,
  paid_date date,
  bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(accounts_receivable_id, installment_number)
);

-- Create table for accounts payable
CREATE TABLE accounts_payable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  partner_id uuid REFERENCES partners(id) ON DELETE RESTRICT NOT NULL,
  document_type document_type NOT NULL DEFAULT 'invoice',
  document_number text,
  issue_date date NOT NULL,
  description text NOT NULL,
  total_amount decimal(15,2) NOT NULL,
  installments integer NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create table for accounts payable installments
CREATE TABLE accounts_payable_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accounts_payable_id uuid REFERENCES accounts_payable(id) ON DELETE CASCADE NOT NULL,
  installment_number integer NOT NULL,
  due_date date NOT NULL,
  amount decimal(15,2) NOT NULL,
  fee_percentage decimal(5,2) DEFAULT 0,
  fee_amount decimal(15,2) DEFAULT 0,
  net_amount decimal(15,2) NOT NULL,
  payment_agent_id uuid REFERENCES payment_agents(id) ON DELETE RESTRICT,
  status payment_status DEFAULT 'open',
  paid_amount decimal(15,2) DEFAULT 0,
  paid_date date,
  bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(accounts_payable_id, installment_number)
);

-- Create indexes
CREATE INDEX idx_accounts_receivable_user_id ON accounts_receivable(user_id);
CREATE INDEX idx_accounts_receivable_partner_id ON accounts_receivable(partner_id);
CREATE INDEX idx_accounts_receivable_issue_date ON accounts_receivable(issue_date);

CREATE INDEX idx_accounts_receivable_installments_receivable_id 
  ON accounts_receivable_installments(accounts_receivable_id);
CREATE INDEX idx_accounts_receivable_installments_due_date 
  ON accounts_receivable_installments(due_date);
CREATE INDEX idx_accounts_receivable_installments_status 
  ON accounts_receivable_installments(status);

CREATE INDEX idx_accounts_payable_user_id ON accounts_payable(user_id);
CREATE INDEX idx_accounts_payable_partner_id ON accounts_payable(partner_id);
CREATE INDEX idx_accounts_payable_issue_date ON accounts_payable(issue_date);

CREATE INDEX idx_accounts_payable_installments_payable_id 
  ON accounts_payable_installments(accounts_payable_id);
CREATE INDEX idx_accounts_payable_installments_due_date 
  ON accounts_payable_installments(due_date);
CREATE INDEX idx_accounts_payable_installments_status 
  ON accounts_payable_installments(status);

CREATE INDEX idx_payment_agents_user_id ON payment_agents(user_id);
CREATE INDEX idx_payment_agents_type ON payment_agents(type);

-- Enable RLS
ALTER TABLE payment_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_receivable_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_payable_installments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own payment agents"
ON payment_agents FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own accounts receivable"
ON accounts_receivable FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own accounts receivable installments"
ON accounts_receivable_installments FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM accounts_receivable ar
  WHERE ar.id = accounts_receivable_id
  AND ar.user_id = auth.uid()
));

CREATE POLICY "Users can manage their own accounts payable"
ON accounts_payable FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own accounts payable installments"
ON accounts_payable_installments FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM accounts_payable ap
  WHERE ap.id = accounts_payable_id
  AND ap.user_id = auth.uid()
));

-- Create views for better querying
CREATE VIEW accounts_receivable_view AS
SELECT 
  ar.*,
  p.description as partner_name,
  p.document as partner_document,
  COUNT(ari.id) as total_installments,
  SUM(CASE WHEN ari.status = 'paid' THEN 1 ELSE 0 END) as paid_installments,
  SUM(ari.paid_amount) as total_paid_amount,
  ar.total_amount - COALESCE(SUM(ari.paid_amount), 0) as remaining_amount,
  MIN(CASE WHEN ari.status != 'paid' THEN ari.due_date END) as next_due_date
FROM accounts_receivable ar
JOIN partners p ON ar.partner_id = p.id
LEFT JOIN accounts_receivable_installments ari ON ar.id = ari.accounts_receivable_id
GROUP BY ar.id, p.description, p.document;

CREATE VIEW accounts_payable_view AS
SELECT 
  ap.*,
  p.description as partner_name,
  p.document as partner_document,
  COUNT(api.id) as total_installments,
  SUM(CASE WHEN api.status = 'paid' THEN 1 ELSE 0 END) as paid_installments,
  SUM(api.paid_amount) as total_paid_amount,
  ap.total_amount - COALESCE(SUM(api.paid_amount), 0) as remaining_amount,
  MIN(CASE WHEN api.status != 'paid' THEN api.due_date END) as next_due_date
FROM accounts_payable ap
JOIN partners p ON ap.partner_id = p.id
LEFT JOIN accounts_payable_installments api ON ap.id = api.accounts_payable_id
GROUP BY ap.id, p.description, p.document;

-- Insert default payment agents
INSERT INTO payment_agents (user_id, name, type, default_fee)
SELECT 
  u.id as user_id,
  pa.name,
  pa.type,
  pa.fee
FROM auth.users u
CROSS JOIN (
  VALUES 
    ('Stone', 'both', 2.50),
    ('Cielo', 'both', 2.50),
    ('Eduz', 'both', 2.50),
    ('PagSeguro', 'both', 2.99),
    ('Mercado Pago', 'both', 3.99),
    ('PIX', 'both', 0),
    ('Boleto', 'both', 2.00),
    ('Transferência', 'both', 0),
    ('Dinheiro', 'both', 0)
) as pa(name, type, fee)
ON CONFLICT (user_id, name) DO NOTHING;