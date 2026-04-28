import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

const CashClosingSchema = z.object({
  locationId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de data invàlid (YYYY-MM-DD)'),
  openingAmount: z.number().nonnegative(),
  closingAmount: z.number().nonnegative(),
  sales: z.number().nonnegative(),
  cardSales: z.number().nonnegative().default(0),
  cashSales: z.number().nonnegative().default(0),
  expenses: z.number().nonnegative().default(0),
  notes: z.string().optional().nullable(),
});

// GET /api/cash-closings
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { locationId, from, to } = req.query as Record<string, string | undefined>;

    const closings = await prisma.cashClosing.findMany({
      where: {
        location: { groupId: req.user!.groupId },
        ...(locationId && { locationId }),
        ...(from && { date: { gte: from } }),
        ...(to && { date: { lte: to } }),
      },
      include: { location: { select: { id: true, name: true } } },
      orderBy: [{ date: 'desc' }],
    });

    res.json({ success: true, data: closings });
  } catch (err) { next(err); }
});

// POST /api/cash-closings
router.post('/', authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = CashClosingSchema.parse(req.body);

    const location = await prisma.location.findFirst({ where: { id: body.locationId, groupId: req.user!.groupId } });
    if (!location) throw createError('Local no trobat', 404);

    const existing = await prisma.cashClosing.findUnique({
      where: { locationId_date: { locationId: body.locationId, date: body.date } },
    });
    if (existing) throw createError('Ja existeix un tancament per aquest local i data', 409);

    const closing = await prisma.cashClosing.create({
      data: body,
      include: { location: { select: { id: true, name: true } } },
    });

    res.status(201).json({ success: true, data: closing });
  } catch (err) { next(err); }
});

// GET /api/cash-closings/:id
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const closing = await prisma.cashClosing.findFirst({
      where: { id: req.params.id, location: { groupId: req.user!.groupId } },
      include: { location: { select: { id: true, name: true } } },
    });
    if (!closing) throw createError('Tancament no trobat', 404);
    res.json({ success: true, data: closing });
  } catch (err) { next(err); }
});

// PUT /api/cash-closings/:id
router.put('/:id', authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = CashClosingSchema.parse(req.body);
    const existing = await prisma.cashClosing.findFirst({ where: { id: req.params.id, location: { groupId: req.user!.groupId } } });
    if (!existing) throw createError('Tancament no trobat', 404);

    const closing = await prisma.cashClosing.update({
      where: { id: req.params.id },
      data: body,
      include: { location: { select: { id: true, name: true } } },
    });
    res.json({ success: true, data: closing });
  } catch (err) { next(err); }
});

// DELETE /api/cash-closings/:id
router.delete('/:id', authorize('OWNER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.cashClosing.findFirst({ where: { id: req.params.id, location: { groupId: req.user!.groupId } } });
    if (!existing) throw createError('Tancament no trobat', 404);
    await prisma.cashClosing.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Tancament eliminat correctament' });
  } catch (err) { next(err); }
});

export default router;
