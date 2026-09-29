import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
// The demo datasets are shared with the serverless frontend demo so both stay identical.
import { DATASETS, type DatasetDef, genSchedules, genClosings, fmt, addDays } from '../../shared/demo-dataset';

const prisma = new PrismaClient();

async function seedDataset(ds: DatasetDef) {
  console.log(`\n${ds.group.name}`);
  const group = await prisma.group.upsert({
    where: { id: ds.group.id },
    update: { name: ds.group.name, plan: ds.group.plan },
    create: { id: ds.group.id, name: ds.group.name, plan: ds.group.plan },
  });

  for (const l of ds.locations) {
    await prisma.location.upsert({ where: { id: l.id }, update: { name: l.name, address: l.address }, create: { ...l, groupId: group.id } });
  }
  await prisma.location.deleteMany({ where: { groupId: group.id, id: { notIn: ds.locations.map((l) => l.id) } } });

  for (const e of ds.employees) {
    const data = { name: e.name, email: e.email || null, phone: e.phone || null, position: e.position, weeklyHours: e.weeklyHours };
    await prisma.employee.upsert({ where: { id: e.id }, update: data, create: { id: e.id, ...data, groupId: group.id } });
    await prisma.employeeLocation.deleteMany({ where: { employeeId: e.id } });
    await prisma.employeeLocation.createMany({ data: e.locations.map((locationId) => ({ employeeId: e.id, locationId })) });
  }
  await prisma.employee.deleteMany({ where: { groupId: group.id, id: { notIn: ds.employees.map((e) => e.id) } } });

  for (const s of ds.suppliers) {
    await prisma.supplier.upsert({ where: { id: s.id }, update: s, create: { ...s, groupId: group.id } });
  }

  for (const u of ds.users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { username: u.username, passwordHash, role: u.role, groupId: group.id },
      create: { id: u.id, email: u.email, username: u.username, passwordHash, role: u.role, groupId: group.id },
    });
  }

  // Regenerated, date-relative data
  await prisma.schedule.deleteMany({ where: { location: { groupId: group.id } } });
  await prisma.order.deleteMany({ where: { location: { groupId: group.id } } });
  await prisma.cashClosing.deleteMany({ where: { location: { groupId: group.id } } });
  await prisma.vacationRequest.deleteMany({ where: { employee: { groupId: group.id } } });
  await prisma.shiftPreference.deleteMany({ where: { employee: { groupId: group.id } } });
  await prisma.supplier.deleteMany({ where: { groupId: group.id, id: { notIn: ds.suppliers.map((s) => s.id) } } });

  const today = new Date();
  const schedules = genSchedules(ds, today);
  await prisma.schedule.createMany({ data: schedules });

  for (const o of ds.orders) {
    const createdAt = addDays(today, o.created); createdAt.setHours(9, 30, 0, 0);
    await prisma.order.create({
      data: {
        id: o.id, supplierId: o.sup, locationId: o.loc, status: o.status, items: JSON.stringify(o.items),
        notes: o.notes ?? null, deliveryAt: o.delivery !== undefined ? fmt(addDays(today, o.delivery)) : null, createdAt,
      },
    });
  }

  const closings = genClosings(ds, today);
  await prisma.cashClosing.createMany({ data: closings });

  for (const v of ds.vacations) {
    await prisma.vacationRequest.create({ data: { employeeId: v.employeeId, fromDate: fmt(addDays(today, v.from)), toDate: fmt(addDays(today, v.to)), reason: v.reason, status: v.status, managerNote: v.managerNote } });
  }
  for (const p of ds.preferences) {
    await prisma.shiftPreference.create({ data: { employeeId: p.e, dayOfWeek: p.day, startTime: p.s, endTime: p.end, locationId: p.l, notes: p.notes } });
  }

  console.log(`  locations ${ds.locations.length} · employees ${ds.employees.length} · suppliers ${ds.suppliers.length} · shifts ${schedules.length} · orders ${ds.orders.length} · closings ${closings.length}`);
  for (const u of ds.users) console.log(`  ${u.role.toLowerCase().padEnd(8)} ${u.username}  /  ${u.password}`);
}

async function main() {
  console.log('Seeding demo datasets…');
  // Old accounts from previous seeds
  await prisma.user.deleteMany({ where: { email: { in: ['owner@commercial.ch', 'manager@commercial.ch', 'owner@mosaik-kaffee.ch'] } } });
  for (const ds of Object.values(DATASETS)) await seedDataset(ds);
  console.log('\nDone.\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
