ALTER TABLE public.plans ADD COLUMN currency text NOT NULL DEFAULT 'CRC';
ALTER TABLE public.payments ADD COLUMN currency text NOT NULL DEFAULT 'CRC';
ALTER TABLE public.expenses ADD COLUMN currency text NOT NULL DEFAULT 'CRC';