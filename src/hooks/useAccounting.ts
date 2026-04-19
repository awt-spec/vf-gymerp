import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "@/hooks/useGym";
import { startOfMonth, endOfMonth, format, subMonths, differenceInMonths, addMonths } from "date-fns";

export interface AccountingSummary {
  totalRevenue: number;
  totalExpenses: number;
  balance: number;
  ivaCollected: number;
  ivaPaid: number;
  revenueByCategory: Record<string, number>;
  expensesByCategory: Record<string, number>;
  monthlyRevenue: { month: string; amount: number }[];
  monthlyExpenses: { month: string; amount: number }[];
  pendingPayments: number;
  pendingCount: number;
  memberCount: number;
  arpm: number;
}

export function useAccounting(selectedDate: Date = new Date()) {
  const { gymId } = useGym();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [cashRegisters, setCashRegisters] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [fixedAssets, setFixedAssets] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [summary, setSummary] = useState<AccountingSummary>({
    totalRevenue: 0, totalExpenses: 0, balance: 0,
    ivaCollected: 0, ivaPaid: 0,
    revenueByCategory: {}, expensesByCategory: {},
    monthlyRevenue: [], monthlyExpenses: [],
    pendingPayments: 0, pendingCount: 0, memberCount: 0, arpm: 0,
  });
  const [loading, setLoading] = useState(true);

  const monthStart = format(startOfMonth(selectedDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(selectedDate), "yyyy-MM-dd");

  const fetchData = useCallback(async () => {
    if (!gymId) { setLoading(false); return; }
    setLoading(true);
    const tenant = (q: any) => q.eq("gym_id", gymId);
    const [expRes, payRes, cashRes, budRes, assetRes, memRes, pendRes, shopRes] = await Promise.all([
      tenant(supabase.from("expenses").select("*")).order("expense_date", { ascending: false }),
      tenant(supabase.from("payments").select("*, members(first_name, last_name)")).order("payment_date", { ascending: false }),
      tenant(supabase.from("cash_registers").select("*")).order("register_date", { ascending: false }),
      tenant(supabase.from("budgets").select("*")).order("year", { ascending: false }),
      tenant(supabase.from("fixed_assets").select("*")).order("purchase_date", { ascending: false }),
      tenant(supabase.from("members").select("id, first_name, last_name, status")),
      tenant(supabase.from("payments").select("id, amount").eq("status", "pending")),
      tenant(supabase.from("shop_sales").select("*")).order("sale_date", { ascending: false }),
    ]);

    const allExpenses = expRes.data ?? [];
    const allPayments = payRes.data ?? [];
    const allShopSales = shopRes.data ?? [];
    setExpenses(allExpenses);
    setPayments(allPayments);
    setCashRegisters(cashRes.data ?? []);
    setBudgets(budRes.data ?? []);
    setFixedAssets(assetRes.data ?? []);
    setMembers(memRes.data ?? []);

    // Current month data
    const monthExpenses = allExpenses.filter(e => e.expense_date >= monthStart && e.expense_date <= monthEnd);
    const monthPayments = allPayments.filter(p => p.payment_date >= monthStart && p.payment_date <= monthEnd && p.status === "paid");
    const monthShopSales = allShopSales.filter(s => s.sale_date >= monthStart && s.sale_date <= monthEnd);
    const shopRevenue = monthShopSales.reduce((s, sale) => s + Number(sale.total_amount), 0);
    const totalRevenue = monthPayments.reduce((s, p) => s + Number(p.amount), 0) + shopRevenue;
    const totalExpenses = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const ivaCollected = monthPayments.reduce((s, p) => s + Number(p.iva_amount || 0), 0);
    const ivaPaid = monthExpenses.reduce((s, e) => s + Number(e.iva_amount || 0), 0);

    // Revenue by category
    const revenueByCategory: Record<string, number> = {};
    monthPayments.forEach(p => {
      const cat = p.income_category || "membership";
      revenueByCategory[cat] = (revenueByCategory[cat] || 0) + Number(p.amount);
    });
    if (shopRevenue > 0) {
      revenueByCategory["tienda"] = (revenueByCategory["tienda"] || 0) + shopRevenue;
    }

    // Expenses by category
    const expensesByCategory: Record<string, number> = {};
    monthExpenses.forEach(e => {
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + Number(e.amount);
    });

    // Monthly trends (last 6 months)
    const monthlyRevenue: { month: string; amount: number }[] = [];
    const monthlyExpenses: { month: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(selectedDate, i);
      const ms = format(startOfMonth(m), "yyyy-MM-dd");
      const me = format(endOfMonth(m), "yyyy-MM-dd");
      const mLabel = format(m, "MMM");
      const payRev = allPayments.filter(p => p.payment_date >= ms && p.payment_date <= me && p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
      const shopRev = allShopSales.filter(s => s.sale_date >= ms && s.sale_date <= me).reduce((s, sale) => s + Number(sale.total_amount), 0);
      monthlyRevenue.push({ month: mLabel, amount: payRev + shopRev });
      monthlyExpenses.push({ month: mLabel, amount: allExpenses.filter(e => e.expense_date >= ms && e.expense_date <= me).reduce((s, e) => s + Number(e.amount), 0) });
    }

    const pending = pendRes.data ?? [];
    const activeMembers = (memRes.data ?? []).filter(m => m.status === "active").length;

    setSummary({
      totalRevenue, totalExpenses, balance: totalRevenue - totalExpenses,
      ivaCollected, ivaPaid, revenueByCategory, expensesByCategory,
      monthlyRevenue, monthlyExpenses,
      pendingPayments: pending.reduce((s, p) => s + Number(p.amount), 0),
      pendingCount: pending.length,
      memberCount: activeMembers,
      arpm: activeMembers > 0 ? totalRevenue / activeMembers : 0,
    });
    setLoading(false);
  }, [monthStart, monthEnd, gymId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return {
    expenses, payments, cashRegisters, budgets, fixedAssets, members,
    summary, loading, refetch: fetchData,
    // Filtered for current month
    monthExpenses: expenses.filter(e => e.expense_date >= monthStart && e.expense_date <= monthEnd),
    monthPayments: payments.filter(p => p.payment_date >= monthStart && p.payment_date <= monthEnd),
  };
}
