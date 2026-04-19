
-- Promotions / Ads table
CREATE TABLE public.promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Which members see which promotion
CREATE TABLE public.promotion_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  seen BOOLEAN NOT NULL DEFAULT false,
  seen_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(promotion_id, member_id)
);

-- RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_targets ENABLE ROW LEVEL SECURITY;

-- Admins can manage promotions
CREATE POLICY "Admins can manage promotions" ON public.promotions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Members can view promotions targeted to them
CREATE POLICY "Members can view targeted promotions" ON public.promotions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.promotion_targets pt
    JOIN public.members m ON m.id = pt.member_id
    WHERE pt.promotion_id = promotions.id AND m.auth_user_id = auth.uid()
  ));

-- Admins manage targets
CREATE POLICY "Admins can manage promotion_targets" ON public.promotion_targets FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Members can view and update their own targets
CREATE POLICY "Members can view own targets" ON public.promotion_targets FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE auth_user_id = auth.uid()));

CREATE POLICY "Members can update own targets" ON public.promotion_targets FOR UPDATE TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE auth_user_id = auth.uid()));

-- Storage bucket for promotion images
INSERT INTO storage.buckets (id, name, public) VALUES ('promotion-images', 'promotion-images', true);

-- Storage policies for promotion images
CREATE POLICY "Anyone can view promotion images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'promotion-images');
CREATE POLICY "Authenticated can upload promotion images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'promotion-images');
CREATE POLICY "Authenticated can delete promotion images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'promotion-images');
