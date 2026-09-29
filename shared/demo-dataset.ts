/**
 * Demo datasets, shared by the serverless demo (GitHub Pages) and the
 * backend seed. Two profiles:
 *   - "mosaik":     public demo, fictional café with three locations.
 *   - "commercial": private access for a real specialty-coffee owner in
 *                   Zürich, sized for max two people per location at peak.
 * Every date is relative to "today" so the data always looks current.
 * No runtime imports: this file must compile both in Vite and in ts-node.
 */

export type Profile = 'mosaik' | 'commercial';
export type DayCode = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export interface DsLocation { id: string; name: string; address: string }
export interface DsEmployee { id: string; name: string; email: string; phone: string; position: string; weeklyHours: number | null; locations: string[] }
export interface DsSupplier { id: string; name: string; contact: string; email: string; phone: string }
export interface DsSlot { e: string; l: string; s: string; end: string }
export interface DsItem { productName: string; quantity: number; unit: string; unitPrice: number }
export interface DsOrder { id: string; sup: string; loc: string; status: 'DRAFT' | 'SENT' | 'RECEIVED'; created: number; delivery?: number; items: DsItem[]; notes?: string }
export interface DsVacation { employeeId: string; from: number; to: number; reason: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; managerNote: string | null }
export interface DsPreference { e: string; day: DayCode; s: string; end: string; l: string | null; notes: string | null }
export interface DsUser { id: string; username: string; email: string; password: string; role: 'OWNER' | 'MANAGER' }
export interface DsSales { sales: number; cardRatio: number; expenses: number }

export interface DatasetDef {
  profile: Profile;
  group: { id: string; name: string; plan: 'SOLO' | 'MULTI' | 'MULTI_PLUS' };
  users: DsUser[];
  locations: DsLocation[];
  employees: DsEmployee[];
  suppliers: DsSupplier[];
  /** Weekly pattern, Monday first. */
  week: DsSlot[][];
  /** Which weekdays of next week are already planned (0 = Monday). Others are left empty to show coverage gaps. */
  nextWeekPlannedDays: number;
  orders: DsOrder[];
  salesFor: (locId: string, dow: number, seed: number, noise: number) => DsSales | null;
  closingNotes: (locId: string, dOff: number) => string | null;
  vacations: DsVacation[];
  preferences: DsPreference[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const fmt = (d: Date) => { const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
export const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
export const mondayOf = (d: Date) => addDays(d, d.getDay() === 0 ? -6 : 1 - d.getDay());
export const round2 = (n: number) => Math.round(n * 100) / 100;
/** Deterministic pseudo-random in [0,1). */
export const rnd = (seed: number) => { const x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); };

// ─── Profile: Mosaik Kaffee (public demo, fictional) ──────────────────────────

const M = { feld: 'demo-loc-001', bahn: 'demo-loc-002', lab: 'demo-loc-003' } as const;

export const MOSAIK: DatasetDef = {
  profile: 'mosaik',
  group: { id: 'demo-group-001', name: 'Mosaik Kaffee', plan: 'MULTI' },
  users: [
    { id: 'demo-user-001', username: 'demo', email: 'demo@mosaik-kaffee.ch', password: 'demo1234', role: 'OWNER' },
    { id: 'demo-user-002', username: 'elena', email: 'elena@mosaik-kaffee.ch', password: 'demo1234', role: 'MANAGER' },
  ],
  locations: [
    { id: M.feld, name: 'Mosaik – Kreis 4', address: 'Zweierstrasse 108, 8004 Zürich' },
    { id: M.bahn, name: 'Mosaik – Limmatquai', address: 'Limmatquai 42, 8001 Zürich' },
    { id: M.lab, name: 'Mosaik – Rösterei', address: 'Binzstrasse 12, 8045 Zürich' },
  ],
  employees: [
    { id: 'demo-emp-001', name: 'Elena Papadaki',  email: 'elena@mosaik-kaffee.ch',  phone: '+41 79 201 11 21', position: 'Head barista',      weeklyHours: 42, locations: [M.feld, M.bahn] },
    { id: 'demo-emp-002', name: 'Luca Brunner',    email: 'luca@mosaik-kaffee.ch',   phone: '+41 79 202 22 32', position: 'Barista',           weeklyHours: 40, locations: [M.bahn] },
    { id: 'demo-emp-003', name: 'Yannis Vlachos',  email: 'yannis@mosaik-kaffee.ch', phone: '+41 79 203 33 43', position: 'Roaster & barista', weeklyHours: 40, locations: [M.lab, M.feld] },
    { id: 'demo-emp-004', name: 'Mira Keller',     email: 'mira@mosaik-kaffee.ch',   phone: '+41 79 204 44 54', position: 'Barista',           weeklyHours: 32, locations: [M.feld] },
    { id: 'demo-emp-005', name: 'Tomás Ferreira',  email: 'tomas@mosaik-kaffee.ch',  phone: '+41 79 205 55 65', position: 'Barista',           weeklyHours: 40, locations: [M.bahn, M.feld] },
    { id: 'demo-emp-006', name: 'Sofia Andreou',   email: 'sofia@mosaik-kaffee.ch',  phone: '+41 79 206 66 76', position: 'Service & pastry',  weeklyHours: 24, locations: [M.feld] },
    { id: 'demo-emp-007', name: 'Jonas Hürlimann', email: 'jonas@mosaik-kaffee.ch',  phone: '+41 79 207 77 87', position: 'Barista (student)', weeklyHours: 20, locations: [M.bahn] },
    { id: 'demo-emp-008', name: 'Aylin Demir',     email: 'aylin@mosaik-kaffee.ch',  phone: '+41 79 208 88 98', position: 'Barista',           weeklyHours: 36, locations: [M.feld, M.lab] },
    { id: 'demo-emp-009', name: 'Noah Steiner',    email: 'noah@mosaik-kaffee.ch',   phone: '+41 79 209 99 09', position: 'Roastery assistant', weeklyHours: 30, locations: [M.lab, M.bahn] },
  ],
  suppliers: [
    { id: 'demo-sup-001', name: 'Rösterei Sihlfeld',     contact: 'Emi Hofer',      email: 'wholesale@sihlfeld-kaffee.ch',   phone: '+41 44 221 10 10' },
    { id: 'demo-sup-002', name: 'Kaffeewerk Zürich',     contact: 'Simon Roth',     email: 'orders@kaffeewerk.ch',           phone: '+41 44 221 20 20' },
    { id: 'demo-sup-003', name: 'Bergluft Roasters',     contact: 'Nina Berger',    email: 'hello@bergluft.ch',              phone: '+41 44 221 30 30' },
    { id: 'demo-sup-004', name: 'Bäckerei Morgenrot',    contact: 'Bakery orders',  email: 'b2b@morgenrot.ch',               phone: '+41 44 221 40 40' },
    { id: 'demo-sup-005', name: 'Molkerei Seefeld',      contact: 'Ruedi Frei',     email: 'bestellung@molkerei-seefeld.ch', phone: '+41 44 221 50 50' },
    { id: 'demo-sup-006', name: 'Barista Supply Schweiz', contact: 'Karin Vogt',    email: 'sales@baristasupply.ch',         phone: '+41 44 221 60 60' },
  ],
  week: [
    [ { e: 'demo-emp-001', l: M.feld, s: '07:30', end: '15:30' }, { e: 'demo-emp-004', l: M.feld, s: '10:30', end: '17:30' },
      { e: 'demo-emp-002', l: M.bahn, s: '07:30', end: '15:00' }, { e: 'demo-emp-005', l: M.bahn, s: '11:30', end: '19:00' } ],
    [ { e: 'demo-emp-001', l: M.feld, s: '07:30', end: '15:30' }, { e: 'demo-emp-008', l: M.feld, s: '10:30', end: '17:30' },
      { e: 'demo-emp-002', l: M.bahn, s: '07:30', end: '15:00' }, { e: 'demo-emp-005', l: M.bahn, s: '11:30', end: '19:00' } ],
    [ { e: 'demo-emp-003', l: M.feld, s: '07:30', end: '15:30' }, { e: 'demo-emp-004', l: M.feld, s: '10:30', end: '17:30' },
      { e: 'demo-emp-002', l: M.bahn, s: '07:30', end: '15:00' }, { e: 'demo-emp-009', l: M.bahn, s: '11:30', end: '19:00' } ],
    [ { e: 'demo-emp-001', l: M.feld, s: '07:30', end: '15:30' }, { e: 'demo-emp-008', l: M.feld, s: '10:30', end: '17:30' },
      { e: 'demo-emp-005', l: M.bahn, s: '07:30', end: '15:00' }, { e: 'demo-emp-002', l: M.bahn, s: '11:30', end: '19:00' },
      { e: 'demo-emp-003', l: M.lab,  s: '09:30', end: '17:00' } ],
    [ { e: 'demo-emp-001', l: M.feld, s: '07:30', end: '15:30' }, { e: 'demo-emp-004', l: M.feld, s: '10:30', end: '17:30' },
      { e: 'demo-emp-005', l: M.bahn, s: '07:30', end: '15:00' }, { e: 'demo-emp-007', l: M.bahn, s: '12:00', end: '19:00' },
      { e: 'demo-emp-003', l: M.lab,  s: '09:30', end: '17:00' }, { e: 'demo-emp-009', l: M.lab,  s: '09:30', end: '15:30' } ],
    [ { e: 'demo-emp-008', l: M.feld, s: '08:30', end: '16:30' }, { e: 'demo-emp-006', l: M.feld, s: '09:00', end: '15:00' }, { e: 'demo-emp-004', l: M.feld, s: '12:00', end: '18:30' },
      { e: 'demo-emp-002', l: M.bahn, s: '07:30', end: '15:00' }, { e: 'demo-emp-007', l: M.bahn, s: '11:30', end: '19:00' },
      { e: 'demo-emp-009', l: M.lab,  s: '10:00', end: '17:00' }, { e: 'demo-emp-003', l: M.lab,  s: '10:00', end: '14:00' } ],
    [ { e: 'demo-emp-008', l: M.feld, s: '08:30', end: '15:30' }, { e: 'demo-emp-006', l: M.feld, s: '09:00', end: '15:00' }, { e: 'demo-emp-005', l: M.feld, s: '12:00', end: '18:30' } ],
  ],
  nextWeekPlannedDays: 4,
  orders: [
    { id: 'demo-ord-001', sup: 'demo-sup-001', loc: M.feld, status: 'RECEIVED', created: -16, delivery: -14, items: [{ productName: 'House espresso – Brazil/Colombia (1 kg)', quantity: 8, unit: 'kg', unitPrice: 38 }, { productName: 'Decaf Colombia EA (1 kg)', quantity: 2, unit: 'kg', unitPrice: 41 }], notes: 'Delivered by bike courier, no issues.' },
    { id: 'demo-ord-002', sup: 'demo-sup-004', loc: M.feld, status: 'RECEIVED', created: -15, delivery: -14, items: [{ productName: 'Butter croissant', quantity: 120, unit: 'u', unitPrice: 1.4 }, { productName: 'Cardamom bun', quantity: 60, unit: 'u', unitPrice: 2.2 }, { productName: 'Banana bread (loaf)', quantity: 6, unit: 'u', unitPrice: 12 }] },
    { id: 'demo-ord-003', sup: 'demo-sup-005', loc: M.bahn, status: 'RECEIVED', created: -13, delivery: -12, items: [{ productName: 'Whole milk 3.5% (1 L)', quantity: 96, unit: 'L', unitPrice: 1.95 }, { productName: 'Oat barista (1 L)', quantity: 36, unit: 'L', unitPrice: 2.6 }] },
    { id: 'demo-ord-004', sup: 'demo-sup-002', loc: M.feld, status: 'RECEIVED', created: -12, delivery: -10, items: [{ productName: 'Ethiopia Guji washed – filter (1 kg)', quantity: 3, unit: 'kg', unitPrice: 46 }, { productName: 'Kenya Kiambu AA – filter (250 g retail)', quantity: 24, unit: 'u', unitPrice: 14.5 }], notes: 'Guest roaster for the October filter menu.' },
    { id: 'demo-ord-005', sup: 'demo-sup-006', loc: M.bahn, status: 'RECEIVED', created: -11, delivery: -8, items: [{ productName: 'V60 02 filters (100)', quantity: 10, unit: 'pack', unitPrice: 9.5 }, { productName: 'Takeaway cups 8 oz (500)', quantity: 2, unit: 'box', unitPrice: 55 }, { productName: 'Cup lids 8 oz (500)', quantity: 2, unit: 'box', unitPrice: 28 }] },
    { id: 'demo-ord-006', sup: 'demo-sup-005', loc: M.feld, status: 'RECEIVED', created: -9, delivery: -8, items: [{ productName: 'Whole milk 3.5% (1 L)', quantity: 72, unit: 'L', unitPrice: 1.95 }, { productName: 'Oat barista (1 L)', quantity: 24, unit: 'L', unitPrice: 2.6 }] },
    { id: 'demo-ord-007', sup: 'demo-sup-004', loc: M.bahn, status: 'RECEIVED', created: -8, delivery: -7, items: [{ productName: 'Butter croissant', quantity: 100, unit: 'u', unitPrice: 1.4 }, { productName: 'Cinnamon bun', quantity: 50, unit: 'u', unitPrice: 2.2 }, { productName: 'Cookies (choc chip)', quantity: 60, unit: 'u', unitPrice: 1.1 }] },
    { id: 'demo-ord-008', sup: 'demo-sup-001', loc: M.bahn, status: 'SENT', created: -2, delivery: 1, items: [{ productName: 'House espresso – Brazil/Colombia (1 kg)', quantity: 10, unit: 'kg', unitPrice: 38 }, { productName: 'Decaf Colombia EA (1 kg)', quantity: 2, unit: 'kg', unitPrice: 41 }], notes: 'Please deliver before 9:00, the passage is closed later.' },
    { id: 'demo-ord-009', sup: 'demo-sup-003', loc: M.lab, status: 'SENT', created: -2, delivery: 2, items: [{ productName: 'Green coffee – Colombia Huila (30 kg)', quantity: 2, unit: 'box', unitPrice: 310 }, { productName: 'Green coffee – Ethiopia Sidamo (30 kg)', quantity: 1, unit: 'box', unitPrice: 365 }], notes: 'Sample roast for the tasting menu.' },
    { id: 'demo-ord-010', sup: 'demo-sup-004', loc: M.feld, status: 'SENT', created: -1, delivery: 1, items: [{ productName: 'Butter croissant', quantity: 120, unit: 'u', unitPrice: 1.4 }, { productName: 'Cardamom bun', quantity: 60, unit: 'u', unitPrice: 2.2 }, { productName: 'Espresso bun (weekend)', quantity: 40, unit: 'u', unitPrice: 2.4 }, { productName: 'NY cheesecake (whole)', quantity: 2, unit: 'u', unitPrice: 38 }], notes: 'Weekend buns for Saturday morning.' },
    { id: 'demo-ord-011', sup: 'demo-sup-006', loc: M.feld, status: 'DRAFT', created: 0, items: [{ productName: 'Matcha ceremonial (100 g)', quantity: 4, unit: 'u', unitPrice: 32 }, { productName: 'Origami dripper filters (100)', quantity: 6, unit: 'pack', unitPrice: 11 }], notes: 'Check stock in the back room before sending.' },
    { id: 'demo-ord-012', sup: 'demo-sup-002', loc: M.bahn, status: 'DRAFT', created: 0, items: [{ productName: 'Kenya Kiambu AA – filter (250 g retail)', quantity: 36, unit: 'u', unitPrice: 14.5 }, { productName: 'Retail bags & labels', quantity: 1, unit: 'box', unitPrice: 42 }] },
  ],
  salesFor: (locId, dow, seed, noise) => {
    if (locId === M.feld) {
      const base = dow === 0 || dow === 6 ? 2150 : dow === 5 ? 1650 : 1450;
      return { sales: round2(base * noise), cardRatio: 0.78 + rnd(seed + 1) * 0.1, expenses: dow === 6 ? 45 : 18 + Math.round(rnd(seed + 2) * 20) };
    }
    if (locId === M.bahn) {
      if (dow === 0) return null;
      const base = dow === 6 ? 2650 : 2300;
      return { sales: round2(base * noise), cardRatio: 0.84 + rnd(seed + 1) * 0.08, expenses: 12 + Math.round(rnd(seed + 2) * 15) };
    }
    if (dow < 4) return null; // Rösterei: Thu–Sat
    const base = dow === 6 ? 1150 : 780;
    return { sales: round2(base * noise), cardRatio: 0.7 + rnd(seed + 1) * 0.1, expenses: 30 + Math.round(rnd(seed + 2) * 40) };
  },
  closingNotes: (locId, dOff) =>
    dOff === -6 && locId === M.feld ? 'Card terminal offline 14:00–15:00, some sales taken in cash.'
    : dOff === -2 && locId === M.bahn ? 'Cupping event in the evening, +30 covers.'
    : dOff === -13 && locId === M.lab ? 'Retail bag sales strong after the newspaper feature.' : null,
  vacations: [
    { employeeId: 'demo-emp-001', from: 21, to: 28, reason: 'Trip home to Crete', status: 'PENDING', managerNote: null },
    { employeeId: 'demo-emp-002', from: 5, to: 7, reason: 'Long weekend in Ticino', status: 'APPROVED', managerNote: 'Approved – Tomás covers Limmatquai.' },
    { employeeId: 'demo-emp-004', from: 12, to: 12, reason: 'Medical appointment', status: 'APPROVED', managerNote: 'OK, half day is fine too.' },
    { employeeId: 'demo-emp-007', from: 35, to: 49, reason: 'University exams', status: 'PENDING', managerNote: null },
    { employeeId: 'demo-emp-005', from: 2, to: 3, reason: 'Concert in Milan', status: 'REJECTED', managerNote: 'Weekend before the tasting event – can we find another date?' },
    { employeeId: 'demo-emp-008', from: 16, to: 18, reason: 'Family visit', status: 'APPROVED', managerNote: 'Approved.' },
  ],
  preferences: [
    { e: 'demo-emp-001', day: 'MON', s: '07:30', end: '15:30', l: M.feld, notes: 'Opening shifts at Kreis 4' },
    { e: 'demo-emp-001', day: 'TUE', s: '07:30', end: '15:30', l: M.feld, notes: null },
    { e: 'demo-emp-001', day: 'THU', s: '07:30', end: '15:30', l: M.feld, notes: null },
    { e: 'demo-emp-001', day: 'FRI', s: '07:30', end: '15:30', l: M.feld, notes: null },
    { e: 'demo-emp-002', day: 'MON', s: '07:30', end: '15:00', l: M.bahn, notes: null },
    { e: 'demo-emp-002', day: 'TUE', s: '07:30', end: '15:00', l: M.bahn, notes: null },
    { e: 'demo-emp-002', day: 'WED', s: '07:30', end: '15:00', l: M.bahn, notes: null },
    { e: 'demo-emp-002', day: 'SAT', s: '07:30', end: '15:00', l: M.bahn, notes: 'Saturday mornings OK' },
    { e: 'demo-emp-003', day: 'THU', s: '09:30', end: '17:00', l: M.lab, notes: 'Roast days' },
    { e: 'demo-emp-003', day: 'FRI', s: '09:30', end: '17:00', l: M.lab, notes: null },
    { e: 'demo-emp-003', day: 'WED', s: '07:30', end: '15:30', l: M.feld, notes: null },
    { e: 'demo-emp-004', day: 'MON', s: '10:30', end: '17:30', l: M.feld, notes: null },
    { e: 'demo-emp-004', day: 'WED', s: '10:30', end: '17:30', l: M.feld, notes: null },
    { e: 'demo-emp-004', day: 'FRI', s: '10:30', end: '17:30', l: M.feld, notes: 'No Sundays please' },
    { e: 'demo-emp-005', day: 'MON', s: '11:30', end: '19:00', l: M.bahn, notes: null },
    { e: 'demo-emp-005', day: 'TUE', s: '11:30', end: '19:00', l: M.bahn, notes: null },
    { e: 'demo-emp-005', day: 'THU', s: '07:30', end: '15:00', l: M.bahn, notes: null },
    { e: 'demo-emp-005', day: 'SUN', s: '12:00', end: '18:30', l: M.feld, notes: null },
    { e: 'demo-emp-006', day: 'SAT', s: '09:00', end: '15:00', l: M.feld, notes: 'Weekends only' },
    { e: 'demo-emp-006', day: 'SUN', s: '09:00', end: '15:00', l: M.feld, notes: null },
    { e: 'demo-emp-007', day: 'FRI', s: '12:00', end: '19:00', l: M.bahn, notes: 'After lectures' },
    { e: 'demo-emp-007', day: 'SAT', s: '11:30', end: '19:00', l: M.bahn, notes: null },
    { e: 'demo-emp-008', day: 'TUE', s: '10:30', end: '17:30', l: M.feld, notes: null },
    { e: 'demo-emp-008', day: 'THU', s: '10:30', end: '17:30', l: M.feld, notes: null },
    { e: 'demo-emp-008', day: 'SAT', s: '08:30', end: '16:30', l: M.feld, notes: null },
    { e: 'demo-emp-008', day: 'SUN', s: '08:30', end: '15:30', l: M.feld, notes: null },
    { e: 'demo-emp-009', day: 'WED', s: '11:30', end: '19:00', l: M.bahn, notes: null },
    { e: 'demo-emp-009', day: 'FRI', s: '09:30', end: '15:30', l: M.lab, notes: null },
    { e: 'demo-emp-009', day: 'SAT', s: '10:00', end: '17:00', l: M.lab, notes: 'Cupping sessions' },
  ],
};

// ─── Profile: Commercial – The Project (private access) ───────────────────────
// Two bars in Zürich: Feldstrasse 61 (Kreis 4, Mon–Fri 8–17, Sat–Sun 9–18) and
// Bahnhofstrasse 75/79 (Mon–Sat 8–18:30). Peak staffing: two people per bar
// (an opener and a closer overlapping around the lunch rush). Multi-roaster
// bar: MAME, Rose and Balloon; V60 / Origami / AeroPress hand brews; weekend
// buns from a partner bakery; cheesecake; matcha.

const C = { feld: 'ctp-loc-001', bahn: 'ctp-loc-002' } as const;

export const COMMERCIAL: DatasetDef = {
  profile: 'commercial',
  group: { id: 'ctp-group-001', name: 'Commercial – The Project', plan: 'MULTI' },
  users: [
    { id: 'ctp-user-001', username: 'thecommercialproject', email: 'nick@commercial-theproject.ch', password: 'Nikos', role: 'MANAGER' },
  ],
  locations: [
    { id: C.feld, name: 'Commercial – Feldstrasse', address: 'Feldstrasse 61, 8004 Zürich (Kreis 4)' },
    { id: C.bahn, name: 'Commercial – Bahnhofstrasse', address: 'Bahnhofstrasse 75/79, 8001 Zürich' },
  ],
  employees: [
    { id: 'ctp-emp-001', name: 'Nick',             email: 'nick@commercial-theproject.ch',   phone: '',                  position: 'Manager & barista', weeklyHours: null, locations: [C.feld, C.bahn] },
    { id: 'ctp-emp-002', name: 'Elena Papadaki',   email: 'elena@commercial-theproject.ch',  phone: '+41 79 201 11 21', position: 'Head barista',      weeklyHours: 42, locations: [C.feld, C.bahn] },
    { id: 'ctp-emp-003', name: 'Luca Brunner',     email: 'luca@commercial-theproject.ch',   phone: '+41 79 202 22 32', position: 'Barista',           weeklyHours: 40, locations: [C.bahn] },
    { id: 'ctp-emp-004', name: 'Mira Keller',      email: 'mira@commercial-theproject.ch',   phone: '+41 79 204 44 54', position: 'Barista',           weeklyHours: 32, locations: [C.feld] },
    { id: 'ctp-emp-005', name: 'Tomás Ferreira',   email: 'tomas@commercial-theproject.ch',  phone: '+41 79 205 55 65', position: 'Barista',           weeklyHours: 40, locations: [C.bahn, C.feld] },
    { id: 'ctp-emp-006', name: 'Sofia Andreou',    email: 'sofia@commercial-theproject.ch',  phone: '+41 79 206 66 76', position: 'Barista (weekends)', weeklyHours: 20, locations: [C.feld] },
    { id: 'ctp-emp-007', name: 'Jonas Hürlimann',  email: 'jonas@commercial-theproject.ch',  phone: '+41 79 207 77 87', position: 'Barista (student)', weeklyHours: 20, locations: [C.bahn] },
  ],
  suppliers: [
    { id: 'ctp-sup-001', name: 'MAME Coffee Roasters',   contact: 'Wholesale',        email: 'wholesale@mame.coffee',      phone: '+41 44 000 00 01' },
    { id: 'ctp-sup-002', name: 'Rose Coffee Roasters',   contact: 'Wholesale',        email: 'orders@rosecoffee.ch',       phone: '+41 44 000 00 02' },
    { id: 'ctp-sup-003', name: 'Balloon Coffee',         contact: 'Wholesale',        email: 'hello@ballooncoffee.ch',     phone: '+41 44 000 00 03' },
    { id: 'ctp-sup-004', name: 'Partner bakery (buns)',  contact: 'Bakery orders',    email: 'orders@bakery.ch',           phone: '+41 44 000 00 04' },
    { id: 'ctp-sup-005', name: 'Molkerei (milk & oat)',  contact: 'Delivery',         email: 'bestellung@molkerei.ch',     phone: '+41 44 000 00 05' },
    { id: 'ctp-sup-006', name: 'Barista Supply Schweiz', contact: 'Sales',            email: 'sales@baristasupply.ch',     phone: '+41 44 000 00 06' },
  ],
  // Max two people per bar at peak: opener 07:30–14:30 + closer 10:30–17:30 (Feldstrasse),
  // opener 07:30–14:30 + closer 11:30–19:00 (Bahnhofstrasse). Weekend Feldstrasse 08:30–15:30 + 11:00–18:30.
  week: [
    [ { e: 'ctp-emp-002', l: C.feld, s: '07:30', end: '14:30' }, { e: 'ctp-emp-004', l: C.feld, s: '10:30', end: '17:30' },
      { e: 'ctp-emp-003', l: C.bahn, s: '07:30', end: '14:30' }, { e: 'ctp-emp-005', l: C.bahn, s: '11:30', end: '19:00' } ],
    [ { e: 'ctp-emp-001', l: C.feld, s: '07:30', end: '14:30' }, { e: 'ctp-emp-004', l: C.feld, s: '10:30', end: '17:30' },
      { e: 'ctp-emp-003', l: C.bahn, s: '07:30', end: '14:30' }, { e: 'ctp-emp-005', l: C.bahn, s: '11:30', end: '19:00' } ],
    [ { e: 'ctp-emp-002', l: C.feld, s: '07:30', end: '14:30' }, { e: 'ctp-emp-005', l: C.feld, s: '10:30', end: '17:30' },
      { e: 'ctp-emp-003', l: C.bahn, s: '07:30', end: '14:30' }, { e: 'ctp-emp-001', l: C.bahn, s: '11:30', end: '19:00' } ],
    [ { e: 'ctp-emp-002', l: C.feld, s: '07:30', end: '14:30' }, { e: 'ctp-emp-004', l: C.feld, s: '10:30', end: '17:30' },
      { e: 'ctp-emp-005', l: C.bahn, s: '07:30', end: '14:30' }, { e: 'ctp-emp-003', l: C.bahn, s: '11:30', end: '19:00' } ],
    [ { e: 'ctp-emp-002', l: C.feld, s: '07:30', end: '14:30' }, { e: 'ctp-emp-004', l: C.feld, s: '10:30', end: '17:30' },
      { e: 'ctp-emp-003', l: C.bahn, s: '07:30', end: '14:30' }, { e: 'ctp-emp-007', l: C.bahn, s: '12:00', end: '19:00' } ],
    [ { e: 'ctp-emp-006', l: C.feld, s: '08:30', end: '15:30' }, { e: 'ctp-emp-002', l: C.feld, s: '11:00', end: '18:30' },
      { e: 'ctp-emp-005', l: C.bahn, s: '07:30', end: '14:30' }, { e: 'ctp-emp-007', l: C.bahn, s: '11:30', end: '19:00' } ],
    [ { e: 'ctp-emp-006', l: C.feld, s: '08:30', end: '15:30' }, { e: 'ctp-emp-001', l: C.feld, s: '11:00', end: '18:30' } ],
  ],
  nextWeekPlannedDays: 3,
  orders: [
    { id: 'ctp-ord-001', sup: 'ctp-sup-001', loc: C.feld, status: 'RECEIVED', created: -16, delivery: -14, items: [{ productName: 'MAME – house espresso (1 kg)', quantity: 6, unit: 'kg', unitPrice: 42 }, { productName: 'MAME – decaf (1 kg)', quantity: 1, unit: 'kg', unitPrice: 44 }], notes: 'Delivered by courier, no issues.' },
    { id: 'ctp-ord-002', sup: 'ctp-sup-004', loc: C.feld, status: 'RECEIVED', created: -15, delivery: -14, items: [{ productName: 'Butter croissant', quantity: 70, unit: 'u', unitPrice: 1.4 }, { productName: 'Cardamom bun (weekend)', quantity: 40, unit: 'u', unitPrice: 2.2 }, { productName: 'Cinnamon bun (weekend)', quantity: 40, unit: 'u', unitPrice: 2.2 }, { productName: 'Banana bread (loaf)', quantity: 4, unit: 'u', unitPrice: 12 }] },
    { id: 'ctp-ord-003', sup: 'ctp-sup-005', loc: C.bahn, status: 'RECEIVED', created: -13, delivery: -12, items: [{ productName: 'Whole milk 3.5% (1 L)', quantity: 72, unit: 'L', unitPrice: 1.95 }, { productName: 'Oat barista (1 L)', quantity: 36, unit: 'L', unitPrice: 2.6 }] },
    { id: 'ctp-ord-004', sup: 'ctp-sup-002', loc: C.feld, status: 'RECEIVED', created: -12, delivery: -10, items: [{ productName: 'Rose – Ethiopia washed, filter (1 kg)', quantity: 2, unit: 'kg', unitPrice: 48 }, { productName: 'Rose – retail bags 250 g', quantity: 18, unit: 'u', unitPrice: 15 }], notes: 'Rotating filter for the October menu.' },
    { id: 'ctp-ord-005', sup: 'ctp-sup-006', loc: C.bahn, status: 'RECEIVED', created: -11, delivery: -8, items: [{ productName: 'V60 02 filters (100)', quantity: 6, unit: 'pack', unitPrice: 9.5 }, { productName: 'Origami filters (100)', quantity: 4, unit: 'pack', unitPrice: 11 }, { productName: 'AeroPress filters (350)', quantity: 2, unit: 'pack', unitPrice: 8 }, { productName: 'Takeaway cups 8 oz (500)', quantity: 2, unit: 'box', unitPrice: 55 }] },
    { id: 'ctp-ord-006', sup: 'ctp-sup-005', loc: C.feld, status: 'RECEIVED', created: -9, delivery: -8, items: [{ productName: 'Whole milk 3.5% (1 L)', quantity: 60, unit: 'L', unitPrice: 1.95 }, { productName: 'Oat barista (1 L)', quantity: 24, unit: 'L', unitPrice: 2.6 }] },
    { id: 'ctp-ord-007', sup: 'ctp-sup-004', loc: C.bahn, status: 'RECEIVED', created: -8, delivery: -7, items: [{ productName: 'Butter croissant', quantity: 80, unit: 'u', unitPrice: 1.4 }, { productName: 'Cookies', quantity: 50, unit: 'u', unitPrice: 1.1 }, { productName: 'NY cheesecake (whole)', quantity: 2, unit: 'u', unitPrice: 38 }] },
    { id: 'ctp-ord-008', sup: 'ctp-sup-001', loc: C.bahn, status: 'SENT', created: -2, delivery: 1, items: [{ productName: 'MAME – house espresso (1 kg)', quantity: 8, unit: 'kg', unitPrice: 42 }, { productName: 'MAME – decaf (1 kg)', quantity: 1, unit: 'kg', unitPrice: 44 }], notes: 'Before 9:00 please, the entrance is closed later.' },
    { id: 'ctp-ord-009', sup: 'ctp-sup-003', loc: C.feld, status: 'SENT', created: -2, delivery: 2, items: [{ productName: 'Balloon – Colombia, filter (1 kg)', quantity: 2, unit: 'kg', unitPrice: 47 }, { productName: 'Balloon – retail bags 250 g', quantity: 12, unit: 'u', unitPrice: 15 }], notes: 'Guest roaster for the tasting menu.' },
    { id: 'ctp-ord-010', sup: 'ctp-sup-004', loc: C.feld, status: 'SENT', created: -1, delivery: 1, items: [{ productName: 'Butter croissant', quantity: 70, unit: 'u', unitPrice: 1.4 }, { productName: 'Cardamom bun (weekend)', quantity: 40, unit: 'u', unitPrice: 2.2 }, { productName: 'Espresso bun (weekend)', quantity: 30, unit: 'u', unitPrice: 2.4 }, { productName: 'NY cheesecake (whole)', quantity: 2, unit: 'u', unitPrice: 38 }], notes: 'Weekend buns for Saturday morning.' },
    { id: 'ctp-ord-011', sup: 'ctp-sup-006', loc: C.feld, status: 'DRAFT', created: 0, items: [{ productName: 'Matcha ceremonial (100 g)', quantity: 3, unit: 'u', unitPrice: 32 }, { productName: 'V60 02 filters (100)', quantity: 4, unit: 'pack', unitPrice: 9.5 }], notes: 'Check the back room before sending.' },
    { id: 'ctp-ord-012', sup: 'ctp-sup-002', loc: C.bahn, status: 'DRAFT', created: 0, items: [{ productName: 'Rose – retail bags 250 g', quantity: 24, unit: 'u', unitPrice: 15 }] },
  ],
  salesFor: (locId, dow, seed, noise) => {
    if (locId === C.feld) {
      const base = dow === 0 || dow === 6 ? 2050 : dow === 5 ? 1600 : 1400;
      return { sales: round2(base * noise), cardRatio: 0.8 + rnd(seed + 1) * 0.1, expenses: dow === 6 ? 40 : 15 + Math.round(rnd(seed + 2) * 20) };
    }
    if (dow === 0) return null; // Bahnhofstrasse closed on Sunday
    const base = dow === 6 ? 2500 : 2200;
    return { sales: round2(base * noise), cardRatio: 0.85 + rnd(seed + 1) * 0.08, expenses: 12 + Math.round(rnd(seed + 2) * 15) };
  },
  closingNotes: (locId, dOff) =>
    dOff === -6 && locId === C.feld ? 'Card terminal offline 14:00–15:00, some sales taken in cash.'
    : dOff === -2 && locId === C.bahn ? 'Tasting menu evening, +20 covers.' : null,
  vacations: [
    { employeeId: 'ctp-emp-002', from: 21, to: 28, reason: 'Trip home to Crete', status: 'PENDING', managerNote: null },
    { employeeId: 'ctp-emp-003', from: 5, to: 7, reason: 'Long weekend in Ticino', status: 'APPROVED', managerNote: 'Approved – Tomás covers Bahnhofstrasse.' },
    { employeeId: 'ctp-emp-004', from: 12, to: 12, reason: 'Medical appointment', status: 'APPROVED', managerNote: 'OK.' },
    { employeeId: 'ctp-emp-007', from: 35, to: 49, reason: 'University exams', status: 'PENDING', managerNote: null },
    { employeeId: 'ctp-emp-005', from: 2, to: 3, reason: 'Concert in Milan', status: 'REJECTED', managerNote: 'Weekend before the tasting event – another date?' },
  ],
  preferences: [
    { e: 'ctp-emp-002', day: 'MON', s: '07:30', end: '14:30', l: C.feld, notes: 'Opening shifts at Feldstrasse' },
    { e: 'ctp-emp-002', day: 'WED', s: '07:30', end: '14:30', l: C.feld, notes: null },
    { e: 'ctp-emp-002', day: 'THU', s: '07:30', end: '14:30', l: C.feld, notes: null },
    { e: 'ctp-emp-002', day: 'FRI', s: '07:30', end: '14:30', l: C.feld, notes: null },
    { e: 'ctp-emp-003', day: 'MON', s: '07:30', end: '14:30', l: C.bahn, notes: null },
    { e: 'ctp-emp-003', day: 'TUE', s: '07:30', end: '14:30', l: C.bahn, notes: null },
    { e: 'ctp-emp-003', day: 'WED', s: '07:30', end: '14:30', l: C.bahn, notes: null },
    { e: 'ctp-emp-003', day: 'FRI', s: '07:30', end: '14:30', l: C.bahn, notes: null },
    { e: 'ctp-emp-004', day: 'MON', s: '10:30', end: '17:30', l: C.feld, notes: null },
    { e: 'ctp-emp-004', day: 'TUE', s: '10:30', end: '17:30', l: C.feld, notes: null },
    { e: 'ctp-emp-004', day: 'THU', s: '10:30', end: '17:30', l: C.feld, notes: 'No Sundays please' },
    { e: 'ctp-emp-005', day: 'MON', s: '11:30', end: '19:00', l: C.bahn, notes: null },
    { e: 'ctp-emp-005', day: 'TUE', s: '11:30', end: '19:00', l: C.bahn, notes: null },
    { e: 'ctp-emp-005', day: 'THU', s: '07:30', end: '14:30', l: C.bahn, notes: null },
    { e: 'ctp-emp-005', day: 'SAT', s: '07:30', end: '14:30', l: C.bahn, notes: null },
    { e: 'ctp-emp-006', day: 'SAT', s: '08:30', end: '15:30', l: C.feld, notes: 'Weekends only' },
    { e: 'ctp-emp-006', day: 'SUN', s: '08:30', end: '15:30', l: C.feld, notes: null },
    { e: 'ctp-emp-007', day: 'FRI', s: '12:00', end: '19:00', l: C.bahn, notes: 'After lectures' },
    { e: 'ctp-emp-007', day: 'SAT', s: '11:30', end: '19:00', l: C.bahn, notes: null },
  ],
};

export const DATASETS: Record<Profile, DatasetDef> = { mosaik: MOSAIK, commercial: COMMERCIAL };

/** Finds the dataset that owns a user (by username, email or group id). */
export function datasetFor(key: { username?: string; email?: string; groupId?: string }): DatasetDef | undefined {
  return Object.values(DATASETS).find((d) =>
    (key.groupId && d.group.id === key.groupId) ||
    d.users.some((u) => (key.username && u.username === key.username) || (key.email && u.email === key.email)));
}

// ─── Generators (relative to today) ───────────────────────────────────────────

export interface GenSchedule { employeeId: string; locationId: string; date: string; startTime: string; endTime: string }
export interface GenClosing { locationId: string; date: string; openingAmount: number; closingAmount: number; sales: number; cardSales: number; cashSales: number; expenses: number; notes: string | null }

/** 3 past weeks + current week fully planned; next week only partially, so coverage gaps show. */
export function genSchedules(ds: DatasetDef, today = new Date()): GenSchedule[] {
  const monday = mondayOf(today);
  const out: GenSchedule[] = [];
  for (let w = -3; w <= 1; w++) {
    for (let d = 0; d < 7; d++) {
      const date = fmt(addDays(monday, w * 7 + d));
      for (const slot of ds.week[d]) {
        if (w < 0 && rnd(w * 100 + d * 10 + slot.e.charCodeAt(slot.e.length - 1)) < 0.08) continue;
        if (w === 1 && d >= ds.nextWeekPlannedDays) continue;
        out.push({ employeeId: slot.e, locationId: slot.l, date, startTime: slot.s, endTime: slot.end });
      }
    }
  }
  return out;
}

/** Last 8 weeks of daily closings; the drawer holds cash only. */
export function genClosings(ds: DatasetDef, today = new Date()): GenClosing[] {
  const out: GenClosing[] = [];
  for (let dOff = -55; dOff <= 0; dOff++) {
    const d = addDays(today, dOff);
    for (const loc of ds.locations) {
      const seed = Math.abs(dOff * 7 + loc.id.charCodeAt(loc.id.length - 1) * 13);
      const s = ds.salesFor(loc.id, d.getDay(), seed, 0.88 + rnd(seed) * 0.24);
      if (!s) continue;
      const cardSales = round2(s.sales * s.cardRatio);
      const cashSales = round2(s.sales - cardSales);
      const r = rnd(dOff * 3 + loc.id.charCodeAt(loc.id.length - 1));
      const discrepancy = r < 0.12 ? -5 : r < 0.2 ? 2 : 0;
      out.push({ locationId: loc.id, date: fmt(d), openingAmount: 250, closingAmount: round2(250 + cashSales - s.expenses + discrepancy), sales: s.sales, cardSales, cashSales, expenses: s.expenses, notes: ds.closingNotes(loc.id, dOff) });
    }
  }
  return out;
}
