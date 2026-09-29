import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d: Date) => d.toISOString().slice(0, 10);

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function mondayOf(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

function vary(base: number, seed: number, amplitude: number): number {
  const factors = [1.0, 0.88, 0.93, 1.05, 1.18, 1.35, 1.25];
  const factor = factors[Math.abs(seed) % 7];
  return Math.round((base * factor + (seed % 3) * amplitude) * 100) / 100;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Sembrant dades de demo per The Commercial Project...\n');

  const group = await prisma.group.upsert({
    where: { id: 'demo-group-001' },
    update: { name: 'The Commercial Project', plan: 'MULTI_PLUS' },
    create: { id: 'demo-group-001', name: 'The Commercial Project', plan: 'MULTI_PLUS' },
  });

  const loc1 = await prisma.location.upsert({
    where: { id: 'demo-loc-001' },
    update: {},
    create: { id: 'demo-loc-001', name: 'The Commercial – Zürich HB', address: 'Bahnhofplatz 1, 8001 Zürich', groupId: group.id },
  });
  const loc2 = await prisma.location.upsert({
    where: { id: 'demo-loc-002' },
    update: {},
    create: { id: 'demo-loc-002', name: 'The Commercial – Oerlikon', address: 'Max-Bill-Platz 12, 8050 Zürich', groupId: group.id },
  });
  const loc3 = await prisma.location.upsert({
    where: { id: 'demo-loc-003' },
    update: {},
    create: { id: 'demo-loc-003', name: 'The Commercial – Enge', address: 'Bederstrasse 57, 8002 Zürich', groupId: group.id },
  });

  const employeeDefs = [
    { id: 'demo-emp-001', name: 'Anna Müller',        email: 'anna@commercial.ch',   phone: '+41 79 111 22 33' },
    { id: 'demo-emp-002', name: 'Marc Pérez',          email: 'marc@commercial.ch',   phone: '+41 79 222 33 44' },
    { id: 'demo-emp-003', name: 'Sophie Gerber',       email: 'sophie@commercial.ch', phone: '+41 79 333 44 55' },
    { id: 'demo-emp-004', name: 'Lukas Zimmermann',    email: 'lukas@commercial.ch',  phone: '+41 79 444 55 66' },
    { id: 'demo-emp-005', name: 'Chiara Rossi',        email: 'chiara@commercial.ch', phone: '+41 79 555 66 77' },
    { id: 'demo-emp-006', name: 'David Weber',         email: 'david@commercial.ch',  phone: '+41 79 666 77 88' },
    { id: 'demo-emp-007', name: 'Julia Fischer',       email: 'julia@commercial.ch',  phone: '+41 79 777 88 99' },
    { id: 'demo-emp-008', name: 'Nikos Papadopoulos',  email: 'nikos@commercial.ch',  phone: '+41 79 888 99 00' },
    { id: 'demo-emp-009', name: 'Léa Dubois',          email: 'lea@commercial.ch',    phone: '+41 79 999 00 11' },
  ];

  for (const e of employeeDefs) {
    await prisma.employee.upsert({
      where: { id: e.id },
      update: { name: e.name, email: e.email, phone: e.phone },
      create: { ...e, groupId: group.id },
    });
  }

  const assignments = [
    { eId: 'demo-emp-001', lId: 'demo-loc-001' },
    { eId: 'demo-emp-002', lId: 'demo-loc-001' },
    { eId: 'demo-emp-006', lId: 'demo-loc-001' },
    { eId: 'demo-emp-005', lId: 'demo-loc-001' },
    { eId: 'demo-emp-009', lId: 'demo-loc-001' },
    { eId: 'demo-emp-002', lId: 'demo-loc-002' },
    { eId: 'demo-emp-004', lId: 'demo-loc-002' },
    { eId: 'demo-emp-006', lId: 'demo-loc-002' },
    { eId: 'demo-emp-008', lId: 'demo-loc-002' },
    { eId: 'demo-emp-003', lId: 'demo-loc-002' },
    { eId: 'demo-emp-001', lId: 'demo-loc-003' },
    { eId: 'demo-emp-003', lId: 'demo-loc-003' },
    { eId: 'demo-emp-007', lId: 'demo-loc-003' },
    { eId: 'demo-emp-009', lId: 'demo-loc-003' },
    { eId: 'demo-emp-002', lId: 'demo-loc-003' },
  ];
  for (const a of assignments) {
    await prisma.employeeLocation.upsert({
      where: { employeeId_locationId: { employeeId: a.eId, locationId: a.lId } },
      update: {},
      create: { employeeId: a.eId, locationId: a.lId },
    });
  }

  const hashed = await bcrypt.hash('demo1234', 10);
  await prisma.user.upsert({
    where: { email: 'owner@commercial.ch' },
    update: {},
    create: { email: 'owner@commercial.ch', passwordHash: hashed, role: 'OWNER', groupId: group.id },
  });
  await prisma.user.upsert({
    where: { email: 'manager@commercial.ch' },
    update: {},
    create: { email: 'manager@commercial.ch', passwordHash: hashed, role: 'MANAGER', groupId: group.id },
  });

  const sup1 = await prisma.supplier.upsert({
    where: { id: 'demo-sup-001' },
    update: {},
    create: { id: 'demo-sup-001', name: 'Kaffee Zürich AG', contact: 'Hans Keller', email: 'orders@kaffeezurich.ch', phone: '+41 44 200 10 20', groupId: group.id },
  });
  const sup2 = await prisma.supplier.upsert({
    where: { id: 'demo-sup-002' },
    update: {},
    create: { id: 'demo-sup-002', name: 'Bäckerei Hug AG', contact: 'Maria Hug', email: 'info@hug-bakery.ch', phone: '+41 44 300 20 30', groupId: group.id },
  });
  const sup3 = await prisma.supplier.upsert({
    where: { id: 'demo-sup-003' },
    update: {},
    create: { id: 'demo-sup-003', name: 'Frische Produkte GmbH', contact: 'Peter Frisch', email: 'orders@frische.ch', phone: '+41 44 400 30 40', groupId: group.id },
  });
  const sup4 = await prisma.supplier.upsert({
    where: { id: 'demo-sup-004' },
    update: {},
    create: { id: 'demo-sup-004', name: 'Swiss Dairy Co.', contact: 'Ursula Meier', email: 'supply@swissdairy.ch', phone: '+41 44 500 40 50', groupId: group.id },
  });

  // Clear regenerated data
  await prisma.schedule.deleteMany({ where: { location: { groupId: group.id } } });
  await prisma.order.deleteMany({ where: { location: { groupId: group.id } } });
  await prisma.cashClosing.deleteMany({ where: { location: { groupId: group.id } } });
  await prisma.vacationRequest.deleteMany({ where: { employee: { groupId: group.id } } });
  await prisma.shiftPreference.deleteMany({ where: { employee: { groupId: group.id } } });

  // ── Schedules: 4 weeks ────────────────────────────────────────────────────
  const today = new Date();
  const currentMonday = mondayOf(today);

  type Slot = { eId: string; lId: string; s: string; e: string };
  const weeklyHB: Slot[][] = [
    [ // Mon
      { eId: 'demo-emp-001', lId: 'demo-loc-001', s: '07:00', e: '15:00' },
      { eId: 'demo-emp-006', lId: 'demo-loc-001', s: '09:00', e: '17:00' },
      { eId: 'demo-emp-009', lId: 'demo-loc-001', s: '13:00', e: '21:00' },
    ],
    [ // Tue
      { eId: 'demo-emp-001', lId: 'demo-loc-001', s: '07:00', e: '15:00' },
      { eId: 'demo-emp-005', lId: 'demo-loc-001', s: '10:00', e: '18:00' },
      { eId: 'demo-emp-009', lId: 'demo-loc-001', s: '13:00', e: '21:00' },
    ],
    [ // Wed
      { eId: 'demo-emp-001', lId: 'demo-loc-001', s: '07:00', e: '15:00' },
      { eId: 'demo-emp-006', lId: 'demo-loc-001', s: '09:00', e: '17:00' },
      { eId: 'demo-emp-002', lId: 'demo-loc-001', s: '11:00', e: '19:00' },
    ],
    [ // Thu
      { eId: 'demo-emp-001', lId: 'demo-loc-001', s: '07:00', e: '15:00' },
      { eId: 'demo-emp-005', lId: 'demo-loc-001', s: '10:00', e: '18:00' },
      { eId: 'demo-emp-006', lId: 'demo-loc-001', s: '12:00', e: '20:00' },
    ],
    [ // Fri
      { eId: 'demo-emp-001', lId: 'demo-loc-001', s: '07:00', e: '13:00' },
      { eId: 'demo-emp-002', lId: 'demo-loc-001', s: '10:00', e: '18:00' },
      { eId: 'demo-emp-005', lId: 'demo-loc-001', s: '13:00', e: '21:00' },
      { eId: 'demo-emp-009', lId: 'demo-loc-001', s: '15:00', e: '23:00' },
    ],
    [ // Sat
      { eId: 'demo-emp-005', lId: 'demo-loc-001', s: '09:00', e: '17:00' },
      { eId: 'demo-emp-009', lId: 'demo-loc-001', s: '10:00', e: '18:00' },
      { eId: 'demo-emp-006', lId: 'demo-loc-001', s: '12:00', e: '20:00' },
    ],
    [ // Sun
      { eId: 'demo-emp-005', lId: 'demo-loc-001', s: '10:00', e: '18:00' },
      { eId: 'demo-emp-009', lId: 'demo-loc-001', s: '11:00', e: '19:00' },
    ],
  ];

  const weeklyOerlikon: Slot[][] = [
    [ { eId: 'demo-emp-008', lId: 'demo-loc-002', s: '07:00', e: '15:00' }, { eId: 'demo-emp-004', lId: 'demo-loc-002', s: '09:00', e: '17:00' } ],
    [ { eId: 'demo-emp-008', lId: 'demo-loc-002', s: '07:00', e: '15:00' }, { eId: 'demo-emp-003', lId: 'demo-loc-002', s: '13:00', e: '21:00' } ],
    [ { eId: 'demo-emp-008', lId: 'demo-loc-002', s: '07:00', e: '15:00' }, { eId: 'demo-emp-004', lId: 'demo-loc-002', s: '09:00', e: '17:00' }, { eId: 'demo-emp-002', lId: 'demo-loc-002', s: '13:00', e: '21:00' } ],
    [ { eId: 'demo-emp-004', lId: 'demo-loc-002', s: '09:00', e: '17:00' }, { eId: 'demo-emp-006', lId: 'demo-loc-002', s: '13:00', e: '21:00' } ],
    [ { eId: 'demo-emp-008', lId: 'demo-loc-002', s: '07:00', e: '15:00' }, { eId: 'demo-emp-004', lId: 'demo-loc-002', s: '10:00', e: '18:00' }, { eId: 'demo-emp-003', lId: 'demo-loc-002', s: '14:00', e: '22:00' } ],
    [ { eId: 'demo-emp-004', lId: 'demo-loc-002', s: '09:00', e: '17:00' }, { eId: 'demo-emp-003', lId: 'demo-loc-002', s: '10:00', e: '18:00' } ],
    [ { eId: 'demo-emp-003', lId: 'demo-loc-002', s: '10:00', e: '16:00' }, { eId: 'demo-emp-004', lId: 'demo-loc-002', s: '10:00', e: '16:00' } ],
  ];

  const weeklyEnge: Slot[][] = [
    [ { eId: 'demo-emp-009', lId: 'demo-loc-003', s: '08:00', e: '16:00' }, { eId: 'demo-emp-007', lId: 'demo-loc-003', s: '10:00', e: '18:00' } ],
    [ { eId: 'demo-emp-009', lId: 'demo-loc-003', s: '08:00', e: '16:00' }, { eId: 'demo-emp-003', lId: 'demo-loc-003', s: '14:00', e: '22:00' } ],
    [ { eId: 'demo-emp-001', lId: 'demo-loc-003', s: '08:00', e: '14:00' }, { eId: 'demo-emp-007', lId: 'demo-loc-003', s: '11:00', e: '19:00' } ],
    [ { eId: 'demo-emp-009', lId: 'demo-loc-003', s: '08:00', e: '16:00' }, { eId: 'demo-emp-003', lId: 'demo-loc-003', s: '14:00', e: '22:00' } ],
    [ { eId: 'demo-emp-007', lId: 'demo-loc-003', s: '10:00', e: '18:00' }, { eId: 'demo-emp-002', lId: 'demo-loc-003', s: '12:00', e: '20:00' } ],
    [ { eId: 'demo-emp-007', lId: 'demo-loc-003', s: '09:00', e: '17:00' }, { eId: 'demo-emp-003', lId: 'demo-loc-003', s: '10:00', e: '18:00' }, { eId: 'demo-emp-001', lId: 'demo-loc-003', s: '11:00', e: '19:00' } ],
    [ { eId: 'demo-emp-007', lId: 'demo-loc-003', s: '10:00', e: '17:00' } ],
  ];

  const scheduleInserts: { employeeId: string; locationId: string; date: string; startTime: string; endTime: string }[] = [];
  const locationPatterns = [weeklyHB, weeklyOerlikon, weeklyEnge];

  for (let weekOffset = -3; weekOffset <= 0; weekOffset++) {
    const monday = addDays(currentMonday, weekOffset * 7);
    for (const locPattern of locationPatterns) {
      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const day = addDays(monday, dayIdx);
        const dateStr = fmt(day);
        for (const slot of locPattern[dayIdx]) {
          // ~9% absence simulation in past weeks
          const skipHash = (weekOffset * 31 + dayIdx * 7 + slot.eId.charCodeAt(8)) & 0xFF;
          if (weekOffset < 0 && skipHash % 11 === 0) continue;
          scheduleInserts.push({ employeeId: slot.eId, locationId: slot.lId, date: dateStr, startTime: slot.s, endTime: slot.e });
        }
      }
    }
  }

  await prisma.schedule.createMany({ data: scheduleInserts });
  console.log(`  Torns creats: ${scheduleInserts.length}`);

  // ── Orders ────────────────────────────────────────────────────────────────
  const orders = [
    { supplierId: sup1.id, locationId: loc1.id, status: 'RECEIVED', deliveryAt: fmt(addDays(today, -10)),
      items: JSON.stringify([{ productName: 'Espresso blend premium', quantity: 8, unit: 'kg', unitPrice: 32.50 }, { productName: 'Descafeinat', quantity: 2, unit: 'kg', unitPrice: 34.00 }]),
      notes: 'Entregat sense incidències.' },
    { supplierId: sup2.id, locationId: loc2.id, status: 'RECEIVED', deliveryAt: fmt(addDays(today, -8)),
      items: JSON.stringify([{ productName: 'Croissants mantequilla', quantity: 100, unit: 'u', unitPrice: 0.85 }, { productName: 'Pain au chocolat', quantity: 60, unit: 'u', unitPrice: 0.95 }, { productName: 'Baguette', quantity: 30, unit: 'u', unitPrice: 1.20 }]),
      notes: 'OK. Croissants molt frescos.' },
    { supplierId: sup4.id, locationId: loc3.id, status: 'RECEIVED', deliveryAt: fmt(addDays(today, -5)),
      items: JSON.stringify([{ productName: 'Llet sencera UHT', quantity: 60, unit: 'L', unitPrice: 1.65 }, { productName: 'Nata líquida', quantity: 12, unit: 'L', unitPrice: 2.80 }, { productName: 'Iogurt natural', quantity: 48, unit: 'u', unitPrice: 1.15 }]) },
    { supplierId: sup1.id, locationId: loc1.id, status: 'SENT', deliveryAt: fmt(addDays(today, 2)),
      items: JSON.stringify([{ productName: 'Espresso blend premium', quantity: 10, unit: 'kg', unitPrice: 32.50 }, { productName: 'Cafè Brasil single origin', quantity: 3, unit: 'kg', unitPrice: 41.00 }, { productName: 'Filtres V60 M', quantity: 200, unit: 'u', unitPrice: 0.08 }]),
      notes: 'Entrega dimarts matí, preferiblement abans de les 9h.' },
    { supplierId: sup1.id, locationId: loc2.id, status: 'SENT', deliveryAt: fmt(addDays(today, 2)),
      items: JSON.stringify([{ productName: 'Espresso blend premium', quantity: 6, unit: 'kg', unitPrice: 32.50 }, { productName: 'Descafeinat', quantity: 2, unit: 'kg', unitPrice: 34.00 }]) },
    { supplierId: sup2.id, locationId: loc1.id, status: 'SENT', deliveryAt: fmt(addDays(today, 1)),
      items: JSON.stringify([{ productName: 'Croissants mantequilla', quantity: 80, unit: 'u', unitPrice: 0.85 }, { productName: 'Muffin ametlla', quantity: 40, unit: 'u', unitPrice: 1.10 }, { productName: 'Scones', quantity: 30, unit: 'u', unitPrice: 1.25 }]),
      notes: 'Entrega dijous matí.' },
    { supplierId: sup3.id, locationId: loc3.id, status: 'SENT', deliveryAt: fmt(addDays(today, 3)),
      items: JSON.stringify([{ productName: 'Suc de taronja natural', quantity: 20, unit: 'L', unitPrice: 3.50 }, { productName: 'Fruita de temporada', quantity: 10, unit: 'kg', unitPrice: 4.20 }, { productName: 'Enciams mixtos', quantity: 5, unit: 'kg', unitPrice: 5.80 }]) },
    { supplierId: sup4.id, locationId: loc1.id, status: 'DRAFT',
      items: JSON.stringify([{ productName: 'Llet sencera UHT', quantity: 80, unit: 'L', unitPrice: 1.65 }, { productName: 'Llet d\'avena', quantity: 20, unit: 'L', unitPrice: 2.40 }, { productName: 'Llet d\'ametlla', quantity: 12, unit: 'L', unitPrice: 2.90 }]),
      notes: 'Revisar stock avant de confirmar.' },
    { supplierId: sup2.id, locationId: loc3.id, status: 'DRAFT',
      items: JSON.stringify([{ productName: 'Croissants mantequilla', quantity: 60, unit: 'u', unitPrice: 0.85 }, { productName: 'Carrot cake', quantity: 3, unit: 'u', unitPrice: 18.50 }, { productName: 'Cheesecake NY', quantity: 2, unit: 'u', unitPrice: 22.00 }]) },
    { supplierId: sup3.id, locationId: loc2.id, status: 'DRAFT',
      items: JSON.stringify([{ productName: 'Suc de taronja natural', quantity: 15, unit: 'L', unitPrice: 3.50 }, { productName: 'Tomates cherry', quantity: 3, unit: 'kg', unitPrice: 6.20 }]) },
  ];

  for (const o of orders) {
    await prisma.order.create({ data: o });
  }
  console.log(`  Comandes creades: ${orders.length}`);

  // ── Cash Closings: 14 days ────────────────────────────────────────────────
  const bases: Record<string, { weekday: number; weekend: number }> = {
    [loc1.id]: { weekday: 1850, weekend: 2600 },
    [loc2.id]: { weekday: 1250, weekend: 1750 },
    [loc3.id]: { weekday: 1450, weekend: 2050 },
  };

  const closingInserts: { locationId: string; date: string; openingAmount: number; closingAmount: number; sales: number; cardSales: number; cashSales: number; expenses: number; notes?: string }[] = [];

  for (let dOff = -13; dOff <= 0; dOff++) {
    const d = addDays(today, dOff);
    const dateStr = fmt(d);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    for (const loc of [loc1, loc2, loc3]) {
      const b = bases[loc.id];
      const baseSales = isWeekend ? b.weekend : b.weekday;
      const seed = dOff * 3 + loc.id.charCodeAt(8);
      const sales = vary(baseSales, seed, 80);
      const cardRatio = Math.min(0.85, 0.65 + Math.abs(seed % 5) * 0.04);
      const cardSales = Math.round(sales * cardRatio * 100) / 100;
      const cashSales = Math.round((sales - cardSales) * 100) / 100;
      const expenses = isWeekend ? 25 : 15 + (Math.abs(dOff) % 3) * 8;
      const discrepancy = (seed % 9 === 0) ? -4.5 : (seed % 7 === 0) ? 2.0 : 0;
      const closing = Math.round((200 + cashSales - expenses + discrepancy) * 100) / 100; // drawer holds cash only
      const notes = dOff === -7 && loc.id === loc1.id ? 'TPV avariat a la tarda, algunes vendes en efectiu.'
        : dOff === -3 && loc.id === loc2.id ? 'Mercat proper, +20% clients.'
        : undefined;
      closingInserts.push({ locationId: loc.id, date: dateStr, openingAmount: 200, closingAmount: closing, sales, cardSales, cashSales, expenses, ...(notes ? { notes } : {}) });
    }
  }

  await prisma.cashClosing.createMany({ data: closingInserts });
  console.log(`  Tancaments de caixa creats: ${closingInserts.length}`);

  // ── Vacation Requests ─────────────────────────────────────────────────────
  const vacations = [
    { employeeId: 'demo-emp-001', fromDate: fmt(addDays(today, 28)), toDate: fmt(addDays(today, 35)), reason: 'Vacances d\'estiu a Mallorca', status: 'PENDING' },
    { employeeId: 'demo-emp-003', fromDate: fmt(addDays(today, 7)), toDate: fmt(addDays(today, 9)), reason: 'Assumptes personals', status: 'APPROVED', managerNote: 'Aprovat. Lukas cobrirà els torns.' },
    { employeeId: 'demo-emp-008', fromDate: fmt(addDays(today, 14)), toDate: fmt(addDays(today, 16)), reason: 'Cita mèdica especialista', status: 'APPROVED', managerNote: 'OK. Marc disponible per Oerlikon.' },
    { employeeId: 'demo-emp-005', fromDate: fmt(addDays(today, 3)), toDate: fmt(addDays(today, 4)), reason: 'Viatge de cap de setmana', status: 'REJECTED', managerNote: 'Setmana de molt moviment. Parlem per buscar alternativa.' },
    { employeeId: 'demo-emp-004', fromDate: fmt(addDays(today, 42)), toDate: fmt(addDays(today, 56)), reason: 'Vacances estiu (3 setmanes)', status: 'PENDING' },
    { employeeId: 'demo-emp-007', fromDate: fmt(addDays(today, 21)), toDate: fmt(addDays(today, 22)), reason: 'Casament familiar', status: 'APPROVED', managerNote: 'Aprovat. Bon profit!' },
  ];
  for (const v of vacations) {
    await prisma.vacationRequest.create({ data: v });
  }
  console.log(`  Vacances creades: ${vacations.length}`);

  // ── Shift Preferences ─────────────────────────────────────────────────────
  const prefs = [
    { eId: 'demo-emp-001', day: 'MON', s: '07:00', e: '15:00', lId: loc1.id, notes: 'Prefereixo matins al HB' },
    { eId: 'demo-emp-001', day: 'TUE', s: '07:00', e: '15:00', lId: loc1.id },
    { eId: 'demo-emp-001', day: 'WED', s: '08:00', e: '14:00', lId: loc3.id, notes: 'Dimecres Enge si possible' },
    { eId: 'demo-emp-001', day: 'THU', s: '07:00', e: '15:00', lId: loc1.id },
    { eId: 'demo-emp-001', day: 'FRI', s: '07:00', e: '13:00', lId: loc1.id, notes: 'Divendres sortida aviat' },
    { eId: 'demo-emp-002', day: 'MON', s: '10:00', e: '18:00', lId: null },
    { eId: 'demo-emp-002', day: 'WED', s: '10:00', e: '18:00', lId: loc2.id, notes: 'Dimecres prefereixo Oerlikon' },
    { eId: 'demo-emp-002', day: 'FRI', s: '11:00', e: '19:00', lId: null },
    { eId: 'demo-emp-002', day: 'SAT', s: '09:00', e: '14:00', lId: null },
    { eId: 'demo-emp-003', day: 'TUE', s: '14:00', e: '22:00', lId: loc2.id, notes: 'Tardes' },
    { eId: 'demo-emp-003', day: 'THU', s: '14:00', e: '22:00', lId: loc3.id },
    { eId: 'demo-emp-003', day: 'FRI', s: '14:00', e: '22:00', lId: loc2.id },
    { eId: 'demo-emp-003', day: 'SAT', s: '10:00', e: '18:00', lId: loc2.id },
    { eId: 'demo-emp-003', day: 'SUN', s: '10:00', e: '16:00', lId: loc3.id },
    { eId: 'demo-emp-004', day: 'MON', s: '09:00', e: '17:00', lId: loc2.id },
    { eId: 'demo-emp-004', day: 'TUE', s: '09:00', e: '17:00', lId: loc2.id },
    { eId: 'demo-emp-004', day: 'WED', s: '09:00', e: '17:00', lId: loc2.id },
    { eId: 'demo-emp-004', day: 'THU', s: '09:00', e: '17:00', lId: loc2.id },
    { eId: 'demo-emp-004', day: 'FRI', s: '10:00', e: '18:00', lId: loc2.id },
    { eId: 'demo-emp-005', day: 'TUE', s: '10:00', e: '18:00', lId: loc1.id },
    { eId: 'demo-emp-005', day: 'THU', s: '10:00', e: '18:00', lId: loc1.id },
    { eId: 'demo-emp-005', day: 'SAT', s: '09:00', e: '17:00', lId: loc1.id },
    { eId: 'demo-emp-006', day: 'MON', s: '09:00', e: '17:00', lId: loc1.id },
    { eId: 'demo-emp-006', day: 'WED', s: '09:00', e: '17:00', lId: loc1.id },
    { eId: 'demo-emp-006', day: 'THU', s: '13:00', e: '21:00', lId: loc2.id, notes: 'Dijous tarda Oerlikon' },
    { eId: 'demo-emp-006', day: 'FRI', s: '09:00', e: '17:00', lId: loc1.id },
    { eId: 'demo-emp-007', day: 'FRI', s: '10:00', e: '18:00', lId: loc3.id },
    { eId: 'demo-emp-007', day: 'SAT', s: '09:00', e: '17:00', lId: loc3.id },
    { eId: 'demo-emp-007', day: 'SUN', s: '10:00', e: '17:00', lId: loc3.id },
    { eId: 'demo-emp-008', day: 'MON', s: '07:00', e: '15:00', lId: loc2.id },
    { eId: 'demo-emp-008', day: 'TUE', s: '07:00', e: '15:00', lId: loc2.id },
    { eId: 'demo-emp-008', day: 'WED', s: '07:00', e: '15:00', lId: loc2.id },
    { eId: 'demo-emp-008', day: 'FRI', s: '07:00', e: '15:00', lId: loc2.id },
    { eId: 'demo-emp-009', day: 'MON', s: '13:00', e: '21:00', lId: loc1.id },
    { eId: 'demo-emp-009', day: 'TUE', s: '13:00', e: '21:00', lId: loc1.id },
    { eId: 'demo-emp-009', day: 'WED', s: '08:00', e: '16:00', lId: loc3.id, notes: 'Dimecres prefereixo Enge' },
    { eId: 'demo-emp-009', day: 'FRI', s: '15:00', e: '23:00', lId: loc1.id },
  ];
  for (const p of prefs) {
    await prisma.shiftPreference.create({
      data: { employeeId: p.eId, dayOfWeek: p.day, startTime: p.s, endTime: p.e, locationId: p.lId ?? null, notes: p.notes ?? null },
    });
  }
  console.log(`  Preferències de torn creades: ${prefs.length}`);

  console.log('\n Demo completada!\n');
  console.log('  Grup:      The Commercial Project (MULTI_PLUS)');
  console.log('  Locals:    3  (HB · Oerlikon · Enge)');
  console.log('  Empleats:  9');
  console.log('  Login:     owner@commercial.ch');
  console.log('  Password:  demo1234\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
