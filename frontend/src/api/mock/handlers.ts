/**
 * Mock API handlers — return local data, mutations work in-memory for the session.
 */
import type {
  Location, Employee, Schedule, Order, CashClosing,
  VacationRequest, ShiftPreference, User, OrderStatus, Supplier,
} from '../../types';
import type { SupplierPayload } from '../suppliers';
import type { LocationPayload } from '../locations';
import type { EmployeePayload } from '../employees';
import type { ScheduleFilters, SchedulePayload } from '../schedules';
import type { CashClosingPayload } from '../cashClosings';
import type { VacationPayload, PreferencePayload } from '../employees';
import type { CashAnalytics, OrdersAnalytics, StaffingAnalytics } from '../analytics';
import { buildDemoData, fmt, addDays } from './data';
import { DATASETS, datasetFor, type Profile } from '../../../../shared/demo-dataset';

// ─── Mutable session state ────────────────────────────────────────────────────
// The dataset is chosen at login and restored from the persisted session on reload.

let locations:    Location[]        = [];
let employees:    Employee[]        = [];
let suppliers:    Supplier[]        = [];
let schedules:    Schedule[]        = [];
let orders:       Order[]           = [];
let cashClosings: CashClosing[]     = [];
let vacations:    VacationRequest[] = [];
let PREFERENCES:  ShiftPreference[] = [];
let GROUP = { id: DATASETS.mosaik.group.id, name: DATASETS.mosaik.group.name, plan: DATASETS.mosaik.group.plan, createdAt: '2024-01-15T08:00:00Z' };
const TODAY = fmt(new Date());

export function loadDataset(profile: Profile) {
  const d = buildDemoData(DATASETS[profile]);
  locations = d.locations; employees = d.employees; suppliers = d.suppliers; schedules = d.schedules;
  orders = d.orders; cashClosings = d.cashClosings; vacations = d.vacations; PREFERENCES = d.preferences;
  GROUP = { ...d.def.group, createdAt: '2024-01-15T08:00:00Z' };
}

function restoreDataset() {
  try {
    const raw = localStorage.getItem('coffe-logic-auth');
    const groupId = raw ? (JSON.parse(raw)?.state?.user?.groupId as string | undefined) : undefined;
    loadDataset(datasetFor({ groupId })?.profile ?? 'mosaik');
  } catch { loadDataset('mosaik'); }
}
restoreDataset();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const delay = <T>(v: T): Promise<T> => new Promise(r => setTimeout(() => r(v), 120));
const parseLocal = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };

let _id = 1000;
const nextId = (prefix: string) => `${prefix}-${++_id}`;

function between(date: string, from?: string, to?: string) {
  if (from && date < from) return false;
  if (to   && date > to)   return false;
  return true;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const mockLogin = async (identifier: string, password: string) => {
  await delay(null);
  const key = identifier.trim().toLowerCase().replace(/\s+/g, '');
  const ds = datasetFor(key.includes('@') ? { email: key } : { username: key });
  const acc = ds?.users.find(u => (key.includes('@') ? u.email === key : u.username === key) && u.password === password);
  if (!ds || !acc) throw new Error('Credencials incorrectes');
  loadDataset(ds.profile);
  const user: User = { id: acc.id, email: acc.email, role: acc.role, groupId: GROUP.id, group: GROUP, createdAt: TODAY };
  return { token: 'demo-token', user };
};

// ─── Locations & Employees ────────────────────────────────────────────────────

const withCounts = (l: Location): Location => ({
  ...l,
  _count: { employees: employees.filter(e => e.locations?.some(x => x.locationId === l.id)).length, schedules: schedules.filter(s => s.locationId === l.id).length },
});
export const mockGetLocations = (): Promise<Location[]> => delay(locations.map(withCounts));
export const mockCreateLocation = async (p: LocationPayload): Promise<Location> => {
  const l: Location = { id: nextId('loc'), name: p.name, address: p.address ?? null, timezone: 'Europe/Zurich', groupId: GROUP.id, createdAt: TODAY };
  locations = [...locations, l];
  return delay(withCounts(l));
};
export const mockUpdateLocation = async (id: string, p: Partial<LocationPayload>): Promise<Location> => {
  locations = locations.map(l => l.id === id ? { ...l, ...p } : l);
  const l = locations.find(x => x.id === id)!;
  const patchRef = (r: { id: string; name: string }) => r.id === id ? { id, name: l.name } : r;
  schedules = schedules.map(s => ({ ...s, location: patchRef(s.location) }));
  orders = orders.map(o => ({ ...o, location: patchRef(o.location) }));
  cashClosings = cashClosings.map(c => ({ ...c, location: patchRef(c.location) }));
  return delay(withCounts(l));
};
export const mockDeleteLocation = async (id: string): Promise<void> => {
  locations = locations.filter(l => l.id !== id);
  schedules = schedules.filter(s => s.locationId !== id);
  orders = orders.filter(o => o.locationId !== id);
  cashClosings = cashClosings.filter(c => c.locationId !== id);
  return delay(undefined);
};

export const mockGetEmployees = (): Promise<Employee[]> => delay([...employees]);
const empLocations = (ids: string[] = []) => ids.map(locationId => ({ locationId, location: { id: locationId, name: locations.find(l => l.id === locationId)?.name ?? '' } }));
export const mockCreateEmployee = async (p: EmployeePayload): Promise<Employee> => {
  const e: Employee = { id: nextId('emp'), name: p.name, email: p.email ?? undefined, phone: p.phone ?? undefined, position: p.position ?? null, weeklyHours: p.weeklyHours ?? null, groupId: GROUP.id, createdAt: TODAY, locations: empLocations(p.locationIds) };
  employees = [...employees, e];
  return delay(e);
};
export const mockUpdateEmployee = async (id: string, p: Partial<EmployeePayload>): Promise<Employee> => {
  employees = employees.map(e => e.id === id ? { ...e, name: p.name ?? e.name, email: p.email === undefined ? e.email : (p.email ?? undefined), phone: p.phone === undefined ? e.phone : (p.phone ?? undefined), position: p.position === undefined ? e.position : p.position, weeklyHours: p.weeklyHours === undefined ? e.weeklyHours : p.weeklyHours, locations: p.locationIds ? empLocations(p.locationIds) : e.locations } : e);
  const e = employees.find(x => x.id === id)!;
  schedules = schedules.map(s => s.employeeId === id ? { ...s, employee: { id, name: e.name } } : s);
  return delay(e);
};
export const mockDeleteEmployee = async (id: string): Promise<void> => {
  employees = employees.filter(e => e.id !== id);
  schedules = schedules.filter(s => s.employeeId !== id);
  vacations = vacations.filter(v => v.employeeId !== id);
  return delay(undefined);
};

// ─── Suppliers ────────────────────────────────────────────────────────────────

export const mockGetSuppliers = (): Promise<Supplier[]> =>
  delay(suppliers.map(s => ({ ...s, _count: { orders: orders.filter(o => o.supplierId === s.id).length } })));
export const mockCreateSupplier = async (p: SupplierPayload): Promise<Supplier> => {
  const sup: Supplier = { id: nextId('sup'), name: p.name, contact: p.contact ?? null, email: p.email ?? null, phone: p.phone ?? null, groupId: GROUP.id };
  suppliers = [...suppliers, sup];
  return delay(sup);
};
export const mockUpdateSupplier = async (id: string, p: Partial<SupplierPayload>): Promise<Supplier> => {
  suppliers = suppliers.map(s => s.id === id ? { ...s, ...p } : s);
  const sup = suppliers.find(s => s.id === id)!;
  orders = orders.map(o => o.supplierId === id ? { ...o, supplier: { id, name: sup.name } } : o);
  return delay(sup);
};
export const mockDeleteSupplier = async (id: string): Promise<void> => {
  if (orders.some(o => o.supplierId === id)) throw new Error('No es pot eliminar un proveïdor amb comandes associades');
  suppliers = suppliers.filter(s => s.id !== id);
  return delay(undefined);
};

// ─── Schedules ────────────────────────────────────────────────────────────────

export const mockGetSchedules = (f: ScheduleFilters = {}): Promise<Schedule[]> =>
  delay(schedules.filter(s =>
    between(s.date, f.from, f.to) &&
    (!f.locationId || s.locationId === f.locationId) &&
    (!f.employeeId || s.employeeId === f.employeeId)
  ));

export const mockCreateSchedule = async (p: SchedulePayload): Promise<Schedule> => {
  const emp = employees.find(e => e.id === p.employeeId)!;
  const loc = locations.find(l => l.id === p.locationId)!;
  if (p.startTime >= p.endTime) throw new Error("L'hora de sortida ha de ser posterior a l'hora d'entrada");
  const conflict = schedules.find(x => x.employeeId === p.employeeId && x.date === p.date && x.startTime < p.endTime && x.endTime > p.startTime);
  if (conflict) throw new Error(`${emp.name}: ${conflict.startTime}–${conflict.endTime} (${conflict.location.name})`);
  const s: Schedule = { id: nextId('sch'), ...p, notes: p.notes ?? null, employee: { id: emp.id, name: emp.name }, location: { id: loc.id, name: loc.name }, createdAt: TODAY };
  schedules = [...schedules, s];
  return delay(s);
};

export const mockUpdateSchedule = async (id: string, p: Partial<SchedulePayload>): Promise<Schedule> => {
  schedules = schedules.map(s => {
    if (s.id !== id) return s;
    const emp = employees.find(e => e.id === (p.employeeId ?? s.employeeId))!;
    const loc = locations.find(l => l.id === (p.locationId ?? s.locationId))!;
    return { ...s, ...p, notes: p.notes === undefined ? s.notes : p.notes, employee: { id: emp.id, name: emp.name }, location: { id: loc.id, name: loc.name } };
  });
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
  const sup = suppliers.find(x => x.id === p.supplierId) ?? { id: p.supplierId, name: '?' };
  const loc = locations.find(l => l.id === p.locationId)!;
  const o: Order = { id: nextId('ord'), status: 'DRAFT', supplierId: p.supplierId, locationId: p.locationId, items: p.items, notes: p.notes ?? null, deliveryAt: p.deliveryAt ?? null, supplier: { id: sup.id, name: sup.name }, location: { id: loc.id, name: loc.name }, createdAt: new Date().toISOString() };
  orders = [o, ...orders];
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
  const loc = locations.find(l => l.id === p.locationId)!;
  if (cashClosings.some(c => c.locationId === p.locationId && c.date === p.date)) throw new Error('Ja existeix un tancament per aquest local i data');
  const c: CashClosing = { id: nextId('cc'), ...p, notes: p.notes ?? null, location: { id: loc.id, name: loc.name }, createdAt: TODAY + 'T22:00:00Z' };
  cashClosings = [...cashClosings, c];
  return delay(c);
};

export const mockUpdateCashClosing = async (id: string, p: CashClosingPayload): Promise<CashClosing> => {
  const loc = locations.find(l => l.id === p.locationId)!;
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
  const emp = employees.find(e => e.id === p.employeeId)!;
  const overlap = vacations.find(v => v.employeeId === p.employeeId && v.status !== 'REJECTED' && v.fromDate <= p.toDate && v.toDate >= p.fromDate);
  if (overlap) throw new Error('Ja existeix una sol·licitud que se solapa amb aquestes dates');
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
  const emp = employees.find(e => e.id === p.employeeId)!;
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
  const byWeek: Record<string, { sales: number; expenses: number; dates: Set<string> }> = {};
  for (const c of cls) {
    const d = parseLocal(c.date); const dow = d.getDay();
    if (!byDay[dow]) byDay[dow] = { total: 0, count: 0 };
    byDay[dow].total += c.sales; byDay[dow].count += 1;
    const wk = fmt(addDays(d, -(dow === 0 ? 6 : dow - 1)));
    if (!byWeek[wk]) byWeek[wk] = { sales: 0, expenses: 0, dates: new Set() };
    byWeek[wk].sales += c.sales; byWeek[wk].expenses += c.expenses; byWeek[wk].dates.add(c.date);
  }
  const lbls = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const byDayOfWeek = Object.entries(byDay).map(([day, v]) => ({ day: Number(day), label: lbls[Number(day)], avg: Math.round(v.total / v.count), count: v.count })).sort((a, b) => a.day - b.day);
  const trend = Object.entries(byWeek).map(([week, v]) => ({ week, sales: Math.round(v.sales), expenses: Math.round(v.expenses), net: Math.round(v.sales - v.expenses), days: v.dates.size })).sort((a, b) => a.week.localeCompare(b.week));
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
  const supplierFrequency = Object.entries(supMap).map(([id, v]) => { const s = v.dates.sort(); const last = s[s.length - 1]; const daysSince = Math.floor((Date.now() - parseLocal(last).getTime()) / 86400000); const avg = s.length > 1 ? Math.round((parseLocal(last).getTime() - parseLocal(s[0]).getTime()) / 86400000 / (s.length - 1)) : 14; return { supplierId: id, supplierName: v.name, totalOrders: v.dates.length, lastOrderDate: last, daysSinceLast: daysSince, avgIntervalDays: avg, overdue: avg > 0 && daysSince > avg * 1.2 }; }).sort((a, b) => b.totalOrders - a.totalOrders);
  const suggestions = topProducts
    .filter(p => supplierFrequency.find(sf => sf.supplierId === p.supplierId)?.overdue)
    .map(p => ({ productName: p.name, suggestedQty: p.avgQty, unit: p.lastUnit, supplierId: p.supplierId, supplierName: p.supplierName, reason: 'usual' }));
  return delay({ topProducts, supplierFrequency, suggestions });
};

export const mockGetStaffingAnalytics = async (): Promise<StaffingAnalytics> => {
  const lbls = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const coverage = Array.from({ length: 14 }, (_, i) => { const d = addDays(new Date(), i); const ds = fmt(d); const sh = schedules.filter(s => s.date === ds); const names = [...new Set(sh.map(s => s.employee.name))]; return { date: ds, dayLabel: lbls[d.getDay()], shifts: sh.length, employees: names, covered: sh.length >= locations.length }; });
  return delay({ coverage, totalLocations: locations.length, totalEmployees: employees.length, coveredDays: coverage.filter(c => c.covered).length, uncoveredDays: coverage.filter(c => !c.covered).length });
};
