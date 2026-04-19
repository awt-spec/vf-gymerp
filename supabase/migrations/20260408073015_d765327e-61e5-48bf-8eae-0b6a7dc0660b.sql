
-- Shop products table (protein bars, drinks, supplements, etc.)
CREATE TABLE public.shop_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'bebidas',
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CRC',
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Shop sales table (who bought what)
CREATE TABLE public.shop_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CRC',
  payment_method TEXT NOT NULL DEFAULT 'cash',
  sold_by UUID NOT NULL,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for shop_products
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view shop_products" ON public.shop_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage shop_products" ON public.shop_products FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS for shop_sales
ALTER TABLE public.shop_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view shop_sales" ON public.shop_sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create shop_sales" ON public.shop_sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage shop_sales" ON public.shop_sales FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
