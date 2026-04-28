import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../types';

const router = Router();

router.use(authenticate);

// ─── Schemas ─────────────────────────────────────────────────────────────────

const LocationSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
});

// ─── GET /api/locations ───────────────────────────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const locations = await prisma.location.findMany({
      where: { groupId: req.user!.groupId },
      include: {
        _count: { select: { employees: true, schedules: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: locations });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/locations ──────────────────────────────────────────────────────

router.post('/', authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = LocationSchema.parse(req.body);

    const location = await prisma.location.create({
      data: { ...body, groupId: req.user!.groupId },
    });

    res.status(201).json({ success: true, data: location });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/locations/:id ───────────────────────────────────────────────────

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const location = await prisma.location.findFirst({
      where: { id: req.params.id, groupId: req.user!.groupId },
      include: {
        employees: { include: { employee: true } },
        _count: { select: { schedules: true, orders: true, cashClosings: true } },
      },
    });

    if (!location) throw createError('Local no trobat', 404);

    res.json({ success: true, data: location });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/locations/:id ─────────────────────────────────────────────────

router.patch('/:id', authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = LocationSchema.partial().parse(req.body);

    // Verify ownership
    const existing = await prisma.location.findFirst({
      where: { id: req.params.id, groupId: req.user!.groupId },
    });
    if (!existing) throw createError('Local no trobat', 404);

    const location = await prisma.location.update({
      where: { id: req.params.id },
      data: body,
    });

    res.json({ success: true, data: location });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/locations/:id ────────────────────────────────────────────────

router.delete('/:id', authorize('OWNER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.location.findFirst({
      where: { id: req.params.id, groupId: req.user!.groupId },
    });
    if (!existing) throw createError('Local no trobat', 404);

    await prisma.location.delete({ where: { id: req.params.id } });

    res.json({ success: true, message: 'Local eliminat correctament' });
  } catch (err) {
    next(err);
  }
});

export default router;
