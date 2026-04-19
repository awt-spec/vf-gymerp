
-- Create member status enum
CREATE TYPE public.member_status AS ENUM ('active', 'inactive', 'suspended');

-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('active', 'expired', 'cancelled');

-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM ('paid', 'pending', 'overdue');

-- Create booking status enum
CREATE TYPE public.booking_status AS ENUM ('booked', 'cancelled', 'attended');

-- Members table
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status member_status NOT NULL DEFAULT 'active',
  photo_url TEXT,
  notes TEXT,
  date_of_birth DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Plans table
CREATE TABLE public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  status payment_status NOT NULL DEFAULT 'pending',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Check-ins table
CREATE TABLE public.check_ins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  check_out_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Classes table
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  instructor TEXT NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 20,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Class schedules table
CREATE TABLE public.class_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Class bookings table
CREATE TABLE public.class_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  class_schedule_id UUID NOT NULL REFERENCES public.class_schedules(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  status booking_status NOT NULL DEFAULT 'booked',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can do everything
CREATE POLICY "Authenticated users can view members" ON public.members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create members" ON public.members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update members" ON public.members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete members" ON public.members FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view plans" ON public.plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create plans" ON public.plans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update plans" ON public.plans FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete plans" ON public.plans FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create subscriptions" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update subscriptions" ON public.subscriptions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete subscriptions" ON public.subscriptions FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view payments" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update payments" ON public.payments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete payments" ON public.payments FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view check_ins" ON public.check_ins FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create check_ins" ON public.check_ins FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update check_ins" ON public.check_ins FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete check_ins" ON public.check_ins FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create classes" ON public.classes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update classes" ON public.classes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete classes" ON public.classes FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view class_schedules" ON public.class_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create class_schedules" ON public.class_schedules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update class_schedules" ON public.class_schedules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete class_schedules" ON public.class_schedules FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view class_bookings" ON public.class_bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create class_bookings" ON public.class_bookings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update class_bookings" ON public.class_bookings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete class_bookings" ON public.class_bookings FOR DELETE TO authenticated USING (true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_class_bookings_updated_at BEFORE UPDATE ON public.class_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
