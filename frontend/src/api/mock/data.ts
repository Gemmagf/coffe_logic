/**
 * Demo dataset for GitHub Pages (no backend): "Mosaik Kaffee",
 * a fictional specialty coffee business in Zürich. Mirrors backend/prisma/seed.ts.
 * Dates are generated relative to today so the demo always looks current.
 */
import type { Location, Employee, Schedule, Order, CashClosing, VacationRequest, ShiftPreference, Supplier } from '../../types';

const fmt = (d: Date) => { const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function mondayOf(d: Date): Date { return addDays(d, d.getDay() === 0 ? -6 : 1 - d.getDay()); }
const round2 = (n: number) => Math.round(n * 100) / 100;
const rnd = (seed: number) => { const x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); };

const now = new Date();
const TODAY = fmt(now);
const MONDAY = mondayOf(now);
const GROUP = 'demo-group-001';
const CREATED = '2024-01-15T08:00:00Z';
const LOC = { feld: 'demo-loc-001', bahn: 'demo-loc-002', lab: 'demo-loc-003' } as const;

export const LOCATIONS: Location[] = [
  { id: LOC.feld, name: 'Mosaik – Kreis 4',     address: 'Zweierstrasse 108, 8004 Zürich', timezone: 'Europe/Zurich', groupId: GROUP, createdAt: CREATED },
  { id: LOC.bahn, name: 'Mosaik – Limmatquai',  address: 'Limmatquai 42, 8001 Zürich',    timezone: 'Europe/Zurich', groupId: GROUP, createdAt: CREATED },
  { id: LOC.lab,  name: 'Mosaik – Rösterei',    address: 'Binzstrasse 12, 8045 Zürich',          timezone: 'Europe/Zurich', groupId: GROUP, createdAt: CREATED },
];
const LOCNAME = Object.fromEntries(LOCATIONS.map((l) => [l.id, l.name]));
const locRefs = (ids: string[]) => ids.map((locationId) => ({ locationId, location: { id: locationId, name: LOCNAME[locationId] } }));

export const EMPLOYEES: Employee[] = [
  { id: 'demo-emp-001', name: 'Elena Papadaki',  email: 'elena@mosaik-kaffee.ch',  phone: '+41 79 201 11 21', position: 'Head barista',      weeklyHours: 42, groupId: GROUP, createdAt: CREATED, locations: locRefs([LOC.feld, LOC.bahn]) },
  { id: 'demo-emp-002', name: 'Luca Brunner',    email: 'luca@mosaik-kaffee.ch',   phone: '+41 79 202 22 32', position: 'Barista',           weeklyHours: 40, groupId: GROUP, createdAt: CREATED, locations: locRefs([LOC.bahn]) },
  { id: 'demo-emp-003', name: 'Yannis Vlachos',  email: 'yannis@mosaik-kaffee.ch', phone: '+41 79 203 33 43', position: 'Roaster & barista', weeklyHours: 40, groupId: GROUP, createdAt: CREATED, locations: locRefs([LOC.lab, LOC.feld]) },
  { id: 'demo-emp-004', name: 'Mira Keller',     email: 'mira@mosaik-kaffee.ch',   phone: '+41 79 204 44 54', position: 'Barista',           weeklyHours: 32, groupId: GROUP, createdAt: CREATED, locations: locRefs([LOC.feld]) },
  { id: 'demo-emp-005', name: 'Tomás Ferreira',  email: 'tomas@mosaik-kaffee.ch',  phone: '+41 79 205 55 65', position: 'Barista',           weeklyHours: 40, groupId: GROUP, createdAt: CREATED, locations: locRefs([LOC.bahn, LOC.feld]) },
  { id: 'demo-emp-006', name: 'Sofia Andreou',   email: 'sofia@mosaik-kaffee.ch',  phone: '+41 79 206 66 76', position: 'Service & pastry',  weeklyHours: 24, groupId: GROUP, createdAt: CREATED, locations: locRefs([LOC.feld]) },
  { id: 'demo-emp-007', name: 'Jonas Hürlimann', email: 'jonas@mosaik-kaffee.ch',  phone: '+41 79 207 77 87', position: 'Barista (student)', weeklyHours: 20, groupId: GROUP, createdAt: CREATED, locations: locRefs([LOC.bahn]) },
  { id: 'demo-emp-008', name: 'Aylin Demir',     email: 'aylin@mosaik-kaffee.ch',  phone: '+41 79 208 88 98', position: 'Barista',           weeklyHours: 36, groupId: GROUP, createdAt: CREATED, locations: locRefs([LOC.feld, LOC.lab]) },
  { id: 'demo-emp-009', name: 'Noah Steiner',    email: 'noah@mosaik-kaffee.ch',   phone: '+41 79 209 99 09', position: 'Roastery assistant', weeklyHours: 30, groupId: GROUP, createdAt: CREATED, locations: locRefs([LOC.lab, LOC.bahn]) },
];
const EMPNAME = Object.fromEntries(EMPLOYEES.map((e) => [e.id, e.name]));

export const SUPPLIERS: Supplier[] = [
  { id: 'demo-sup-001', name: 'Rösterei Sihlfeld',   contact: 'Emi Hofer',  email: 'wholesale@sihlfeld-kaffee.ch',          phone: '+41 44 221 10 10', groupId: GROUP },
  { id: 'demo-sup-002', name: 'Kaffeewerk Zürich',   contact: 'Simon Roth',    email: 'orders@kaffeewerk.ch',           phone: '+41 44 221 20 20', groupId: GROUP },
  { id: 'demo-sup-003', name: 'Bergluft Roasters',         contact: 'Nina Berger',   email: 'hello@bergluft.ch',         phone: '+41 44 221 30 30', groupId: GROUP },
  { id: 'demo-sup-004', name: 'Bäckerei Morgenrot',             contact: 'Bakery orders', email: 'b2b@morgenrot.ch',               phone: '+41 44 221 40 40', groupId: GROUP },
  { id: 'demo-sup-005', name: 'Molkerei Seefeld',       contact: 'Ruedi Frei',    email: 'bestellung@molkerei-seefeld.ch', phone: '+41 44 221 50 50', groupId: GROUP },
  { id: 'demo-sup-006', name: 'Barista Supply Schweiz', contact: 'Karin Vogt',    email: 'sales@baristasupply.ch',         phone: '+41 44 221 60 60', groupId: GROUP },
];
const SUPNAME = Object.fromEntries(SUPPLIERS.map((s) => [s.id, s.name]));

// ─── Schedules ────────────────────────────────────────────────────────────────

type Slot = { e: string; l: string; s: string; end: string };
const WEEK: Slot[][] = [
  [ { e: 'demo-emp-001', l: LOC.feld, s: '07:30', end: '15:30' }, { e: 'demo-emp-004', l: LOC.feld, s: '10:30', end: '17:30' },
    { e: 'demo-emp-002', l: LOC.bahn, s: '07:30', end: '15:00' }, { e: 'demo-emp-005', l: LOC.bahn, s: '11:30', end: '19:00' } ],
  [ { e: 'demo-emp-001', l: LOC.feld, s: '07:30', end: '15:30' }, { e: 'demo-emp-008', l: LOC.feld, s: '10:30', end: '17:30' },
    { e: 'demo-emp-002', l: LOC.bahn, s: '07:30', end: '15:00' }, { e: 'demo-emp-005', l: LOC.bahn, s: '11:30', end: '19:00' } ],
  [ { e: 'demo-emp-003', l: LOC.feld, s: '07:30', end: '15:30' }, { e: 'demo-emp-004', l: LOC.feld, s: '10:30', end: '17:30' },
    { e: 'demo-emp-002', l: LOC.bahn, s: '07:30', end: '15:00' }, { e: 'demo-emp-009', l: LOC.bahn, s: '11:30', end: '19:00' } ],
  [ { e: 'demo-emp-001', l: LOC.feld, s: '07:30', end: '15:30' }, { e: 'demo-emp-008', l: LOC.feld, s: '10:30', end: '17:30' },
    { e: 'demo-emp-005', l: LOC.bahn, s: '07:30', end: '15:00' }, { e: 'demo-emp-002', l: LOC.bahn, s: '11:30', end: '19:00' },
    { e: 'demo-emp-003', l: LOC.lab,  s: '09:30', end: '17:00' } ],
  [ { e: 'demo-emp-001', l: LOC.feld, s: '07:30', end: '15:30' }, { e: 'demo-emp-004', l: LOC.feld, s: '10:30', end: '17:30' },
    { e: 'demo-emp-005', l: LOC.bahn, s: '07:30', end: '15:00' }, { e: 'demo-emp-007', l: LOC.bahn, s: '12:00', end: '19:00' },
    { e: 'demo-emp-003', l: LOC.lab,  s: '09:30', end: '17:00' }, { e: 'demo-emp-009', l: LOC.lab,  s: '09:30', end: '15:30' } ],
  [ { e: 'demo-emp-008', l: LOC.feld, s: '08:30', end: '16:30' }, { e: 'demo-emp-006', l: LOC.feld, s: '09:00', end: '15:00' }, { e: 'demo-emp-004', l: LOC.feld, s: '12:00', end: '18:30' },
    { e: 'demo-emp-002', l: LOC.bahn, s: '07:30', end: '15:00' }, { e: 'demo-emp-007', l: LOC.bahn, s: '11:30', end: '19:00' },
    { e: 'demo-emp-009', l: LOC.lab,  s: '10:00', end: '17:00' }, { e: 'demo-emp-003', l: LOC.lab,  s: '10:00', end: '14:00' } ],
  [ { e: 'demo-emp-008', l: LOC.feld, s: '08:30', end: '15:30' }, { e: 'demo-emp-006', l: LOC.feld, s: '09:00', end: '15:00' }, { e: 'demo-emp-005', l: LOC.feld, s: '12:00', end: '18:30' } ],
];

function buildSchedules(): Schedule[] {
  const out: Schedule[] = [];
  let n = 0;
  for (let w = -3; w <= 1; w++) {
    for (let d = 0; d < 7; d++) {
      const date = fmt(addDays(MONDAY, w * 7 + d));
      for (const slot of WEEK[d]) {
        if (w < 0 && rnd(w * 100 + d * 10 + slot.e.charCodeAt(9)) < 0.08) continue;
        if (w === 1 && d >= 4) continue; // next week only planned until Thursday
        n++;
        out.push({ id: `sch-${n}`, employeeId: slot.e, locationId: slot.l, date, startTime: slot.s, endTime: slot.end, notes: null,
          employee: { id: slot.e, name: EMPNAME[slot.e] }, location: { id: slot.l, name: LOCNAME[slot.l] }, createdAt: CREATED });
      }
    }
  }
  return out;
}
export const SCHEDULES: Schedule[] = buildSchedules();

// ─── Orders ───────────────────────────────────────────────────────────────────

const ORDER_DEFS = [
  { id: 'demo-ord-001', sup: 'demo-sup-001', loc: LOC.feld, status: 'RECEIVED', created: -16, delivery: -14, items: [{ productName: 'House espresso – Brazil/Colombia (1 kg)', quantity: 8, unit: 'kg', unitPrice: 38 }, { productName: 'Decaf Colombia EA (1 kg)', quantity: 2, unit: 'kg', unitPrice: 41 }], notes: 'Delivered by bike courier, no issues.' },
  { id: 'demo-ord-002', sup: 'demo-sup-004', loc: LOC.feld, status: 'RECEIVED', created: -15, delivery: -14, items: [{ productName: 'Butter croissant', quantity: 120, unit: 'u', unitPrice: 1.4 }, { productName: 'Cardamom bun', quantity: 60, unit: 'u', unitPrice: 2.2 }, { productName: 'Banana bread (loaf)', quantity: 6, unit: 'u', unitPrice: 12 }] },
  { id: 'demo-ord-003', sup: 'demo-sup-005', loc: LOC.bahn, status: 'RECEIVED', created: -13, delivery: -12, items: [{ productName: 'Whole milk 3.5% (1 L)', quantity: 96, unit: 'L', unitPrice: 1.95 }, { productName: 'Oat barista (1 L)', quantity: 36, unit: 'L', unitPrice: 2.6 }] },
  { id: 'demo-ord-004', sup: 'demo-sup-002', loc: LOC.feld, status: 'RECEIVED', created: -12, delivery: -10, items: [{ productName: 'Ethiopia Guji washed – filter (1 kg)', quantity: 3, unit: 'kg', unitPrice: 46 }, { productName: 'Kenya Kiambu AA – filter (250 g retail)', quantity: 24, unit: 'u', unitPrice: 14.5 }], notes: 'Guest roaster for the October filter menu.' },
  { id: 'demo-ord-005', sup: 'demo-sup-006', loc: LOC.bahn, status: 'RECEIVED', created: -11, delivery: -8, items: [{ productName: 'V60 02 filters (100)', quantity: 10, unit: 'pack', unitPrice: 9.5 }, { productName: 'Takeaway cups 8 oz (500)', quantity: 2, unit: 'box', unitPrice: 55 }, { productName: 'Cup lids 8 oz (500)', quantity: 2, unit: 'box', unitPrice: 28 }] },
  { id: 'demo-ord-006', sup: 'demo-sup-005', loc: LOC.feld, status: 'RECEIVED', created: -9, delivery: -8, items: [{ productName: 'Whole milk 3.5% (1 L)', quantity: 72, unit: 'L', unitPrice: 1.95 }, { productName: 'Oat barista (1 L)', quantity: 24, unit: 'L', unitPrice: 2.6 }] },
  { id: 'demo-ord-007', sup: 'demo-sup-004', loc: LOC.bahn, status: 'RECEIVED', created: -8, delivery: -7, items: [{ productName: 'Butter croissant', quantity: 100, unit: 'u', unitPrice: 1.4 }, { productName: 'Cinnamon bun', quantity: 50, unit: 'u', unitPrice: 2.2 }, { productName: 'Cookies (choc chip)', quantity: 60, unit: 'u', unitPrice: 1.1 }] },
  { id: 'demo-ord-008', sup: 'demo-sup-001', loc: LOC.bahn, status: 'SENT', created: -2, delivery: 1, items: [{ productName: 'House espresso – Brazil/Colombia (1 kg)', quantity: 10, unit: 'kg', unitPrice: 38 }, { productName: 'Decaf Colombia EA (1 kg)', quantity: 2, unit: 'kg', unitPrice: 41 }], notes: 'Please deliver before 9:00, the passage is closed later.' },
  { id: 'demo-ord-009', sup: 'demo-sup-003', loc: LOC.lab, status: 'SENT', created: -2, delivery: 2, items: [{ productName: 'Green coffee – Colombia Huila (30 kg)', quantity: 2, unit: 'box', unitPrice: 310 }, { productName: 'Green coffee – Ethiopia Sidamo (30 kg)', quantity: 1, unit: 'box', unitPrice: 365 }], notes: 'Sample roast for the tasting menu.' },
  { id: 'demo-ord-010', sup: 'demo-sup-004', loc: LOC.feld, status: 'SENT', created: -1, delivery: 1, items: [{ productName: 'Butter croissant', quantity: 120, unit: 'u', unitPrice: 1.4 }, { productName: 'Cardamom bun', quantity: 60, unit: 'u', unitPrice: 2.2 }, { productName: 'Espresso bun (weekend)', quantity: 40, unit: 'u', unitPrice: 2.4 }, { productName: 'NY cheesecake (whole)', quantity: 2, unit: 'u', unitPrice: 38 }], notes: 'Weekend buns for Saturday morning.' },
  { id: 'demo-ord-011', sup: 'demo-sup-006', loc: LOC.feld, status: 'DRAFT', created: 0, items: [{ productName: 'Matcha ceremonial (100 g)', quantity: 4, unit: 'u', unitPrice: 32 }, { productName: 'Origami dripper filters (100)', quantity: 6, unit: 'pack', unitPrice: 11 }], notes: 'Check stock in the back room before sending.' },
  { id: 'demo-ord-012', sup: 'demo-sup-002', loc: LOC.bahn, status: 'DRAFT', created: 0, items: [{ productName: 'Kenya Kiambu AA – filter (250 g retail)', quantity: 36, unit: 'u', unitPrice: 14.5 }, { productName: 'Retail bags & labels', quantity: 1, unit: 'box', unitPrice: 42 }] },
] as const;

export const ORDERS: Order[] = ORDER_DEFS.map((o) => {
  const createdAt = addDays(now, o.created); createdAt.setHours(9, 30, 0, 0);
  return {
    id: o.id, supplierId: o.sup, locationId: o.loc, status: o.status, items: [...o.items], notes: 'notes' in o ? o.notes : null,
    deliveryAt: 'delivery' in o ? fmt(addDays(now, o.delivery)) : null, createdAt: createdAt.toISOString(),
    supplier: { id: o.sup, name: SUPNAME[o.sup] }, location: { id: o.loc, name: LOCNAME[o.loc] },
  };
});

// ─── Cash closings: last 8 weeks ──────────────────────────────────────────────

function salesFor(locId: string, d: Date, dOff: number): { sales: number; cardRatio: number; expenses: number } | null {
  const dow = d.getDay();
  const seed = Math.abs(dOff * 7 + locId.charCodeAt(9) * 13);
  const noise = 0.88 + rnd(seed) * 0.24;
  if (locId === LOC.feld) {
    const base = dow === 0 || dow === 6 ? 2150 : dow === 5 ? 1650 : 1450;
    return { sales: round2(base * noise), cardRatio: 0.78 + rnd(seed + 1) * 0.1, expenses: dow === 6 ? 45 : 18 + Math.round(rnd(seed + 2) * 20) };
  }
  if (locId === LOC.bahn) {
    if (dow === 0) return null;
    const base = dow === 6 ? 2650 : 2300;
    return { sales: round2(base * noise), cardRatio: 0.84 + rnd(seed + 1) * 0.08, expenses: 12 + Math.round(rnd(seed + 2) * 15) };
  }
  if (dow < 4) return null;
  const base = dow === 6 ? 1150 : 780;
  return { sales: round2(base * noise), cardRatio: 0.7 + rnd(seed + 1) * 0.1, expenses: 30 + Math.round(rnd(seed + 2) * 40) };
}

function buildClosings(): CashClosing[] {
  const out: CashClosing[] = [];
  let n = 0;
  for (let dOff = -55; dOff <= 0; dOff++) {
    const d = addDays(now, dOff);
    for (const loc of LOCATIONS) {
      const s = salesFor(loc.id, d, dOff);
      if (!s) continue;
      const cardSales = round2(s.sales * s.cardRatio);
      const cashSales = round2(s.sales - cardSales);
      const r = rnd(dOff * 3 + loc.id.charCodeAt(9));
      const discrepancy = r < 0.12 ? -5 : r < 0.2 ? 2 : 0;
      const closingAmount = round2(250 + cashSales - s.expenses + discrepancy);
      const notes = dOff === -6 && loc.id === LOC.feld ? 'Card terminal offline 14:00–15:00, some sales taken in cash.'
        : dOff === -2 && loc.id === LOC.bahn ? 'Cupping event in the evening, +30 covers.'
        : dOff === -13 && loc.id === LOC.lab ? 'Retail bag sales strong after the newspaper feature.' : null;
      n++;
      out.push({ id: `cc-${n}`, locationId: loc.id, date: fmt(d), openingAmount: 250, closingAmount, sales: s.sales, cardSales, cashSales, expenses: s.expenses, notes,
        location: { id: loc.id, name: loc.name }, createdAt: fmt(d) + 'T18:30:00Z' });
    }
  }
  return out;
}
export const CASH_CLOSINGS: CashClosing[] = buildClosings();

// ─── Vacations & preferences ──────────────────────────────────────────────────

const VAC_DEFS = [
  { employeeId: 'demo-emp-001', from: 21, to: 28, reason: 'Trip home to Crete', status: 'PENDING', managerNote: null },
  { employeeId: 'demo-emp-002', from: 5, to: 7, reason: 'Long weekend in Ticino', status: 'APPROVED', managerNote: 'Approved – Tomás covers Limmatquai.' },
  { employeeId: 'demo-emp-004', from: 12, to: 12, reason: 'Medical appointment', status: 'APPROVED', managerNote: 'OK, half day is fine too.' },
  { employeeId: 'demo-emp-007', from: 35, to: 49, reason: 'University exams', status: 'PENDING', managerNote: null },
  { employeeId: 'demo-emp-005', from: 2, to: 3, reason: 'Concert in Milan', status: 'REJECTED', managerNote: 'Weekend before the tasting event – can we find another date?' },
  { employeeId: 'demo-emp-008', from: 16, to: 18, reason: 'Family visit', status: 'APPROVED', managerNote: 'Approved.' },
] as const;
export const VACATIONS: VacationRequest[] = VAC_DEFS.map((v, i) => ({
  id: `vac-${i + 1}`, employeeId: v.employeeId, fromDate: fmt(addDays(now, v.from)), toDate: fmt(addDays(now, v.to)), reason: v.reason, status: v.status, managerNote: v.managerNote,
  employee: { id: v.employeeId, name: EMPNAME[v.employeeId] }, createdAt: TODAY,
}));

const PREF_DEFS = [
  { e: 'demo-emp-001', day: 'MON', s: '07:30', end: '15:30', l: LOC.feld, notes: 'Opening shifts at Kreis 4' },
  { e: 'demo-emp-001', day: 'TUE', s: '07:30', end: '15:30', l: LOC.feld, notes: null },
  { e: 'demo-emp-001', day: 'THU', s: '07:30', end: '15:30', l: LOC.feld, notes: null },
  { e: 'demo-emp-001', day: 'FRI', s: '07:30', end: '15:30', l: LOC.feld, notes: null },
  { e: 'demo-emp-002', day: 'MON', s: '07:30', end: '15:00', l: LOC.bahn, notes: null },
  { e: 'demo-emp-002', day: 'TUE', s: '07:30', end: '15:00', l: LOC.bahn, notes: null },
  { e: 'demo-emp-002', day: 'WED', s: '07:30', end: '15:00', l: LOC.bahn, notes: null },
  { e: 'demo-emp-002', day: 'SAT', s: '07:30', end: '15:00', l: LOC.bahn, notes: 'Saturday mornings OK' },
  { e: 'demo-emp-003', day: 'THU', s: '09:30', end: '17:00', l: LOC.lab, notes: 'Roast days' },
  { e: 'demo-emp-003', day: 'FRI', s: '09:30', end: '17:00', l: LOC.lab, notes: null },
  { e: 'demo-emp-003', day: 'WED', s: '07:30', end: '15:30', l: LOC.feld, notes: null },
  { e: 'demo-emp-004', day: 'MON', s: '10:30', end: '17:30', l: LOC.feld, notes: null },
  { e: 'demo-emp-004', day: 'WED', s: '10:30', end: '17:30', l: LOC.feld, notes: null },
  { e: 'demo-emp-004', day: 'FRI', s: '10:30', end: '17:30', l: LOC.feld, notes: 'No Sundays please' },
  { e: 'demo-emp-005', day: 'MON', s: '11:30', end: '19:00', l: LOC.bahn, notes: null },
  { e: 'demo-emp-005', day: 'TUE', s: '11:30', end: '19:00', l: LOC.bahn, notes: null },
  { e: 'demo-emp-005', day: 'THU', s: '07:30', end: '15:00', l: LOC.bahn, notes: null },
  { e: 'demo-emp-005', day: 'SUN', s: '12:00', end: '18:30', l: LOC.feld, notes: null },
  { e: 'demo-emp-006', day: 'SAT', s: '09:00', end: '15:00', l: LOC.feld, notes: 'Weekends only' },
  { e: 'demo-emp-006', day: 'SUN', s: '09:00', end: '15:00', l: LOC.feld, notes: null },
  { e: 'demo-emp-007', day: 'FRI', s: '12:00', end: '19:00', l: LOC.bahn, notes: 'After lectures' },
  { e: 'demo-emp-007', day: 'SAT', s: '11:30', end: '19:00', l: LOC.bahn, notes: null },
  { e: 'demo-emp-008', day: 'TUE', s: '10:30', end: '17:30', l: LOC.feld, notes: null },
  { e: 'demo-emp-008', day: 'THU', s: '10:30', end: '17:30', l: LOC.feld, notes: null },
  { e: 'demo-emp-008', day: 'SAT', s: '08:30', end: '16:30', l: LOC.feld, notes: null },
  { e: 'demo-emp-008', day: 'SUN', s: '08:30', end: '15:30', l: LOC.feld, notes: null },
  { e: 'demo-emp-009', day: 'WED', s: '11:30', end: '19:00', l: LOC.bahn, notes: null },
  { e: 'demo-emp-009', day: 'FRI', s: '09:30', end: '15:30', l: LOC.lab, notes: null },
  { e: 'demo-emp-009', day: 'SAT', s: '10:00', end: '17:00', l: LOC.lab, notes: 'Cupping sessions' },
] as const;
export const PREFERENCES: ShiftPreference[] = PREF_DEFS.map((p, i) => ({
  id: `pref-${i + 1}`, employeeId: p.e, dayOfWeek: p.day, startTime: p.s, endTime: p.end, locationId: p.l, notes: p.notes,
  employee: { id: p.e, name: EMPNAME[p.e] }, createdAt: TODAY,
}));

export { TODAY, MONDAY, addDays, fmt };
