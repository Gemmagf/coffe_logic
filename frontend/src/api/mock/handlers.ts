/**
 * Mock API handlers — return local data, mutations work in-memory for the session.
 */
import type {
  Location, Employee, Schedule, Order, CashClosing,
  VacationRequest, ShiftPreference, User, OrderStatus,
} from '../../types';
import type { ScheduleFilters, SchedulePayload } from '../schedules';
import type { CashClosingPayload } from '../cashClosings';
import type { VacationPayload, PreferencePayload } from '../employees';
import type { CashAnalytics, OrdersAnalytics, StaffingAnalytics } from '../analytics';
import {
  LOCATIONS, EMPLOYEES, PREFERENCES,
  TODAY, addDays, fmt,
  SCHEDULES as _SCHEDULES,
  ORDERS as _ORDERS,
  CASH_CLOSINGS as _CASH_CLOSINGS,
  VACATIONS as _VACATIONS,
} from './data';

// ─── Mutable session state ────────────────────────────────────────────────────

let schedules:    Schedule[]        = [..._SCHEDULES];
let orders:       Order[]           = [..._ORDERS];
let cashClosings: CashClosing[]     = [..._CASH_CLOSINGS];
let vacations:    VacationRequest[] = [..._VACATIONS];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const delay = <T>(v: T): Promise<T> => new Promise(r => setTimeout(() => r(v), 60));

let _id = 1000;
const nextId = (prefix: string) => `${prefix}-${++_id}`;

function between(date: string, from?: string, to?: string) {
  if (from && date < from) return false;
  if (to   && date > to)   return false;
  return true;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const mockLogin = async (_e: string, _p: string) => {
  await delay(null);
  const user: User = { id: 'demo-user-001', email: 'owner@commercial.ch', role: 'OWNER', groupId: 'demo-group-001', createdAt: TODAY };
  return { token: 'demo-token', user };
};

// ─── Locations & Employees ────────────────────────────────────────────────────

export const mockGetLocations = (): Promise<Location[]> => delay([...LOCATIONS]);
export const mockGetEmployees = (): Promise<Employee[]> => delay([...EMPLOYEES]);

// ─── Schedules ────────────────────────────────────────────────────────────────

export const mockGetSchedules = (f: ScheduleFilters = {}): Promise<Schedule[]> =>
  delay(schedules.filter(s =>
    between(s.date, f.from, f.to) &&
    (!f.locationId || s.locationId === f.locationId) &&
    (!f.employeeId || s.employeeId === f.employeeId)
  ));

export const mockCreateSchedule = async (p: SchedulePayload): Promise<Schedule> => {
  const emp = EMPLOYEES.find(e => e.id === p.employeeId)!;
  const loc = LOCATIONS.find(l => l.id === p.locationId)!;
  const s: Schedule = { id: nextId('sch'), ...p, notes: p.notes ?? null, employee: { id: emp.id, name: emp.name }, location: { id: loc.id, name: loc.name }, createdAt: TODAY };
  schedules = [...schedules, s];
  return delay(s);
};

export const mockUpdateSchedule = async (id: string, p: Partial<SchedulePayload>): Promise<Schedule> => {
  schedules = schedules.map(s => s.id === id ? { ...s, ...p } : s);
  return delay(schedules.find(s => s.id === id)!);
};

export const mockDeleteSchedule = async (id: string): Promise<void> => {
  schedules = schedules.filter(s => s.id !== id);
  return delay(undefined);
};

// ─── Orders ───────────────────────────────────────────────────────────────────

export const mockGetOrders = (f: { locationId?: string; supplierId?: string; status?: OrderStatus } = {}): Promise<Order[]> =>
  delay(orders.filter(o =>
    (!f.status     || o.status === f.status) &&
    (!f.locationId || o.locationId === f.locationId) &&
    (!f.supplierId || o.supplierId === f.supplierId)
  ));

export const mockCreateOrder = async (p: { supplierId: string; locationId: string; items: Order['items']; notes?: string | null; deliveryAt?: string | null }): Promise<Order> => {
  const sup = orders.find(o => o.supplierId === p.supplierId)?.supplier ?? { id: p.supplierId, name: 'Proveïdor' };
  const loc = LOCATIONS.find(l => l.id === p.locationId)!;
  const o: Order = { id: nextId('ord'), status: 'DRAFT', supplierId: p.supplierId, locationId: p.locationId, items: p.items, notes: p.notes ?? null, deliveryAt: p.deliveryAt ?? null, supplier: { id: sup.id, name: sup.name }, location: { id: loc.id, name: loc.name }, createdAt: TODAY };
  orders = [...orders, o];
  return delay(o);
};

export const mockUpdateOrderStatus = async (id: string, status: OrderStatus): Promise<Order> => {
  orders = orders.map(o => o.id === id ? { ...o, status } : o);
  return delay(orders.find(o => o.id === id)!);
};

export const mockDeleteOrder = async (id: string): Promise<void> => {
  orders = orders.filter(o => o.id !== id);
  return delay(undefined);
};

// ─── Cash Closings ────────────────────────────────────────────────────────────

export const mockGetCashClosings = (f: { locationId?: string; from?: string; to?: string } = {}): Promise<CashClosing[]> =>
  delay([...cashClosings].filter(c => between(c.date, f.from, f.to) && (!f.locationId || c.locationId === f.locationId)).sort((a, b) => b.date.localeCompare(a.date)));

export const mockCreateCashClosing = async (p: CashClosingPayload): Promise<CashClosing> => {
  const loc = LOCATIONS.find(l => l.id === p.locationId)!;
  const c: CashClosing = { id: nextId('cc'), ...p, notes: p.notes ?? null, location: { id: loc.id, name: loc.name }, createdAt: TODAY + 'T22:00:00Z' };
  cashClosings = [...cashClosings, c];
  return delay(c);
};

export const mockUpdateCashClosing = async (id: string, p: CashClosingPayload): Promise<CashClosing> => {
  const loc = LOCATIONS.find(l => l.id === p.locationId)!;
  cashClosings = cashClosings.map(c => c.id === id ? { ...c, ...p, location: { id: loc.id, name: loc.name } } : c);
  return delay(cashClosings.find(c => c.id === id)!);
};

export const mockDeleteCashClosing = async (id: string): Promise<void> => {
  cashClosings = cashClosings.filter(c => c.id !== id);
  return delay(undefined);
};

// ─── Vacations ────────────────────────────────────────────────────────────────

export const mockGetVacations = (f: { employeeId?: string; status?: string } = {}): Promise<VacationRequest[]> =>
  delay(vacations.filter(v => (!f.employeeId || v.employeeId === f.employeeId) && (!f.status || v.status === f.status)));

export const mockCreateVacation = async (p: VacationPayload): Promise<VacationRequest> => {
  const emp = EMPLOYEES.find(e => e.id === p.employeeId)!;
  const v: VacationRequest = { id: nextId('vac'), ...p, reason: p.reason ?? null, status: 'PENDING', managerNote: null, employee: { id: emp.id, name: emp.name }, createdAt: TODAY };
  vacations = [...vacations, v];
  return delay(v);
};

export const mockUpdateVacationStatus = async (id: string, status: 'APPROVED' | 'REJECTED', managerNote?: string): Promise<VacationRequest> => {
  vacations = vacations.map(v => v.id === id ? { ...v, status, managerNote: managerNote ?? null } : v);
  return delay(vacations.find(v => v.id === id)!);
};

export const mockDeleteVacation = async (id: string): Promise<void> => {
  vacations = vacations.filter(v => v.id !== id);
  return delay(undefined);
};

// ─── Preferences ──────────────────────────────────────────────────────────────

export const mockGetPreferences = (employeeId?: string): Promise<ShiftPreference[]> =>
  delay(employeeId ? PREFERENCES.filter(p => p.employeeId === employeeId) : [...PREFERENCES]);

export const mockSavePreference = async (p: PreferencePayload): Promise<ShiftPreference> => {
  const emp = EMPLOYEES.find(e => e.id === p.employeeId)!;
  const pref: ShiftPreference = { id: nextId('pref'), employeeId: p.employeeId, dayOfWeek: p.dayOfWeek as ShiftPreference['dayOfWeek'], startTime: p.startTime, endTime: p.endTime, locationId: p.locationId ?? null, notes: p.notes ?? null, employee: { id: emp.id, name: emp.name }, createdAt: TODAY };
  const idx = PREFERENCES.findIndex(x => x.employeeId === p.employeeId && x.dayOfWeek === p.dayOfWeek);
  if (idx >= 0) PREFERENCES[idx] = pref; else PREFERENCES.push(pref);
  return delay(pref);
};

export const mockDeletePreference = async (id: string): Promise<void> => {
  const idx = PREFERENCES.findIndex(p => p.id === id);
  if (idx >= 0) PREFERENCES.splice(idx, 1);
  return delay(undefined);
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const mockGetCashAnalytics = async (locationId?: string): Promise<CashAnalytics> => {
  const cls = cashClosings.filter(c => !locationId || c.locationId === locationId);
  const byDay: Record<number, { total: number; count: number }> = {};
  const byWeek: Record<string, { sales: number; expenses: number; days: number }> = {};
  for (const c of cls) {
    const d = new Date(c.date); const dow = d.getDay();
    if (!byDay[dow]) byDay[dow] = { total: 0, count: 0 };
    byDay[dow].total += c.sales; byDay[dow].count += 1;
    const wk = fmt(addDays(d, -(dow === 0 ? 6 : dow - 1)));
    if (!byWeek[wk]) byWeek[wk] = { sales: 0, expenses: 0, days: 0 };
    byWeek[wk].sales += c.sales; byWeek[wk].expenses += c.expenses; byWeek[wk].days += 1;
  }
  const lbls = ['Dg', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds'];
  const byDayOfWeek = Object.entries(byDay).map(([day, v]) => ({ day: Number(day), label: lbls[Number(day)], avg: Math.round(v.total / v.count), count: v.count })).sort((a, b) => a.day - b.day);
  const trend = Object.entries(byWeek).map(([week, v]) => ({ week, sales: Math.round(v.sales), expenses: Math.round(v.expenses), net: Math.round(v.sales - v.expenses), days: v.days })).sort((a, b) => a.week.localeCompare(b.week));
  const forecast = Array.from({ length: 7 }, (_, i) => { const d = addDays(new Date(), i + 1); const dow = d.getDay(); const dd = byDay[dow]; return { date: fmt(d), label: lbls[dow], predicted: dd ? Math.round(dd.total / dd.count) : 1200 }; });
  const totSales = cls.reduce((s, c) => s + c.sales, 0);
  const totExp   = cls.reduce((s, c) => s + c.expenses, 0);
  const best  = byDayOfWeek.length ? byDayOfWeek.reduce((a, b) => a.avg > b.avg ? a : b) : null;
  const worst = byDayOfWeek.length ? byDayOfWeek.reduce((a, b) => a.avg < b.avg ? a : b) : null;
  return delay({ byDayOfWeek, trend, forecast, summary: cls.length === 0 || !best || !worst ? null : { totalClosings: cls.length, avgDailySales: Math.round(totSales / cls.length), totalSales: Math.round(totSales), totalExpenses: Math.round(totExp), bestDay: best, worstDay: worst } });
};

export const mockGetOrdersAnalytics = async (): Promise<OrdersAnalytics> => {
  const received = orders.filter(o => o.status === 'RECEIVED');
  const prodMap: Record<string, { qty: number; count: number; unit: string; supId: string; supName: string }> = {};
  for (const o of received) for (const item of o.items) {
    if (!prodMap[item.productName]) prodMap[item.productName] = { qty: 0, count: 0, unit: item.unit, supId: o.supplierId, supName: o.supplier.name };
    prodMap[item.productName].qty += item.quantity; prodMap[item.productName].count += 1;
  }
  const topProducts = Object.entries(prodMap).map(([name, v]) => ({ name, totalQty: v.qty, count: v.count, lastUnit: v.unit, supplierId: v.supId, supplierName: v.supName, avgQty: Math.round(v.qty / v.count) })).sort((a, b) => b.count - a.count).slice(0, 8);
  const supMap: Record<string, { name: string; dates: string[] }> = {};
  for (const o of orders) { if (!supMap[o.supplierId]) supMap[o.supplierId] = { name: o.supplier.name, dates: [] }; supMap[o.supplierId].dates.push(o.createdAt.slice(0, 10)); }
  const supplierFrequency = Object.entries(supMap).map(([id, v]) => { const s = v.dates.sort(); const last = s[s.length - 1]; const daysSince = Math.floor((Date.now() - new Date(last).getTime()) / 86400000); const avg = s.length > 1 ? Math.round((new Date(last).getTime() - new Date(s[0]).getTime()) / 86400000 / (s.length - 1)) : 14; return { supplierId: id, supplierName: v.name, totalOrders: v.dates.length, lastOrderDate: last, daysSinceLast: daysSince, avgIntervalDays: avg, overdue: daysSince > avg * 1.2 }; });
  return delay({ topProducts, supplierFrequency, suggestions: [] });
};

export const mockGetStaffingAnalytics = async (): Promise<StaffingAnalytics> => {
  const lbls = ['Dg', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds'];
  const coverage = Array.from({ length: 14 }, (_, i) => { const d = addDays(new Date(), i - 7); const ds = fmt(d); const sh = schedules.filter(s => s.date === ds); const empIds = [...new Set(sh.map(s => s.employeeId))]; return { date: ds, dayLabel: lbls[d.getDay()], shifts: sh.length, employees: empIds, covered: sh.length >= 2 }; });
  return delay({ coverage, totalLocations: LOCATIONS.length, totalEmployees: EMPLOYEES.length, coveredDays: coverage.filter(c => c.covered).length, uncoveredDays: coverage.filter(c => !c.covered).length });
};
