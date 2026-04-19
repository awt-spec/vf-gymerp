
-- Cash register / Arqueos de caja
CREATE TABLE public.cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  register_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_amount numeric NOT NULL DEFAULT 0,
  actual_amount numeric NOT NULL DEFAULT 0,
  difference numeric GENERATED ALWAYS AS (actual_amount - expected_amount) STORED,
  notes text,
  created_by uuid NOT NULL,
  currency text NOT NULL DEFAULT 'CRC',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cash_registers" ON public.cash_registers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Monthly budgets
CREATE TABLE public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL,
  category text NOT NULL,
  budget_type text NOT NULL DEFAULT 'expense' CHECK (budget_type IN ('income', 'expense')),
  budgeted_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CRC',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(month, year, category, budget_type)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage budgets" ON public.budgets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Fixed assets for depreciation
CREATE TABLE public.fixed_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Equipamiento',
  purchase_date date NOT NULL,
  original_cost numeric NOT NULL,
  useful_life_years integer NOT NULL DEFAULT 10,
  salvage_value numeric NOT NULL DEFAULT 0,
  depreciation_method text NOT NULL DEFAULT 'straight_line',
  currency text NOT NULL DEFAULT 'CRC',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fixed_assets" ON public.fixed_assets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add IVA fields to expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS iva_amount numeric DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS subtotal numeric GENERATED ALWAYS AS (amount - COALESCE(iva_amount, 0)) STORED;

-- Add IVA and category fields to payments 
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS iva_amount numeric DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS income_category text DEFAULT 'membership';
