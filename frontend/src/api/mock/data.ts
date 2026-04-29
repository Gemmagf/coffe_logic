/**
 * Mock data for demo mode (GitHub Pages — no backend required).
 * All dates are generated relative to today so the demo always looks "current".
 */
import type {
  Location, Employee, Schedule, Order, CashClosing,
  VacationRequest, ShiftPreference,
} from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (d: Date) => d.toISOString().slice(0, 10);

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function mondayOf(d: Date): Date {
  const day = d.getDay();
  return addDays(d, day === 0 ? -6 : 1 - day);
}

const now = new Date();
const TODAY = fmt(now);
const MONDAY = mondayOf(now);

function uid(prefix: string, n: number | string) { return `${prefix}-${n}`; }

// ─── Static entities ──────────────────────────────────────────────────────────

export const LOCATIONS: Location[] = [
  { id: 'demo-loc-001', name: 'The Commercial – Zürich HB',  address: 'Bahnhofplatz 1, 8001 Zürich',      timezone: 'Europe/Zurich', groupId: 'demo-group-001', createdAt: '2025-01-01T00:00:00Z' },
  { id: 'demo-loc-002', name: 'The Commercial – Oerlikon',   address: 'Max-Bill-Platz 12, 8050 Zürich',   timezone: 'Europe/Zurich', groupId: 'demo-group-001', createdAt: '2025-01-01T00:00:00Z' },
  { id: 'demo-loc-003', name: 'The Commercial – Enge',       address: 'Bederstrasse 57, 8002 Zürich',     timezone: 'Europe/Zurich', groupId: 'demo-group-001', createdAt: '2025-01-01T00:00:00Z' },
];

export const EMPLOYEES: Employee[] = [
  { id: 'demo-emp-001', name: 'Anna Müller',       email: 'anna@commercial.ch',   phone: '+41 79 111 22 33', groupId: 'demo-group-001', createdAt: '2025-01-01T00:00:00Z',
    locations: [{ locationId: 'demo-loc-001', location: { id: 'demo-loc-001', name: 'The Commercial – Zürich HB' } }, { locationId: 'demo-loc-003', location: { id: 'demo-loc-003', name: 'The Commercial – Enge' } }] },
  { id: 'demo-emp-002', name: 'Marc Pérez',        email: 'marc@commercial.ch',   phone: '+41 79 222 33 44', groupId: 'demo-group-001', createdAt: '2025-01-01T00:00:00Z',
    locations: [{ locationId: 'demo-loc-001', location: { id: 'demo-loc-001', name: 'The Commercial – Zürich HB' } }, { locationId: 'demo-loc-002', location: { id: 'demo-loc-002', name: 'The Commercial – Oerlikon' } }, { locationId: 'demo-loc-003', location: { id: 'demo-loc-003', name: 'The Commercial – Enge' } }] },
  { id: 'demo-emp-003', name: 'Sophie Gerber',     email: 'sophie@commercial.ch', phone: '+41 79 333 44 55', groupId: 'demo-group-001', createdAt: '2025-01-01T00:00:00Z',
    locations: [{ locationId: 'demo-loc-002', location: { id: 'demo-loc-002', name: 'The Commercial – Oerlikon' } }, { locationId: 'demo-loc-003', location: { id: 'demo-loc-003', name: 'The Commercial – Enge' } }] },
  { id: 'demo-emp-004', name: 'Lukas Zimmermann',  email: 'lukas@commercial.ch',  phone: '+41 79 444 55 66', groupId: 'demo-group-001', createdAt: '2025-01-01T00:00:00Z',
    locations: [{ locationId: 'demo-loc-002', location: { id: 'demo-loc-002', name: 'The Commercial – Oerlikon' } }] },
  { id: 'demo-emp-005', name: 'Chiara Rossi',      email: 'chiara@commercial.ch', phone: '+41 79 555 66 77', groupId: 'demo-group-001', createdAt: '2025-01-01T00:00:00Z',
    locations: [{ locationId: 'demo-loc-001', location: { id: 'demo-loc-001', name: 'The Commercial – Zürich HB' } }] },
  { id: 'demo-emp-006', name: 'David Weber',       email: 'david@commercial.ch',  phone: '+41 79 666 77 88', groupId: 'demo-group-001', createdAt: '2025-01-01T00:00:00Z',
    locations: [{ locationId: 'demo-loc-001', location: { id: 'demo-loc-001', name: 'The Commercial – Zürich HB' } }, { locationId: 'demo-loc-002', location: { id: 'demo-loc-002', name: 'The Commercial – Oerlikon' } }] },
  { id: 'demo-emp-007', name: 'Julia Fischer',     email: 'julia@commercial.ch',  phone: '+41 79 777 88 99', groupId: 'demo-group-001', createdAt: '2025-01-01T00:00:00Z',
    locations: [{ locationId: 'demo-loc-003', location: { id: 'demo-loc-003', name: 'The Commercial – Enge' } }] },
  { id: 'demo-emp-008', name: 'Nikos Papadopoulos',email: 'nikos@commercial.ch',  phone: '+41 79 888 99 00', groupId: 'demo-group-001', createdAt: '2025-01-01T00:00:00Z',
    locations: [{ locationId: 'demo-loc-002', location: { id: 'demo-loc-002', name: 'The Commercial – Oerlikon' } }] },
  { id: 'demo-emp-009', name: 'Léa Dubois',        email: 'lea@commercial.ch',    phone: '+41 79 999 00 11', groupId: 'demo-group-001', createdAt: '2025-01-01T00:00:00Z',
    locations: [{ locationId: 'demo-loc-001', location: { id: 'demo-loc-001', name: 'The Commercial – Zürich HB' } }, { locationId: 'demo-loc-003', location: { id: 'demo-loc-003', name: 'The Commercial – Enge' } }] },
];

const EMP = Object.fromEntries(EMPLOYEES.map(e => [e.id, e]));
const LOC = Object.fromEntries(LOCATIONS.map(l => [l.id, l]));

// ─── Schedules ────────────────────────────────────────────────────────────────

type SlotDef = { eId: string; lId: string; s: string; e: string };
type WeekPattern = SlotDef[][];

const weeklyHB: WeekPattern = [
  [{ eId: 'demo-emp-001', lId: 'demo-loc-001', s: '07:00', e: '15:00' }, { eId: 'demo-emp-006', lId: 'demo-loc-001', s: '09:00', e: '17:00' }, { eId: 'demo-emp-009', lId: 'demo-loc-001', s: '13:00', e: '21:00' }],
  [{ eId: 'demo-emp-001', lId: 'demo-loc-001', s: '07:00', e: '15:00' }, { eId: 'demo-emp-005', lId: 'demo-loc-001', s: '10:00', e: '18:00' }, { eId: 'demo-emp-009', lId: 'demo-loc-001', s: '13:00', e: '21:00' }],
  [{ eId: 'demo-emp-001', lId: 'demo-loc-001', s: '07:00', e: '15:00' }, { eId: 'demo-emp-006', lId: 'demo-loc-001', s: '09:00', e: '17:00' }, { eId: 'demo-emp-002', lId: 'demo-loc-001', s: '11:00', e: '19:00' }],
  [{ eId: 'demo-emp-001', lId: 'demo-loc-001', s: '07:00', e: '15:00' }, { eId: 'demo-emp-005', lId: 'demo-loc-001', s: '10:00', e: '18:00' }, { eId: 'demo-emp-006', lId: 'demo-loc-001', s: '12:00', e: '20:00' }],
  [{ eId: 'demo-emp-001', lId: 'demo-loc-001', s: '07:00', e: '13:00' }, { eId: 'demo-emp-002', lId: 'demo-loc-001', s: '10:00', e: '18:00' }, { eId: 'demo-emp-005', lId: 'demo-loc-001', s: '13:00', e: '21:00' }, { eId: 'demo-emp-009', lId: 'demo-loc-001', s: '15:00', e: '23:00' }],
  [{ eId: 'demo-emp-005', lId: 'demo-loc-001', s: '09:00', e: '17:00' }, { eId: 'demo-emp-009', lId: 'demo-loc-001', s: '10:00', e: '18:00' }, { eId: 'demo-emp-006', lId: 'demo-loc-001', s: '12:00', e: '20:00' }],
  [{ eId: 'demo-emp-005', lId: 'demo-loc-001', s: '10:00', e: '18:00' }, { eId: 'demo-emp-009', lId: 'demo-loc-001', s: '11:00', e: '19:00' }],
];

const weeklyOerlikon: WeekPattern = [
  [{ eId: 'demo-emp-008', lId: 'demo-loc-002', s: '07:00', e: '15:00' }, { eId: 'demo-emp-004', lId: 'demo-loc-002', s: '09:00', e: '17:00' }],
  [{ eId: 'demo-emp-008', lId: 'demo-loc-002', s: '07:00', e: '15:00' }, { eId: 'demo-emp-003', lId: 'demo-loc-002', s: '13:00', e: '21:00' }],
  [{ eId: 'demo-emp-008', lId: 'demo-loc-002', s: '07:00', e: '15:00' }, { eId: 'demo-emp-004', lId: 'demo-loc-002', s: '09:00', e: '17:00' }, { eId: 'demo-emp-002', lId: 'demo-loc-002', s: '13:00', e: '21:00' }],
  [{ eId: 'demo-emp-004', lId: 'demo-loc-002', s: '09:00', e: '17:00' }, { eId: 'demo-emp-006', lId: 'demo-loc-002', s: '13:00', e: '21:00' }],
  [{ eId: 'demo-emp-008', lId: 'demo-loc-002', s: '07:00', e: '15:00' }, { eId: 'demo-emp-004', lId: 'demo-loc-002', s: '10:00', e: '18:00' }, { eId: 'demo-emp-003', lId: 'demo-loc-002', s: '14:00', e: '22:00' }],
  [{ eId: 'demo-emp-004', lId: 'demo-loc-002', s: '09:00', e: '17:00' }, { eId: 'demo-emp-003', lId: 'demo-loc-002', s: '10:00', e: '18:00' }],
  [{ eId: 'demo-emp-003', lId: 'demo-loc-002', s: '10:00', e: '16:00' }, { eId: 'demo-emp-004', lId: 'demo-loc-002', s: '10:00', e: '16:00' }],
];

const weeklyEnge: WeekPattern = [
  [{ eId: 'demo-emp-009', lId: 'demo-loc-003', s: '08:00', e: '16:00' }, { eId: 'demo-emp-007', lId: 'demo-loc-003', s: '10:00', e: '18:00' }],
  [{ eId: 'demo-emp-009', lId: 'demo-loc-003', s: '08:00', e: '16:00' }, { eId: 'demo-emp-003', lId: 'demo-loc-003', s: '14:00', e: '22:00' }],
  [{ eId: 'demo-emp-001', lId: 'demo-loc-003', s: '08:00', e: '14:00' }, { eId: 'demo-emp-007', lId: 'demo-loc-003', s: '11:00', e: '19:00' }],
  [{ eId: 'demo-emp-009', lId: 'demo-loc-003', s: '08:00', e: '16:00' }, { eId: 'demo-emp-003', lId: 'demo-loc-003', s: '14:00', e: '22:00' }],
  [{ eId: 'demo-emp-007', lId: 'demo-loc-003', s: '10:00', e: '18:00' }, { eId: 'demo-emp-002', lId: 'demo-loc-003', s: '12:00', e: '20:00' }],
  [{ eId: 'demo-emp-007', lId: 'demo-loc-003', s: '09:00', e: '17:00' }, { eId: 'demo-emp-003', lId: 'demo-loc-003', s: '10:00', e: '18:00' }, { eId: 'demo-emp-001', lId: 'demo-loc-003', s: '11:00', e: '19:00' }],
  [{ eId: 'demo-emp-007', lId: 'demo-loc-003', s: '10:00', e: '17:00' }],
];

function buildSchedules(): Schedule[] {
  let counter = 0;
  const result: Schedule[] = [];
  for (let wOff = -3; wOff <= 0; wOff++) {
    const mon = addDays(MONDAY, wOff * 7);
    for (const pattern of [weeklyHB, weeklyOerlikon, weeklyEnge]) {
      for (let d = 0; d < 7; d++) {
        const date = fmt(addDays(mon, d));
        for (const slot of pattern[d]) {
          const hash = (wOff * 31 + d * 7 + slot.eId.charCodeAt(8)) & 0xFF;
          if (wOff < 0 && hash % 11 === 0) continue; // ~9% absences
          counter++;
          result.push({
            id: uid('sch', counter),
            employeeId: slot.eId, locationId: slot.lId,
            date, startTime: slot.s, endTime: slot.e, notes: null,
            employee: { id: slot.eId, name: EMP[slot.eId].name },
            location:  { id: slot.lId, name: LOC[slot.lId].name },
            createdAt: '2025-01-01T00:00:00Z',
          });
        }
      }
    }
  }
  return result;
}

export let SCHEDULES: Schedule[] = buildSchedules();

// ─── Orders ───────────────────────────────────────────────────────────────────

export let ORDERS: Order[] = [
  { id: 'ord-01', supplierId: 'sup-01', locationId: 'demo-loc-001', status: 'RECEIVED', deliveryAt: fmt(addDays(now, -10)), notes: 'Entregat sense incidències.',
    items: [{ productName: 'Espresso blend premium', quantity: 8, unit: 'kg', unitPrice: 32.50 }, { productName: 'Descafeinat', quantity: 2, unit: 'kg', unitPrice: 34.00 }],
    supplier: { id: 'sup-01', name: 'Kaffee Zürich AG' }, location: { id: 'demo-loc-001', name: 'The Commercial – Zürich HB' }, createdAt: fmt(addDays(now, -12)) },
  { id: 'ord-02', supplierId: 'sup-02', locationId: 'demo-loc-002', status: 'RECEIVED', deliveryAt: fmt(addDays(now, -8)), notes: 'Croissants molt frescos.',
    items: [{ productName: 'Croissants mantequilla', quantity: 100, unit: 'u', unitPrice: 0.85 }, { productName: 'Pain au chocolat', quantity: 60, unit: 'u', unitPrice: 0.95 }, { productName: 'Baguette', quantity: 30, unit: 'u', unitPrice: 1.20 }],
    supplier: { id: 'sup-02', name: 'Bäckerei Hug AG' }, location: { id: 'demo-loc-002', name: 'The Commercial – Oerlikon' }, createdAt: fmt(addDays(now, -10)) },
  { id: 'ord-03', supplierId: 'sup-04', locationId: 'demo-loc-003', status: 'RECEIVED', deliveryAt: fmt(addDays(now, -5)), notes: null,
    items: [{ productName: 'Llet sencera UHT', quantity: 60, unit: 'L', unitPrice: 1.65 }, { productName: 'Nata líquida', quantity: 12, unit: 'L', unitPrice: 2.80 }],
    supplier: { id: 'sup-04', name: 'Swiss Dairy Co.' }, location: { id: 'demo-loc-003', name: 'The Commercial – Enge' }, createdAt: fmt(addDays(now, -7)) },
  { id: 'ord-04', supplierId: 'sup-01', locationId: 'demo-loc-001', status: 'SENT', deliveryAt: fmt(addDays(now, 2)), notes: 'Entrega dimarts matí, preferiblement abans de les 9h.',
    items: [{ productName: 'Espresso blend premium', quantity: 10, unit: 'kg', unitPrice: 32.50 }, { productName: 'Cafè Brasil single origin', quantity: 3, unit: 'kg', unitPrice: 41.00 }, { productName: 'Filtres V60 M', quantity: 200, unit: 'u', unitPrice: 0.08 }],
    supplier: { id: 'sup-01', name: 'Kaffee Zürich AG' }, location: { id: 'demo-loc-001', name: 'The Commercial – Zürich HB' }, createdAt: fmt(addDays(now, -1)) },
  { id: 'ord-05', supplierId: 'sup-01', locationId: 'demo-loc-002', status: 'SENT', deliveryAt: fmt(addDays(now, 2)), notes: null,
    items: [{ productName: 'Espresso blend premium', quantity: 6, unit: 'kg', unitPrice: 32.50 }, { productName: 'Descafeinat', quantity: 2, unit: 'kg', unitPrice: 34.00 }],
    supplier: { id: 'sup-01', name: 'Kaffee Zürich AG' }, location: { id: 'demo-loc-002', name: 'The Commercial – Oerlikon' }, createdAt: fmt(addDays(now, -1)) },
  { id: 'ord-06', supplierId: 'sup-02', locationId: 'demo-loc-001', status: 'SENT', deliveryAt: fmt(addDays(now, 1)), notes: 'Entrega dijous matí.',
    items: [{ productName: 'Croissants mantequilla', quantity: 80, unit: 'u', unitPrice: 0.85 }, { productName: 'Muffin ametlla', quantity: 40, unit: 'u', unitPrice: 1.10 }, { productName: 'Scones', quantity: 30, unit: 'u', unitPrice: 1.25 }],
    supplier: { id: 'sup-02', name: 'Bäckerei Hug AG' }, location: { id: 'demo-loc-001', name: 'The Commercial – Zürich HB' }, createdAt: fmt(addDays(now, -2)) },
  { id: 'ord-07', supplierId: 'sup-03', locationId: 'demo-loc-003', status: 'SENT', deliveryAt: fmt(addDays(now, 3)), notes: null,
    items: [{ productName: 'Suc de taronja natural', quantity: 20, unit: 'L', unitPrice: 3.50 }, { productName: 'Fruita de temporada', quantity: 10, unit: 'kg', unitPrice: 4.20 }],
    supplier: { id: 'sup-03', name: 'Frische Produkte GmbH' }, location: { id: 'demo-loc-003', name: 'The Commercial – Enge' }, createdAt: fmt(addDays(now, -1)) },
  { id: 'ord-08', supplierId: 'sup-04', locationId: 'demo-loc-001', status: 'DRAFT', deliveryAt: null, notes: 'Revisar stock avant de confirmar.',
    items: [{ productName: 'Llet sencera UHT', quantity: 80, unit: 'L', unitPrice: 1.65 }, { productName: "Llet d'avena", quantity: 20, unit: 'L', unitPrice: 2.40 }, { productName: "Llet d'ametlla", quantity: 12, unit: 'L', unitPrice: 2.90 }],
    supplier: { id: 'sup-04', name: 'Swiss Dairy Co.' }, location: { id: 'demo-loc-001', name: 'The Commercial – Zürich HB' }, createdAt: TODAY },
  { id: 'ord-09', supplierId: 'sup-02', locationId: 'demo-loc-003', status: 'DRAFT', deliveryAt: null, notes: null,
    items: [{ productName: 'Croissants mantequilla', quantity: 60, unit: 'u', unitPrice: 0.85 }, { productName: 'Carrot cake', quantity: 3, unit: 'u', unitPrice: 18.50 }, { productName: 'Cheesecake NY', quantity: 2, unit: 'u', unitPrice: 22.00 }],
    supplier: { id: 'sup-02', name: 'Bäckerei Hug AG' }, location: { id: 'demo-loc-003', name: 'The Commercial – Enge' }, createdAt: TODAY },
  { id: 'ord-10', supplierId: 'sup-03', locationId: 'demo-loc-002', status: 'DRAFT', deliveryAt: null, notes: null,
    items: [{ productName: 'Suc de taronja natural', quantity: 15, unit: 'L', unitPrice: 3.50 }, { productName: 'Tomates cherry', quantity: 3, unit: 'kg', unitPrice: 6.20 }],
    supplier: { id: 'sup-03', name: 'Frische Produkte GmbH' }, location: { id: 'demo-loc-002', name: 'The Commercial – Oerlikon' }, createdAt: TODAY },
];

// ─── Cash Closings ────────────────────────────────────────────────────────────

function vary(base: number, seed: number, amp: number) {
  const f = [1.0, 0.88, 0.93, 1.05, 1.18, 1.35, 1.25][Math.abs(seed) % 7];
  return Math.round((base * f + (seed % 3) * amp) * 100) / 100;
}

function buildClosings(): CashClosing[] {
  const bases: Record<string, { weekday: number; weekend: number }> = {
    'demo-loc-001': { weekday: 1850, weekend: 2600 },
    'demo-loc-002': { weekday: 1250, weekend: 1750 },
    'demo-loc-003': { weekday: 1450, weekend: 2050 },
  };
  const result: CashClosing[] = [];
  let counter = 0;
  for (let dOff = -13; dOff <= 0; dOff++) {
    const d = addDays(now, dOff);
    const dateStr = fmt(d);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    for (const loc of LOCATIONS) {
      const b = bases[loc.id];
      const seed = dOff * 3 + loc.id.charCodeAt(8);
      const sales = vary(isWeekend ? b.weekend : b.weekday, seed, 80);
      const cardRatio = Math.min(0.85, 0.65 + Math.abs(seed % 5) * 0.04);
      const cardSales = Math.round(sales * cardRatio * 100) / 100;
      const cashSales = Math.round((sales - cardSales) * 100) / 100;
      const expenses = isWeekend ? 25 : 15 + (Math.abs(dOff) % 3) * 8;
      const disc = seed % 9 === 0 ? -4.5 : seed % 7 === 0 ? 2.0 : 0;
      const closing = Math.round((200 + sales - expenses + disc) * 100) / 100;
      const notes = dOff === -7 && loc.id === 'demo-loc-001' ? 'TPV avariat a la tarda, algunes vendes en efectiu.'
        : dOff === -3 && loc.id === 'demo-loc-002' ? 'Mercat proper, +20% clients.' : null;
      counter++;
      result.push({ id: uid('cc', counter), locationId: loc.id, date: dateStr, openingAmount: 200, closingAmount: closing, sales, cardSales, cashSales, expenses, notes, location: { id: loc.id, name: loc.name }, createdAt: dateStr + 'T22:00:00Z' });
    }
  }
  return result;
}

export let CASH_CLOSINGS: CashClosing[] = buildClosings();

// ─── Vacation Requests ────────────────────────────────────────────────────────

export let VACATIONS: VacationRequest[] = [
  { id: 'vac-01', employeeId: 'demo-emp-001', fromDate: fmt(addDays(now, 28)), toDate: fmt(addDays(now, 35)), reason: "Vacances d'estiu a Mallorca", status: 'PENDING', managerNote: null, employee: { id: 'demo-emp-001', name: 'Anna Müller' }, createdAt: TODAY },
  { id: 'vac-02', employeeId: 'demo-emp-003', fromDate: fmt(addDays(now, 7)),  toDate: fmt(addDays(now, 9)),  reason: 'Assumptes personals', status: 'APPROVED', managerNote: 'Aprovat. Lukas cobrirà els torns.', employee: { id: 'demo-emp-003', name: 'Sophie Gerber' }, createdAt: TODAY },
  { id: 'vac-03', employeeId: 'demo-emp-008', fromDate: fmt(addDays(now, 14)), toDate: fmt(addDays(now, 16)), reason: 'Cita mèdica especialista', status: 'APPROVED', managerNote: 'OK. Marc disponible per Oerlikon.', employee: { id: 'demo-emp-008', name: 'Nikos Papadopoulos' }, createdAt: TODAY },
  { id: 'vac-04', employeeId: 'demo-emp-005', fromDate: fmt(addDays(now, 3)),  toDate: fmt(addDays(now, 4)),  reason: 'Viatge de cap de setmana', status: 'REJECTED', managerNote: 'Setmana de molt moviment. Parlem per buscar alternativa.', employee: { id: 'demo-emp-005', name: 'Chiara Rossi' }, createdAt: TODAY },
  { id: 'vac-05', employeeId: 'demo-emp-004', fromDate: fmt(addDays(now, 42)), toDate: fmt(addDays(now, 56)), reason: 'Vacances estiu (3 setmanes)', status: 'PENDING', managerNote: null, employee: { id: 'demo-emp-004', name: 'Lukas Zimmermann' }, createdAt: TODAY },
  { id: 'vac-06', employeeId: 'demo-emp-007', fromDate: fmt(addDays(now, 21)), toDate: fmt(addDays(now, 22)), reason: 'Casament familiar', status: 'APPROVED', managerNote: 'Aprovat. Bon profit!', employee: { id: 'demo-emp-007', name: 'Julia Fischer' }, createdAt: TODAY },
];

// ─── Shift Preferences ────────────────────────────────────────────────────────

export const PREFERENCES: ShiftPreference[] = [
  { id: 'pref-01', employeeId: 'demo-emp-001', dayOfWeek: 'MON', startTime: '07:00', endTime: '15:00', locationId: 'demo-loc-001', notes: 'Prefereixo matins al HB', employee: { id: 'demo-emp-001', name: 'Anna Müller' }, createdAt: TODAY },
  { id: 'pref-02', employeeId: 'demo-emp-001', dayOfWeek: 'TUE', startTime: '07:00', endTime: '15:00', locationId: 'demo-loc-001', notes: null, employee: { id: 'demo-emp-001', name: 'Anna Müller' }, createdAt: TODAY },
  { id: 'pref-03', employeeId: 'demo-emp-001', dayOfWeek: 'WED', startTime: '08:00', endTime: '14:00', locationId: 'demo-loc-003', notes: 'Dimecres Enge si possible', employee: { id: 'demo-emp-001', name: 'Anna Müller' }, createdAt: TODAY },
  { id: 'pref-04', employeeId: 'demo-emp-001', dayOfWeek: 'THU', startTime: '07:00', endTime: '15:00', locationId: 'demo-loc-001', notes: null, employee: { id: 'demo-emp-001', name: 'Anna Müller' }, createdAt: TODAY },
  { id: 'pref-05', employeeId: 'demo-emp-001', dayOfWeek: 'FRI', startTime: '07:00', endTime: '13:00', locationId: 'demo-loc-001', notes: 'Divendres sortida aviat', employee: { id: 'demo-emp-001', name: 'Anna Müller' }, createdAt: TODAY },
  { id: 'pref-06', employeeId: 'demo-emp-002', dayOfWeek: 'MON', startTime: '10:00', endTime: '18:00', locationId: null, notes: null, employee: { id: 'demo-emp-002', name: 'Marc Pérez' }, createdAt: TODAY },
  { id: 'pref-07', employeeId: 'demo-emp-002', dayOfWeek: 'WED', startTime: '10:00', endTime: '18:00', locationId: 'demo-loc-002', notes: 'Dimecres prefereixo Oerlikon', employee: { id: 'demo-emp-002', name: 'Marc Pérez' }, createdAt: TODAY },
  { id: 'pref-08', employeeId: 'demo-emp-002', dayOfWeek: 'FRI', startTime: '11:00', endTime: '19:00', locationId: null, notes: null, employee: { id: 'demo-emp-002', name: 'Marc Pérez' }, createdAt: TODAY },
  { id: 'pref-09', employeeId: 'demo-emp-002', dayOfWeek: 'SAT', startTime: '09:00', endTime: '14:00', locationId: null, notes: null, employee: { id: 'demo-emp-002', name: 'Marc Pérez' }, createdAt: TODAY },
  { id: 'pref-10', employeeId: 'demo-emp-003', dayOfWeek: 'TUE', startTime: '14:00', endTime: '22:00', locationId: 'demo-loc-002', notes: 'Tardes', employee: { id: 'demo-emp-003', name: 'Sophie Gerber' }, createdAt: TODAY },
  { id: 'pref-11', employeeId: 'demo-emp-003', dayOfWeek: 'THU', startTime: '14:00', endTime: '22:00', locationId: 'demo-loc-003', notes: null, employee: { id: 'demo-emp-003', name: 'Sophie Gerber' }, createdAt: TODAY },
  { id: 'pref-12', employeeId: 'demo-emp-003', dayOfWeek: 'SAT', startTime: '10:00', endTime: '18:00', locationId: 'demo-loc-002', notes: null, employee: { id: 'demo-emp-003', name: 'Sophie Gerber' }, createdAt: TODAY },
  { id: 'pref-13', employeeId: 'demo-emp-003', dayOfWeek: 'SUN', startTime: '10:00', endTime: '16:00', locationId: 'demo-loc-003', notes: null, employee: { id: 'demo-emp-003', name: 'Sophie Gerber' }, createdAt: TODAY },
  { id: 'pref-14', employeeId: 'demo-emp-004', dayOfWeek: 'MON', startTime: '09:00', endTime: '17:00', locationId: 'demo-loc-002', notes: null, employee: { id: 'demo-emp-004', name: 'Lukas Zimmermann' }, createdAt: TODAY },
  { id: 'pref-15', employeeId: 'demo-emp-004', dayOfWeek: 'TUE', startTime: '09:00', endTime: '17:00', locationId: 'demo-loc-002', notes: null, employee: { id: 'demo-emp-004', name: 'Lukas Zimmermann' }, createdAt: TODAY },
  { id: 'pref-16', employeeId: 'demo-emp-004', dayOfWeek: 'WED', startTime: '09:00', endTime: '17:00', locationId: 'demo-loc-002', notes: null, employee: { id: 'demo-emp-004', name: 'Lukas Zimmermann' }, createdAt: TODAY },
  { id: 'pref-17', employeeId: 'demo-emp-004', dayOfWeek: 'THU', startTime: '09:00', endTime: '17:00', locationId: 'demo-loc-002', notes: null, employee: { id: 'demo-emp-004', name: 'Lukas Zimmermann' }, createdAt: TODAY },
  { id: 'pref-18', employeeId: 'demo-emp-004', dayOfWeek: 'FRI', startTime: '10:00', endTime: '18:00', locationId: 'demo-loc-002', notes: null, employee: { id: 'demo-emp-004', name: 'Lukas Zimmermann' }, createdAt: TODAY },
  { id: 'pref-19', employeeId: 'demo-emp-005', dayOfWeek: 'TUE', startTime: '10:00', endTime: '18:00', locationId: 'demo-loc-001', notes: null, employee: { id: 'demo-emp-005', name: 'Chiara Rossi' }, createdAt: TODAY },
  { id: 'pref-20', employeeId: 'demo-emp-005', dayOfWeek: 'THU', startTime: '10:00', endTime: '18:00', locationId: 'demo-loc-001', notes: null, employee: { id: 'demo-emp-005', name: 'Chiara Rossi' }, createdAt: TODAY },
  { id: 'pref-21', employeeId: 'demo-emp-005', dayOfWeek: 'SAT', startTime: '09:00', endTime: '17:00', locationId: 'demo-loc-001', notes: null, employee: { id: 'demo-emp-005', name: 'Chiara Rossi' }, createdAt: TODAY },
  { id: 'pref-22', employeeId: 'demo-emp-006', dayOfWeek: 'MON', startTime: '09:00', endTime: '17:00', locationId: 'demo-loc-001', notes: null, employee: { id: 'demo-emp-006', name: 'David Weber' }, createdAt: TODAY },
  { id: 'pref-23', employeeId: 'demo-emp-006', dayOfWeek: 'WED', startTime: '09:00', endTime: '17:00', locationId: 'demo-loc-001', notes: null, employee: { id: 'demo-emp-006', name: 'David Weber' }, createdAt: TODAY },
  { id: 'pref-24', employeeId: 'demo-emp-006', dayOfWeek: 'THU', startTime: '13:00', endTime: '21:00', locationId: 'demo-loc-002', notes: 'Dijous tarda Oerlikon', employee: { id: 'demo-emp-006', name: 'David Weber' }, createdAt: TODAY },
  { id: 'pref-25', employeeId: 'demo-emp-007', dayOfWeek: 'FRI', startTime: '10:00', endTime: '18:00', locationId: 'demo-loc-003', notes: null, employee: { id: 'demo-emp-007', name: 'Julia Fischer' }, createdAt: TODAY },
  { id: 'pref-26', employeeId: 'demo-emp-007', dayOfWeek: 'SAT', startTime: '09:00', endTime: '17:00', locationId: 'demo-loc-003', notes: null, employee: { id: 'demo-emp-007', name: 'Julia Fischer' }, createdAt: TODAY },
  { id: 'pref-27', employeeId: 'demo-emp-007', dayOfWeek: 'SUN', startTime: '10:00', endTime: '17:00', locationId: 'demo-loc-003', notes: null, employee: { id: 'demo-emp-007', name: 'Julia Fischer' }, createdAt: TODAY },
  { id: 'pref-28', employeeId: 'demo-emp-008', dayOfWeek: 'MON', startTime: '07:00', endTime: '15:00', locationId: 'demo-loc-002', notes: null, employee: { id: 'demo-emp-008', name: 'Nikos Papadopoulos' }, createdAt: TODAY },
  { id: 'pref-29', employeeId: 'demo-emp-008', dayOfWeek: 'TUE', startTime: '07:00', endTime: '15:00', locationId: 'demo-loc-002', notes: null, employee: { id: 'demo-emp-008', name: 'Nikos Papadopoulos' }, createdAt: TODAY },
  { id: 'pref-30', employeeId: 'demo-emp-008', dayOfWeek: 'WED', startTime: '07:00', endTime: '15:00', locationId: 'demo-loc-002', notes: null, employee: { id: 'demo-emp-008', name: 'Nikos Papadopoulos' }, createdAt: TODAY },
  { id: 'pref-31', employeeId: 'demo-emp-008', dayOfWeek: 'FRI', startTime: '07:00', endTime: '15:00', locationId: 'demo-loc-002', notes: null, employee: { id: 'demo-emp-008', name: 'Nikos Papadopoulos' }, createdAt: TODAY },
  { id: 'pref-32', employeeId: 'demo-emp-009', dayOfWeek: 'MON', startTime: '13:00', endTime: '21:00', locationId: 'demo-loc-001', notes: null, employee: { id: 'demo-emp-009', name: 'Léa Dubois' }, createdAt: TODAY },
  { id: 'pref-33', employeeId: 'demo-emp-009', dayOfWeek: 'TUE', startTime: '13:00', endTime: '21:00', locationId: 'demo-loc-001', notes: null, employee: { id: 'demo-emp-009', name: 'Léa Dubois' }, createdAt: TODAY },
  { id: 'pref-34', employeeId: 'demo-emp-009', dayOfWeek: 'WED', startTime: '08:00', endTime: '16:00', locationId: 'demo-loc-003', notes: 'Dimecres prefereixo Enge', employee: { id: 'demo-emp-009', name: 'Léa Dubois' }, createdAt: TODAY },
  { id: 'pref-35', employeeId: 'demo-emp-009', dayOfWeek: 'FRI', startTime: '15:00', endTime: '23:00', locationId: 'demo-loc-001', notes: null, employee: { id: 'demo-emp-009', name: 'Léa Dubois' }, createdAt: TODAY },
];

export { TODAY, MONDAY, addDays, fmt };
