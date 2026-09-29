/**
 * Builds frontend-typed demo data from a shared dataset profile.
 * The profile is chosen at login (see handlers.ts).
 */
import type { Location, Employee, Schedule, Order, CashClosing, VacationRequest, ShiftPreference, Supplier } from '../../types';
import { type DatasetDef, genSchedules, genClosings, fmt, addDays } from '../../../../shared/demo-dataset';

export interface DemoData {
  def: DatasetDef;
  locations: Location[]; employees: Employee[]; suppliers: Supplier[];
  schedules: Schedule[]; orders: Order[]; cashClosings: CashClosing[];
  vacations: VacationRequest[]; preferences: ShiftPreference[];
}

const CREATED = '2024-01-15T08:00:00Z';

export function buildDemoData(def: DatasetDef, now = new Date()): DemoData {
  const TODAY = fmt(now);
  const groupId = def.group.id;
  const locName = Object.fromEntries(def.locations.map((l) => [l.id, l.name]));
  const empName = Object.fromEntries(def.employees.map((e) => [e.id, e.name]));
  const supName = Object.fromEntries(def.suppliers.map((s) => [s.id, s.name]));

  const locations: Location[] = def.locations.map((l) => ({ ...l, timezone: 'Europe/Zurich', groupId, createdAt: CREATED }));
  const employees: Employee[] = def.employees.map((e) => ({
    id: e.id, name: e.name, email: e.email || undefined, phone: e.phone || undefined, position: e.position, weeklyHours: e.weeklyHours, groupId, createdAt: CREATED,
    locations: e.locations.map((locationId) => ({ locationId, location: { id: locationId, name: locName[locationId] } })),
  }));
  const suppliers: Supplier[] = def.suppliers.map((s) => ({ ...s, groupId }));
  const schedules: Schedule[] = genSchedules(def, now).map((s, i) => ({
    id: `${def.profile}-sch-${i + 1}`, ...s, notes: null, employee: { id: s.employeeId, name: empName[s.employeeId] }, location: { id: s.locationId, name: locName[s.locationId] }, createdAt: CREATED,
  }));
  const orders: Order[] = def.orders.map((o) => {
    const createdAt = addDays(now, o.created); createdAt.setHours(9, 30, 0, 0);
    return {
      id: o.id, supplierId: o.sup, locationId: o.loc, status: o.status, items: o.items.map((i) => ({ ...i })), notes: o.notes ?? null,
      deliveryAt: o.delivery !== undefined ? fmt(addDays(now, o.delivery)) : null, createdAt: createdAt.toISOString(),
      supplier: { id: o.sup, name: supName[o.sup] }, location: { id: o.loc, name: locName[o.loc] },
    };
  });
  const cashClosings: CashClosing[] = genClosings(def, now).map((c, i) => ({
    id: `${def.profile}-cc-${i + 1}`, ...c, location: { id: c.locationId, name: locName[c.locationId] }, createdAt: c.date + 'T18:30:00Z',
  }));
  const vacations: VacationRequest[] = def.vacations.map((v, i) => ({
    id: `${def.profile}-vac-${i + 1}`, employeeId: v.employeeId, fromDate: fmt(addDays(now, v.from)), toDate: fmt(addDays(now, v.to)), reason: v.reason, status: v.status, managerNote: v.managerNote,
    employee: { id: v.employeeId, name: empName[v.employeeId] }, createdAt: TODAY,
  }));
  const preferences: ShiftPreference[] = def.preferences.map((p, i) => ({
    id: `${def.profile}-pref-${i + 1}`, employeeId: p.e, dayOfWeek: p.day, startTime: p.s, endTime: p.end, locationId: p.l, notes: p.notes,
    employee: { id: p.e, name: empName[p.e] }, createdAt: TODAY,
  }));

  return { def, locations, employees, suppliers, schedules, orders, cashClosings, vacations, preferences };
}

export { fmt, addDays };
