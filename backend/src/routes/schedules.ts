import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

const TimeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const ScheduleSchema = z.object({
  employeeId: z.string().min(1),
  locationId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de data invàlid (YYYY-MM-DD)'),
  startTime: z.string().regex(TimeRegex, "Format d'hora invàlid (HH:MM)"),
  endTime: z.string().regex(TimeRegex, "Format d'hora invàlid (HH:MM)"),
  notes: z.string().optional().nullable(),
});

// GET /api/schedules
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { locationId, employeeId, from, to } = req.query as Record<string, string | undefined>;

    if (locationId) {
      const loc = await prisma.location.findFirst({ where: { id: locationId, groupId: req.user!.groupId } });
      if (!loc) throw createError('Local no trobat', 404);
    }

    const schedules = await prisma.schedule.findMany({
      where: {
        ...(locationId && { locationId }),
        ...(employeeId && { employeeId }),
        ...(from && { date: { gte: from } }),
        ...(to && { date: { lte: to } }),
        employee: { groupId: req.user!.groupId },
      },
      include: {
        employee: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    res.json({ success: true, data: schedules });
  } catch (err) { next(err); }
});

// POST /api/schedules
router.post('/', authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = ScheduleSchema.parse(req.body);

    const [employee, location] = await Promise.all([
      prisma.employee.findFirst({ where: { id: body.employeeId, groupId: req.user!.groupId } }),
      prisma.location.findFirst({ where: { id: body.locationId, groupId: req.user!.groupId } }),
    ]);
    if (!employee) throw createError('Empleat no trobat', 404);
    if (!location) throw createError('Local no trobat', 404);

    const schedule = await prisma.schedule.create({
      data: body,
      include: {
        employee: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });
    res.status(201).json({ success: true, data: schedule });
  } catch (err) { next(err); }
});

// GET /api/schedules/:id
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schedule = await prisma.schedule.findFirst({
      where: { id: req.params.id, employee: { groupId: req.user!.groupId } },
      include: {
        employee: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });
    if (!schedule) throw createError('Torn no trobat', 404);
    res.json({ success: true, data: schedule });
  } catch (err) { next(err); }
});

// PUT /api/schedules/:id
router.put('/:id', authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = ScheduleSchema.parse(req.body);
    const existing = await prisma.schedule.findFirst({ where: { id: req.params.id, employee: { groupId: req.user!.groupId } } });
    if (!existing) throw createError('Torn no trobat', 404);

    const schedule = await prisma.schedule.update({
      where: { id: req.params.id },
      data: body,
      include: {
        employee: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });
    res.json({ success: true, data: schedule });
  } catch (err) { next(err); }
});

// PATCH /api/schedules/:id
router.patch('/:id', authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = ScheduleSchema.partial().parse(req.body);
    const existing = await prisma.schedule.findFirst({ where: { id: req.params.id, employee: { groupId: req.user!.groupId } } });
    if (!existing) throw createError('Torn no trobat', 404);

    const schedule = await prisma.schedule.update({
      where: { id: req.params.id },
      data: body,
      include: {
        employee: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });
    res.json({ success: true, data: schedule });
  } catch (err) { next(err); }
});

// DELETE /api/schedules/:id
router.delete('/:id', authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.schedule.findFirst({ where: { id: req.params.id, employee: { groupId: req.user!.groupId } } });
    if (!existing) throw createError('Torn no trobat', 404);
    await prisma.schedule.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Torn eliminat correctament' });
  } catch (err) { next(err); }
});

export default router;
