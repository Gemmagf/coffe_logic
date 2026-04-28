import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

// ─── Schema ───────────────────────────────────────────────────────────────────

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
const TimeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const PreferenceSchema = z.object({
  employeeId: z.string().min(1),
  dayOfWeek: z.enum(DAYS),
  startTime: z.string().regex(TimeRegex, "Format d'hora invàlid (HH:MM)"),
  endTime: z.string().regex(TimeRegex, "Format d'hora invàlid (HH:MM)"),
  locationId: z.string().min(1).optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ─── GET /api/preferences ─────────────────────────────────────────────────────
// Query: employeeId

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employeeId } = req.query as { employeeId?: string };

    const prefs = await prisma.shiftPreference.findMany({
      where: {
        employee: { groupId: req.user!.groupId },
        ...(employeeId && { employeeId }),
      },
      include: {
        employee: { select: { id: true, name: true } },
      },
      orderBy: [
        { employeeId: 'asc' },
        // Ordre lògic de dies de la setmana
        { dayOfWeek: 'asc' },
      ],
    });

    // Reordena per ordre natural de la setmana
    const dayOrder = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6 };
    prefs.sort((a, b) => dayOrder[a.dayOfWeek as keyof typeof dayOrder] - dayOrder[b.dayOfWeek as keyof typeof dayOrder]);

    res.json({ success: true, data: prefs });
  } catch (err) { next(err); }
});

// ─── POST /api/preferences ────────────────────────────────────────────────────

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = PreferenceSchema.parse(req.body);

    const employee = await prisma.employee.findFirst({
      where: { id: body.employeeId, groupId: req.user!.groupId },
    });
    if (!employee) throw createError('Empleat no trobat', 404);

    if (body.locationId) {
      const loc = await prisma.location.findFirst({ where: { id: body.locationId, groupId: req.user!.groupId } });
      if (!loc) throw createError('Local no trobat', 404);
    }

    // upsert: si ja existeix preferència per aquest dia, actualitza-la
    const pref = await prisma.shiftPreference.upsert({
      where: {
        employeeId_dayOfWeek: {
          employeeId: body.employeeId,
          dayOfWeek: body.dayOfWeek,
        },
      },
      create: body,
      update: {
        startTime: body.startTime,
        endTime: body.endTime,
        locationId: body.locationId ?? null,
        notes: body.notes ?? null,
      },
      include: { employee: { select: { id: true, name: true } } },
    });

    res.status(201).json({ success: true, data: pref });
  } catch (err) { next(err); }
});

// ─── DELETE /api/preferences/:id ─────────────────────────────────────────────

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.shiftPreference.findFirst({
      where: { id: req.params.id, employee: { groupId: req.user!.groupId } },
    });
    if (!existing) throw createError('Preferència no trobada', 404);

    await prisma.shiftPreference.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Preferència eliminada' });
  } catch (err) { next(err); }
});

export default router;
