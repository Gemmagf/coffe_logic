import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Demo dataset: "Commercial – The Project", a specialty coffee business in Zürich
 * (Feldstrasse 61 in Kreis 4, a second bar on Bahnhofstrasse, plus a small
 * roastery lab). Dates are generated relative to today so the demo always
 * looks current. Keep in sync with frontend/src/api/mock/data.ts.
 */
const prisma = new PrismaClient();

const fmt = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const mondayOf = (d: Date) => addDays(d, d.getDay() === 0 ? -6 : 1 - d.getDay());
const round2 = (n: number) => Math.round(n * 100) / 100;
/** Deterministic pseudo-random in [0,1) from a seed. */
const rnd = (seed: number) => { const x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); };

const GROUP_ID = 'demo-group-001';
const LOC = { feld: 'demo-loc-001', bahn: 'demo-loc-002', lab: 'demo-loc-003' } as const;

export const LOCATIONS = [
  { id: LOC.feld, name: 'Commercial – Feldstrasse', address: 'Feldstrasse 61, 8004 Zürich (Kreis 4)' },
  { id: LOC.bahn, name: 'Commercial – Bahnhofstrasse', address: 'Bahnhofstrasse 75/79, 8001 Zürich' },
  { id: LOC.lab, name: 'Commercial – Roastery Lab', address: 'Binzstrasse 12, 8045 Zürich' },
];

export const EMPLOYEES = [
  { id: 'demo-emp-001', name: 'Elena Papadaki',   email: 'elena@commercial-theproject.ch', phone: '+41 79 201 11 21', position: 'Head barista',       weeklyHours: 42, locations: [LOC.feld, LOC.bahn] },
  { id: 'demo-emp-002', name: 'Luca Brunner',     email: 'luca@commercial-theproject.ch',  phone: '+41 79 202 22 32', position: 'Barista',            weeklyHours: 40, locations: [LOC.bahn] },
  { id: 'demo-emp-003', name: 'Yannis Vlachos',   email: 'yannis@commercial-theproject.ch',phone: '+41 79 203 33 43', position: 'Roaster & barista',  weeklyHours: 40, locations: [LOC.lab, LOC.feld] },
  { id: 'demo-emp-004', name: 'Mira Keller',      email: 'mira@commercial-theproject.ch',  phone: '+41 79 204 44 54', position: 'Barista',            weeklyHours: 32, locations: [LOC.feld] },
  { id: 'demo-emp-005', name: 'Tomás Ferreira',   email: 'tomas@commercial-theproject.ch', phone: '+41 79 205 55 65', position: 'Barista',            weeklyHours: 40, locations: [LOC.bahn, LOC.feld] },
  { id: 'demo-emp-006', name: 'Sofia Andreou',    email: 'sofia@commercial-theproject.ch', phone: '+41 79 206 66 76', position: 'Service & pastry',   weeklyHours: 24, locations: [LOC.feld] },
  { id: 'demo-emp-007', name: 'Jonas Hürlimann',  email: 'jonas@commercial-theproject.ch', phone: '+41 79 207 77 87', position: 'Barista (student)',  weeklyHours: 20, locations: [LOC.bahn] },
  { id: 'demo-emp-008', name: 'Aylin Demir',      email: 'aylin@commercial-theproject.ch', phone: '+41 79 208 88 98', position: 'Barista',            weeklyHours: 36, locations: [LOC.feld, LOC.lab] },
  { id: 'demo-emp-009', name: 'Noah Steiner',     email: 'noah@commercial-theproject.ch',  phone: '+41 79 209 99 09', position: 'Roastery assistant', weeklyHours: 30, locations: [LOC.lab, LOC.bahn] },
];

export const SUPPLIERS = [
  { id: 'demo-sup-001', name: 'MAME Coffee Roasters',    contact: 'Emi Fukahori',    email: 'wholesale@mame.coffee',      phone: '+41 44 221 10 10' },
  { id: 'demo-sup-002', name: 'Rose Coffee Roasters',    contact: 'Simon Rose',      email: 'orders@rosecoffee.ch',       phone: '+41 44 221 20 20' },
  { id: 'demo-sup-003', name: 'Balloon Coffee',          contact: 'Nina Berger',     email: 'hello@ballooncoffee.ch',     phone: '+41 44 221 30 30' },
  { id: 'demo-sup-004', name: 'John Baker',              contact: 'Bakery orders',   email: 'b2b@johnbaker.ch',           phone: '+41 44 221 40 40' },
  { id: 'demo-sup-005', name: 'Molkerei Seefeld',        contact: 'Ruedi Frei',      email: 'bestellung@molkerei-seefeld.ch', phone: '+41 44 221 50 50' },
  { id: 'demo-sup-006', name: 'Barista Supply Schweiz',  contact: 'Karin Vogt',      email: 'sales@baristasupply.ch',     phone: '+41 44 221 60 60' },
];

type Slot = { e: string; l: string; s: string; end: string };
/** Weekly pattern, Monday first. Feldstrasse: Mon–Fri 8–17, Sat–Sun 9–18. Bahnhofstrasse: Mon–Sat 8–18:30. Lab: Thu–Sat. */
export const WEEK: Slot[][] = [
  [ // Mon
    { e: 'demo-emp-001', l: LOC.feld, s: '07:30', end: '15:30' }, { e: 'demo-emp-004', l: LOC.feld, s: '10:30', end: '17:30' },
    { e: 'demo-emp-002', l: LOC.bahn, s: '07:30', end: '15:00' }, { e: 'demo-emp-005', l: LOC.bahn, s: '11:30', end: '19:00' },
  ],
  [ // Tue
    { e: 'demo-emp-001', l: LOC.feld, s: '07:30', end: '15:30' }, { e: 'demo-emp-008', l: LOC.feld, s: '10:30', end: '17:30' },
    { e: 'demo-emp-002', l: LOC.bahn, s: '07:30', end: '15:00' }, { e: 'demo-emp-005', l: LOC.bahn, s: '11:30', end: '19:00' },
  ],
  [ // Wed
    { e: 'demo-emp-003', l: LOC.feld, s: '07:30', end: '15:30' }, { e: 'demo-emp-004', l: LOC.feld, s: '10:30', end: '17:30' },
    { e: 'demo-emp-002', l: LOC.bahn, s: '07:30', end: '15:00' }, { e: 'demo-emp-009', l: LOC.bahn, s: '11:30', end: '19:00' },
  ],
  [ // Thu
    { e: 'demo-emp-001', l: LOC.feld, s: '07:30', end: '15:30' }, { e: 'demo-emp-008', l: LOC.feld, s: '10:30', end: '17:30' },
    { e: 'demo-emp-005', l: LOC.bahn, s: '07:30', end: '15:00' }, { e: 'demo-emp-002', l: LOC.bahn, s: '11:30', end: '19:00' },
    { e: 'demo-emp-003', l: LOC.lab, s: '09:30', end: '17:00' },
  ],
  [ // Fri
    { e: 'demo-emp-001', l: LOC.feld, s: '07:30', end: '15:30' }, { e: 'demo-emp-004', l: LOC.feld, s: '10:30', end: '17:30' },
    { e: 'demo-emp-005', l: LOC.bahn, s: '07:30', end: '15:00' }, { e: 'demo-emp-007', l: LOC.bahn, s: '12:00', end: '19:00' },
    { e: 'demo-emp-003', l: LOC.lab, s: '09:30', end: '17:00' }, { e: 'demo-emp-009', l: LOC.lab, s: '09:30', end: '15:30' },
  ],
  [ // Sat
    { e: 'demo-emp-008', l: LOC.feld, s: '08:30', end: '16:30' }, { e: 'demo-emp-006', l: LOC.feld, s: '09:00', end: '15:00' }, { e: 'demo-emp-004', l: LOC.feld, s: '12:00', end: '18:30' },
    { e: 'demo-emp-002', l: LOC.bahn, s: '07:30', end: '15:00' }, { e: 'demo-emp-007', l: LOC.bahn, s: '11:30', end: '19:00' },
    { e: 'demo-emp-009', l: LOC.lab, s: '10:00', end: '17:00' }, { e: 'demo-emp-003', l: LOC.lab, s: '10:00', end: '14:00' },
  ],
  [ // Sun (Bahnhofstrasse & lab closed)
    { e: 'demo-emp-008', l: LOC.feld, s: '08:30', end: '15:30' }, { e: 'demo-emp-006', l: LOC.feld, s: '09:00', end: '15:00' }, { e: 'demo-emp-005', l: LOC.feld, s: '12:00', end: '18:30' },
  ],
];

type Item = { productName: string; quantity: number; unit: string; unitPrice: number };
export const ORDERS: { id: string; sup: string; loc: string; status: string; created: number; delivery?: number; items: Item[]; notes?: string }[] = [
  { id: 'demo-ord-001', sup: 'demo-sup-001', loc: LOC.feld, status: 'RECEIVED', created: -16, delivery: -14, items: [{ productName: 'House espresso – Brazil/Colombia (1 kg)', quantity: 8, unit: 'kg', unitPrice: 38 }, { productName: 'Decaf Colombia EA (1 kg)', quantity: 2, unit: 'kg', unitPrice: 41 }], notes: 'Delivered by bike courier, no issues.' },
  { id: 'demo-ord-002', sup: 'demo-sup-004', loc: LOC.feld, status: 'RECEIVED', created: -15, delivery: -14, items: [{ productName: 'Butter croissant', quantity: 120, unit: 'u', unitPrice: 1.4 }, { productName: 'Cardamom bun', quantity: 60, unit: 'u', unitPrice: 2.2 }, { productName: 'Banana bread (loaf)', quantity: 6, unit: 'u', unitPrice: 12 }] },
  { id: 'demo-ord-003', sup: 'demo-sup-005', loc: LOC.bahn, status: 'RECEIVED', created: -13, delivery: -12, items: [{ productName: 'Whole milk 3.5% (1 L)', quantity: 96, unit: 'L', unitPrice: 1.95 }, { productName: 'Oat barista (1 L)', quantity: 36, unit: 'L', unitPrice: 2.6 }] },
  { id: 'demo-ord-004', sup: 'demo-sup-002', loc: LOC.feld, status: 'RECEIVED', created: -12, delivery: -10, items: [{ productName: 'Ethiopia Guji washed – filter (1 kg)', quantity: 3, unit: 'kg', unitPrice: 46 }, { productName: 'Kenya Kiambu AA – filter (250 g retail)', quantity: 24, unit: 'u', unitPrice: 14.5 }], notes: 'Guest roaster for the October filter menu.' },
  { id: 'demo-ord-005', sup: 'demo-sup-006', loc: LOC.bahn, status: 'RECEIVED', created: -11, delivery: -8, items: [{ productName: 'V60 02 filters (100)', quantity: 10, unit: 'pack', unitPrice: 9.5 }, { productName: 'Takeaway cups 8 oz (500)', quantity: 2, unit: 'box', unitPrice: 55 }, { productName: 'Cup lids 8 oz (500)', quantity: 2, unit: 'box', unitPrice: 28 }] },
  { id: 'demo-ord-006', sup: 'demo-sup-005', loc: LOC.feld, status: 'RECEIVED', created: -9, delivery: -8, items: [{ productName: 'Whole milk 3.5% (1 L)', quantity: 72, unit: 'L', unitPrice: 1.95 }, { productName: 'Oat barista (1 L)', quantity: 24, unit: 'L', unitPrice: 2.6 }] },
  { id: 'demo-ord-007', sup: 'demo-sup-004', loc: LOC.bahn, status: 'RECEIVED', created: -8, delivery: -7, items: [{ productName: 'Butter croissant', quantity: 100, unit: 'u', unitPrice: 1.4 }, { productName: 'Cinnamon bun', quantity: 50, unit: 'u', unitPrice: 2.2 }, { productName: 'Cookies (choc chip)', quantity: 60, unit: 'u', unitPrice: 1.1 }] },
  { id: 'demo-ord-008', sup: 'demo-sup-001', loc: LOC.bahn, status: 'SENT', created: -2, delivery: 1, items: [{ productName: 'House espresso – Brazil/Colombia (1 kg)', quantity: 10, unit: 'kg', unitPrice: 38 }, { productName: 'Decaf Colombia EA (1 kg)', quantity: 2, unit: 'kg', unitPrice: 41 }], notes: 'Please deliver before 9:00, the showroom entrance is closed later.' },
  { id: 'demo-ord-009', sup: 'demo-sup-003', loc: LOC.lab, status: 'SENT', created: -2, delivery: 2, items: [{ productName: 'Green coffee – Colombia Huila (30 kg)', quantity: 2, unit: 'box', unitPrice: 310 }, { productName: 'Green coffee – Ethiopia Sidamo (30 kg)', quantity: 1, unit: 'box', unitPrice: 365 }], notes: 'Sample roast for the tasting menu.' },
  { id: 'demo-ord-010', sup: 'demo-sup-004', loc: LOC.feld, status: 'SENT', created: -1, delivery: 1, items: [{ productName: 'Butter croissant', quantity: 120, unit: 'u', unitPrice: 1.4 }, { productName: 'Cardamom bun', quantity: 60, unit: 'u', unitPrice: 2.2 }, { productName: 'Espresso bun (weekend)', quantity: 40, unit: 'u', unitPrice: 2.4 }, { productName: 'NY cheesecake (whole)', quantity: 2, unit: 'u', unitPrice: 38 }], notes: 'Weekend buns for Saturday morning.' },
  { id: 'demo-ord-011', sup: 'demo-sup-006', loc: LOC.feld, status: 'DRAFT', created: 0, items: [{ productName: 'Matcha ceremonial (100 g)', quantity: 4, unit: 'u', unitPrice: 32 }, { productName: 'Origami dripper filters (100)', quantity: 6, unit: 'pack', unitPrice: 11 }], notes: 'Check stock in the back room before sending.' },
  { id: 'demo-ord-012', sup: 'demo-sup-002', loc: LOC.bahn, status: 'DRAFT', created: 0, items: [{ productName: 'Kenya Kiambu AA – filter (250 g retail)', quantity: 36, unit: 'u', unitPrice: 14.5 }, { productName: 'Retail bags & labels', quantity: 1, unit: 'box', unitPrice: 42 }] },
];

/** Daily sales bases (CHF). Bahnhofstrasse and the lab are closed on Sunday; the lab only opens Thu–Sat. */
export function salesFor(locId: string, d: Date, dOff: number): { sales: number; cardRatio: number; expenses: number } | null {
  const dow = d.getDay();
  const seed = Math.abs(dOff * 7 + locId.charCodeAt(9) * 13);
  const noise = 0.88 + rnd(seed) * 0.24; // ±12 %
  if (locId === LOC.feld) {
    const base = dow === 0 || dow === 6 ? 2150 : dow === 5 ? 1650 : 1450;
    return { sales: round2(base * noise), cardRatio: 0.78 + rnd(seed + 1) * 0.1, expenses: dow === 6 ? 45 : 18 + Math.round(rnd(seed + 2) * 20) };
  }
  if (locId === LOC.bahn) {
    if (dow === 0) return null;
    const base = dow === 6 ? 2650 : 2300;
    return { sales: round2(base * noise), cardRatio: 0.84 + rnd(seed + 1) * 0.08, expenses: 12 + Math.round(rnd(seed + 2) * 15) };
  }
  if (dow < 4) return null; // lab: Thu, Fri, Sat
  const base = dow === 6 ? 1150 : 780;
  return { sales: round2(base * noise), cardRatio: 0.7 + rnd(seed + 1) * 0.1, expenses: 30 + Math.round(rnd(seed + 2) * 40) };
}

export const VACATIONS = [
  { employeeId: 'demo-emp-001', from: 21, to: 28, reason: 'Trip home to Crete', status: 'PENDING' },
  { employeeId: 'demo-emp-002', from: 5, to: 7, reason: 'Long weekend in Ticino', status: 'APPROVED', managerNote: 'Approved – Tomás covers Bahnhofstrasse.' },
  { employeeId: 'demo-emp-004', from: 12, to: 12, reason: 'Medical appointment', status: 'APPROVED', managerNote: 'OK, half day is fine too.' },
  { employeeId: 'demo-emp-007', from: 35, to: 49, reason: 'University exams', status: 'PENDING' },
  { employeeId: 'demo-emp-005', from: 2, to: 3, reason: 'Concert in Milan', status: 'REJECTED', managerNote: 'Weekend before the tasting event – can we find another date?' },
  { employeeId: 'demo-emp-008', from: 16, to: 18, reason: 'Family visit', status: 'APPROVED', managerNote: 'Approved.' },
];

export const PREFERENCES = [
  { e: 'demo-emp-001', day: 'MON', s: '07:30', end: '15:30', l: LOC.feld, notes: 'Opening shifts at Feldstrasse' },
  { e: 'demo-emp-001', day: 'TUE', s: '07:30', end: '15:30', l: LOC.feld },
  { e: 'demo-emp-001', day: 'THU', s: '07:30', end: '15:30', l: LOC.feld },
  { e: 'demo-emp-001', day: 'FRI', s: '07:30', end: '15:30', l: LOC.feld },
  { e: 'demo-emp-002', day: 'MON', s: '07:30', end: '15:00', l: LOC.bahn },
  { e: 'demo-emp-002', day: 'TUE', s: '07:30', end: '15:00', l: LOC.bahn },
  { e: 'demo-emp-002', day: 'WED', s: '07:30', end: '15:00', l: LOC.bahn },
  { e: 'demo-emp-002', day: 'SAT', s: '07:30', end: '15:00', l: LOC.bahn, notes: 'Saturday mornings OK' },
  { e: 'demo-emp-003', day: 'THU', s: '09:30', end: '17:00', l: LOC.lab, notes: 'Roast days' },
  { e: 'demo-emp-003', day: 'FRI', s: '09:30', end: '17:00', l: LOC.lab },
  { e: 'demo-emp-003', day: 'WED', s: '07:30', end: '15:30', l: LOC.feld },
  { e: 'demo-emp-004', day: 'MON', s: '10:30', end: '17:30', l: LOC.feld },
  { e: 'demo-emp-004', day: 'WED', s: '10:30', end: '17:30', l: LOC.feld },
  { e: 'demo-emp-004', day: 'FRI', s: '10:30', end: '17:30', l: LOC.feld, notes: 'No Sundays please' },
  { e: 'demo-emp-005', day: 'MON', s: '11:30', end: '19:00', l: LOC.bahn },
  { e: 'demo-emp-005', day: 'TUE', s: '11:30', end: '19:00', l: LOC.bahn },
  { e: 'demo-emp-005', day: 'THU', s: '07:30', end: '15:00', l: LOC.bahn },
  { e: 'demo-emp-005', day: 'SUN', s: '12:00', end: '18:30', l: LOC.feld },
  { e: 'demo-emp-006', day: 'SAT', s: '09:00', end: '15:00', l: LOC.feld, notes: 'Weekends only' },
  { e: 'demo-emp-006', day: 'SUN', s: '09:00', end: '15:00', l: LOC.feld },
  { e: 'demo-emp-007', day: 'FRI', s: '12:00', end: '19:00', l: LOC.bahn, notes: 'After lectures' },
  { e: 'demo-emp-007', day: 'SAT', s: '11:30', end: '19:00', l: LOC.bahn },
  { e: 'demo-emp-008', day: 'TUE', s: '10:30', end: '17:30', l: LOC.feld },
  { e: 'demo-emp-008', day: 'THU', s: '10:30', end: '17:30', l: LOC.feld },
  { e: 'demo-emp-008', day: 'SAT', s: '08:30', end: '16:30', l: LOC.feld },
  { e: 'demo-emp-008', day: 'SUN', s: '08:30', end: '15:30', l: LOC.feld },
  { e: 'demo-emp-009', day: 'WED', s: '11:30', end: '19:00', l: LOC.bahn },
  { e: 'demo-emp-009', day: 'FRI', s: '09:30', end: '15:30', l: LOC.lab },
  { e: 'demo-emp-009', day: 'SAT', s: '10:00', end: '17:00', l: LOC.lab, notes: 'Cupping sessions' },
];

async function main() {
  console.log('Seeding demo data for Commercial – The Project…\n');

  const group = await prisma.group.upsert({
    where: { id: GROUP_ID },
    update: { name: 'Commercial – The Project', plan: 'MULTI' },
    create: { id: GROUP_ID, name: 'Commercial – The Project', plan: 'MULTI' },
  });

  for (const l of LOCATIONS) {
    await prisma.location.upsert({ where: { id: l.id }, update: { name: l.name, address: l.address }, create: { ...l, groupId: group.id } });
  }

  for (const e of EMPLOYEES) {
    const { locations, ...data } = e;
    await prisma.employee.upsert({ where: { id: e.id }, update: data, create: { ...data, groupId: group.id } });
    await prisma.employeeLocation.deleteMany({ where: { employeeId: e.id } });
    await prisma.employeeLocation.createMany({ data: locations.map((locationId) => ({ employeeId: e.id, locationId })) });
  }

  for (const s of SUPPLIERS) {
    await prisma.supplier.upsert({ where: { id: s.id }, update: s, create: { ...s, groupId: group.id } });
  }

  // Users: the owner logs in with a short username ("the commercial project") and password "Nikos".
  const ownerHash = await bcrypt.hash('Nikos', 10);
  const managerHash = await bcrypt.hash('demo1234', 10);
  await prisma.user.upsert({
    where: { email: 'nick@commercial-theproject.ch' },
    update: { username: 'thecommercialproject', passwordHash: ownerHash, role: 'OWNER', groupId: group.id },
    create: { email: 'nick@commercial-theproject.ch', username: 'thecommercialproject', passwordHash: ownerHash, role: 'OWNER', groupId: group.id },
  });
  await prisma.user.upsert({
    where: { email: 'elena@commercial-theproject.ch' },
    update: { username: 'elena', passwordHash: managerHash, role: 'MANAGER', groupId: group.id },
    create: { email: 'elena@commercial-theproject.ch', username: 'elena', passwordHash: managerHash, role: 'MANAGER', groupId: group.id },
  });
  // Remove the old demo accounts if they exist from a previous seed.
  await prisma.user.deleteMany({ where: { email: { in: ['owner@commercial.ch', 'manager@commercial.ch'] } } });
  await prisma.employee.deleteMany({ where: { groupId: group.id, id: { notIn: EMPLOYEES.map((e) => e.id) } } });
  await prisma.supplier.deleteMany({ where: { groupId: group.id, id: { notIn: SUPPLIERS.map((s) => s.id) } } });

  // Regenerated data
  await prisma.schedule.deleteMany({ where: { location: { groupId: group.id } } });
  await prisma.order.deleteMany({ where: { location: { groupId: group.id } } });
  await prisma.cashClosing.deleteMany({ where: { location: { groupId: group.id } } });
  await prisma.vacationRequest.deleteMany({ where: { employee: { groupId: group.id } } });
  await prisma.shiftPreference.deleteMany({ where: { employee: { groupId: group.id } } });
  await prisma.location.deleteMany({ where: { groupId: group.id, id: { notIn: LOCATIONS.map((l) => l.id) } } });

  const today = new Date();
  const monday = mondayOf(today);

  // ── Schedules: 3 past weeks + current + next week ─────────────────────────
  const schedules: { employeeId: string; locationId: string; date: string; startTime: string; endTime: string }[] = [];
  for (let w = -3; w <= 1; w++) {
    for (let d = 0; d < 7; d++) {
      const date = fmt(addDays(monday, w * 7 + d));
      for (const slot of WEEK[d]) {
        if (w < 0 && rnd(w * 100 + d * 10 + slot.e.charCodeAt(9)) < 0.08) continue; // occasional absences in the past
        if (w === 1 && d >= 4) continue; // next week is only planned until Thursday → coverage gaps to fill
        schedules.push({ employeeId: slot.e, locationId: slot.l, date, startTime: slot.s, endTime: slot.end });
      }
    }
  }
  await prisma.schedule.createMany({ data: schedules });
  console.log(`  Shifts: ${schedules.length}`);

  // ── Orders ────────────────────────────────────────────────────────────────
  for (const o of ORDERS) {
    const createdAt = addDays(today, o.created); createdAt.setHours(9, 30, 0, 0);
    await prisma.order.create({
      data: {
        id: o.id, supplierId: o.sup, locationId: o.loc, status: o.status, items: JSON.stringify(o.items),
        notes: o.notes ?? null, deliveryAt: o.delivery !== undefined ? fmt(addDays(today, o.delivery)) : null, createdAt,
      },
    });
  }
  console.log(`  Orders: ${ORDERS.length}`);

  // ── Cash closings: last 8 weeks ───────────────────────────────────────────
  const closings: { locationId: string; date: string; openingAmount: number; closingAmount: number; sales: number; cardSales: number; cashSales: number; expenses: number; notes?: string }[] = [];
  for (let dOff = -55; dOff <= 0; dOff++) {
    const d = addDays(today, dOff);
    for (const loc of LOCATIONS) {
      const s = salesFor(loc.id, d, dOff);
      if (!s) continue;
      const cardSales = round2(s.sales * s.cardRatio);
      const cashSales = round2(s.sales - cardSales);
      const r = rnd(dOff * 3 + loc.id.charCodeAt(9));
      const discrepancy = r < 0.12 ? -5 : r < 0.2 ? 2 : 0;
      const closing = round2(250 + cashSales - s.expenses + discrepancy);
      const notes = dOff === -6 && loc.id === LOC.feld ? 'Card terminal offline 14:00–15:00, some sales taken in cash.'
        : dOff === -2 && loc.id === LOC.bahn ? 'Cupping event in the evening, +30 covers.'
        : dOff === -13 && loc.id === LOC.lab ? 'Retail bag sales strong after the Roaster of the Year post.' : undefined;
      closings.push({ locationId: loc.id, date: fmt(d), openingAmount: 250, closingAmount: closing, sales: s.sales, cardSales, cashSales, expenses: s.expenses, ...(notes ? { notes } : {}) });
    }
  }
  await prisma.cashClosing.createMany({ data: closings });
  console.log(`  Cash closings: ${closings.length}`);

  // ── Vacations & preferences ───────────────────────────────────────────────
  for (const v of VACATIONS) {
    await prisma.vacationRequest.create({ data: { employeeId: v.employeeId, fromDate: fmt(addDays(today, v.from)), toDate: fmt(addDays(today, v.to)), reason: v.reason, status: v.status, managerNote: v.managerNote ?? null } });
  }
  for (const p of PREFERENCES) {
    await prisma.shiftPreference.create({ data: { employeeId: p.e, dayOfWeek: p.day, startTime: p.s, endTime: p.end, locationId: p.l ?? null, notes: p.notes ?? null } });
  }
  console.log(`  Vacation requests: ${VACATIONS.length} · preferences: ${PREFERENCES.length}`);

  console.log('\nDone.');
  console.log('  Group:     Commercial – The Project');
  console.log('  Locations: Feldstrasse · Bahnhofstrasse · Roastery Lab');
  console.log('  Owner:     the commercial project  /  Nikos');
  console.log('  Manager:   elena  /  demo1234\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
