import { Router, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

// ─── GET /api/analytics/cash ──────────────────────────────────────────────────
// Estadístiques de tancaments: mitjana per dia de la setmana, tendència, previsió

router.get('/cash', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { locationId } = req.query as { locationId?: string };

    const closings = await prisma.cashClosing.findMany({
      where: {
        location: { groupId: req.user!.groupId },
        ...(locationId && { locationId }),
      },
      include: { location: { select: { id: true, name: true } } },
      orderBy: { date: 'asc' },
    });

    if (closings.length === 0) {
      return res.json({ success: true, data: { byDayOfWeek: [], trend: [], forecast: [], summary: null } });
    }

    // Mitjana de vendes per dia de la setmana (0=Dg, 1=Dl...6=Ds).
    // Les etiquetes són codis ISO curts; el frontend els tradueix.
    const dayNames = DAY_CODES;
    const byDay: Record<number, { total: number; count: number }> = {};
    for (let i = 0; i < 7; i++) byDay[i] = { total: 0, count: 0 };

    closings.forEach((c) => {
      const d = parseLocalDate(c.date);
      const dow = d.getDay();
      byDay[dow].total += Number(c.sales);
      byDay[dow].count += 1;
    });

    const byDayOfWeek = Object.entries(byDay)
      .filter(([, v]) => v.count > 0)
      .map(([day, v]) => ({
        day: Number(day),
        label: dayNames[Number(day)],
        avg: Math.round(v.total / v.count),
        count: v.count,
      }))
      .sort((a, b) => a.day - b.day);

    // Tendència setmanal (últimes 8 setmanes)
    const weeklyMap: Record<string, { sales: number; dates: Set<string>; expenses: number }> = {};
    closings.forEach((c) => {
      const d = parseLocalDate(c.date);
      // Setmana ISO: any-setmana
      const weekNum = getISOWeek(d);
      const key = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      if (!weeklyMap[key]) weeklyMap[key] = { sales: 0, dates: new Set(), expenses: 0 };
      weeklyMap[key].sales += Number(c.sales);
      weeklyMap[key].expenses += Number(c.expenses);
      weeklyMap[key].dates.add(c.date);
    });

    const trend = Object.entries(weeklyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([week, v]) => ({
        week,
        sales: Math.round(v.sales),
        expenses: Math.round(v.expenses),
        net: Math.round(v.sales - v.expenses),
        days: v.dates.size,
      }));

    // Previsió propera setmana (basada en mitjana per dia de la setmana)
    const forecast = [];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dow = d.getDay();
      const avg = byDay[dow].count > 0 ? Math.round(byDay[dow].total / byDay[dow].count) : 0;
      forecast.push({
        date: toLocalISO(d),
        label: dayNames[dow],
        predicted: avg,
      });
    }

    // Resum global
    const totalSales = closings.reduce((s, c) => s + Number(c.sales), 0);
    const totalExpenses = closings.reduce((s, c) => s + Number(c.expenses), 0);
    const maxDay = byDayOfWeek.reduce((max, d) => d.avg > max.avg ? d : max, byDayOfWeek[0]);
    const minDay = byDayOfWeek.reduce((min, d) => d.avg < min.avg ? d : min, byDayOfWeek[0]);

    const summary = {
      totalClosings: closings.length,
      avgDailySales: Math.round(totalSales / closings.length),
      totalSales: Math.round(totalSales),
      totalExpenses: Math.round(totalExpenses),
      bestDay: maxDay,
      worstDay: minDay,
    };

    res.json({ success: true, data: { byDayOfWeek, trend, forecast, summary } });
  } catch (err) { next(err); }
});

// ─── GET /api/analytics/orders ────────────────────────────────────────────────
// Anàlisi de patrons de comandes: productes habituals, freqüència, suggeriments

router.get('/orders', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      where: { location: { groupId: req.user!.groupId } },
      include: {
        supplier: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (orders.length === 0) {
      return res.json({ success: true, data: { topProducts: [], supplierFrequency: [], suggestions: [] } });
    }

    // Productes més demanats
    const productMap: Record<string, { name: string; totalQty: number; count: number; lastUnit: string; supplierId: string; supplierName: string }> = {};
    orders.forEach((order) => {
      let items: { productName: string; quantity: number; unit: string }[] = [];
      try { items = JSON.parse(order.items as string); } catch { return; }
      items.forEach((item) => {
        const key = `${order.supplierId}::${item.productName.toLowerCase()}`;
        if (!productMap[key]) {
          productMap[key] = {
            name: item.productName,
            totalQty: 0,
            count: 0,
            lastUnit: item.unit,
            supplierId: order.supplierId,
            supplierName: order.supplier.name,
          };
        }
        productMap[key].totalQty += item.quantity;
        productMap[key].count += 1;
        productMap[key].lastUnit = item.unit;
      });
    });

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((p) => ({
        ...p,
        avgQty: Math.round((p.totalQty / p.count) * 10) / 10,
      }));

    // Freqüència per proveïdor
    const supplierMap: Record<string, { name: string; count: number; lastDate: string }> = {};
    orders.forEach((o) => {
      if (!supplierMap[o.supplierId]) {
        supplierMap[o.supplierId] = { name: o.supplier.name, count: 0, lastDate: o.createdAt.toISOString() };
      }
      supplierMap[o.supplierId].count += 1;
      if (o.createdAt.toISOString() > supplierMap[o.supplierId].lastDate) {
        supplierMap[o.supplierId].lastDate = o.createdAt.toISOString();
      }
    });

    const supplierFrequency = Object.entries(supplierMap).map(([id, v]) => {
      const daysSinceLast = Math.floor((Date.now() - new Date(v.lastDate).getTime()) / 86400000);
      // Calcula interval mitjà entre comandes
      const supplierOrders = orders
        .filter((o) => o.supplierId === id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      let avgInterval = 0;
      if (supplierOrders.length > 1) {
        const intervals = supplierOrders.slice(1).map((o, i) =>
          (new Date(o.createdAt).getTime() - new Date(supplierOrders[i].createdAt).getTime()) / 86400000
        );
        avgInterval = Math.round(intervals.reduce((s, x) => s + x, 0) / intervals.length);
      }

      return {
        supplierId: id,
        supplierName: v.name,
        totalOrders: v.count,
        lastOrderDate: v.lastDate,
        daysSinceLast,
        avgIntervalDays: avgInterval,
        overdue: avgInterval > 0 && daysSinceLast > avgInterval * 1.2,
      };
    }).sort((a, b) => b.totalOrders - a.totalOrders);

    // Suggeriments: productes habituals que fa temps que no es comanden
    const suggestions = topProducts
      .filter((p) => {
        const sup = supplierFrequency.find((s) => s.supplierId === p.supplierId);
        return sup?.overdue;
      })
      .map((p) => ({
        productName: p.name,
        suggestedQty: p.avgQty,
        unit: p.lastUnit,
        supplierId: p.supplierId,
        supplierName: p.supplierName,
        reason: 'usual',
      }));

    res.json({ success: true, data: { topProducts, supplierFrequency, suggestions } });
  } catch (err) { next(err); }
});

// ─── GET /api/analytics/staffing ─────────────────────────────────────────────
// Cobertura de torns properes 2 setmanes

router.get('/staffing', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const today = toLocalISO(new Date());
    const twoWeeks = toLocalISO(new Date(Date.now() + 14 * 86400000));

    const [schedules, locations, employees] = await Promise.all([
      prisma.schedule.findMany({
        where: {
          employee: { groupId: req.user!.groupId },
          date: { gte: today, lte: twoWeeks },
        },
        include: {
          employee: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
        },
      }),
      prisma.location.findMany({ where: { groupId: req.user!.groupId } }),
      prisma.employee.findMany({ where: { groupId: req.user!.groupId } }),
    ]);

    // Agrupa per data
    const byDate: Record<string, { date: string; shifts: number; employees: string[] }> = {};
    schedules.forEach((s) => {
      if (!byDate[s.date]) byDate[s.date] = { date: s.date, shifts: 0, employees: [] };
      byDate[s.date].shifts += 1;
      if (!byDate[s.date].employees.includes(s.employee.name)) {
        byDate[s.date].employees.push(s.employee.name);
      }
    });

    const coverage = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.now() + i * 86400000);
      const date = toLocalISO(d);
      const data = byDate[date];
      return {
        date,
        dayLabel: DAY_CODES[d.getDay()],
        shifts: data?.shifts ?? 0,
        employees: data?.employees ?? [],
        covered: (data?.shifts ?? 0) >= locations.length,
      };
    });

    res.json({
      success: true,
      data: {
        coverage,
        totalLocations: locations.length,
        totalEmployees: employees.length,
        coveredDays: coverage.filter((d) => d.covered).length,
        uncoveredDays: coverage.filter((d) => !d.covered).length,
      },
    });
  } catch (err) { next(err); }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Short ISO-like day codes, index 0 = Sunday (matches Date#getDay). */
const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** Parses "YYYY-MM-DD" as a local date (avoids the UTC shift of `new Date(str)`). */
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toLocalISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ─── Helper: número de setmana ISO ────────────────────────────────────────────
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export default router;
