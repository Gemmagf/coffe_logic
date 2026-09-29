import client, { DEMO } from './client';
import { mockGetCashAnalytics, mockGetOrdersAnalytics, mockGetStaffingAnalytics } from './mock/handlers';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DayAvg { day: number; label: string; avg: number; count: number; }
export interface WeekTrend { week: string; sales: number; expenses: number; net: number; days: number; }
export interface ForecastDay { date: string; label: string; predicted: number; }
export interface CashSummary { totalClosings: number; avgDailySales: number; totalSales: number; totalExpenses: number; bestDay: DayAvg; worstDay: DayAvg; }
export interface CashAnalytics { byDayOfWeek: DayAvg[]; trend: WeekTrend[]; forecast: ForecastDay[]; summary: CashSummary | null; }
export interface TopProduct { name: string; totalQty: number; count: number; lastUnit: string; supplierId: string; supplierName: string; avgQty: number; }
export interface SupplierFrequency { supplierId: string; supplierName: string; totalOrders: number; lastOrderDate: string; daysSinceLast: number; avgIntervalDays: number; overdue: boolean; }
export interface Suggestion { productName: string; suggestedQty: number; unit: string; supplierId: string; supplierName: string; reason: string; }
export interface OrdersAnalytics { topProducts: TopProduct[]; supplierFrequency: SupplierFrequency[]; suggestions: Suggestion[]; }
export interface CoverageDay { date: string; dayLabel: string; shifts: number; employees: string[]; covered: boolean; }
export interface StaffingAnalytics { coverage: CoverageDay[]; totalLocations: number; totalEmployees: number; coveredDays: number; uncoveredDays: number; }

// ─── API calls ────────────────────────────────────────────────────────────────

export const getCashAnalytics = async (locationId?: string): Promise<CashAnalytics> => {
  if (DEMO) return mockGetCashAnalytics(locationId);
  const res = await client.get('/analytics/cash', { params: locationId ? { locationId } : {} });
  return res.data.data;
};

export const getOrdersAnalytics = async (): Promise<OrdersAnalytics> => {
  if (DEMO) return mockGetOrdersAnalytics();
  const res = await client.get('/analytics/orders');
  return res.data.data;
};

export const getStaffingAnalytics = async (): Promise<StaffingAnalytics> => {
  if (DEMO) return mockGetStaffingAnalytics();
  const res = await client.get('/analytics/staffing');
  return res.data.data;
};
