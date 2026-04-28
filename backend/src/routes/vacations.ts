import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

// ─── Schemas ─────────────────────────────────────────────────────────────────

const DateRegex = /^\d{4}-\d{2}-\d{2}$/;

const VacationSchema = z.object({
  employeeId: z.string().min(1),
  fromDate: z.string().regex(DateRegex, 'Format de data invàlid (YYYY-MM-DD)'),
  toDate: z.string().regex(DateRegex, 'Format de data invàlid (YYYY-MM-DD)'),
  reason: z.string().optional().nullable(),
}).refine((d) => d.fromDate <= d.toDate, {
  message: 'La data d\'inici ha de ser anterior o igual a la data de fi',
  path: ['toDate'],
});

const StatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  managerNote: z.string().optional().nullable(),
});

// ─── GET /api/vacations ───────────────────────────────────────────────────────
// Query: employeeId, status, from, to

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employeeId, status, from, to } = req.query as Record<string, string | undefined>;

    const vacations = await prisma.vacationRequest.findMany({
      where: {
        employee: { groupId: req.user!.groupId },
        ...(employeeId && { employeeId }),
        ...(status && { status }),
        ...(from && { fromDate: { gte: from } }),
        ...(to && { toDate: { lte: to } }),
      },
      include: {
        employee: { select: { id: true, name: true } },
      },
      orderBy: [{ status: 'asc' }, { fromDate: 'asc' }],
    });

    res.json({ success: true, data: vacations });
  } catch (err) { next(err); }
});

// ─── POST /api/vacations ──────────────────────────────────────────────────────

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = VacationSchema.parse(req.body);

    const employee = await prisma.employee.findFirst({
      where: { id: body.employeeId, groupId: req.user!.groupId },
    });
    if (!employee) throw createError('Empleat no trobat', 404);

    // Comprova solapaments amb vacances aprovades o pendents
    const overlap = await prisma.vacationRequest.findFirst({
      where: {
        employeeId: body.employeeId,
        status: { not: 'REJECTED' },
        fromDate: { lte: body.toDate },
        toDate: { gte: body.fromDate },
      },
    });
    if (overlap) throw createError('Ja existeix una sol·licitud que se solapa amb aquestes dates', 409);

    const vacation = await prisma.vacationRequest.create({
      data: body,
      include: { employee: { select: { id: true, name: true } } },
    });

    res.status(201).json({ success: true, data: vacation });
  } catch (err) { next(err); }
});

// ─── GET /api/vacations/:id ───────────────────────────────────────────────────

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vacation = await prisma.vacationRequest.findFirst({
      where: { id: req.params.id, employee: { groupId: req.user!.groupId } },
      include: { employee: { select: { id: true, name: true } } },
    });
    if (!vacation) throw createError('Sol·licitud no trobada', 404);
    res.json({ success: true, data: vacation });
  } catch (err) { next(err); }
});

// ─── PATCH /api/vacations/:id/status — aprovar o rebutjar (OWNER/MANAGER) ────

router.patch('/:id/status', authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, managerNote } = StatusSchema.parse(req.body);

    const existing = await prisma.vacationRequest.findFirst({
      where: { id: req.params.id, employee: { groupId: req.user!.groupId } },
    });
    if (!existing) throw createError('Sol·licitud no trobada', 404);
    if (existing.status !== 'PENDING') throw createError('Només es poden gestionar sol·licituds pendents', 400);

    const vacation = await prisma.vacationRequest.update({
      where: { id: req.params.id },
      data: { status, managerNote: managerNote ?? null },
      include: { employee: { select: { id: true, name: true } } },
    });

    res.json({ success: true, data: vacation });
  } catch (err) { next(err); }
});

// ─── DELETE /api/vacations/:id — cancel·lar (només si PENDING) ───────────────

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.vacationRequest.findFirst({
      where: { id: req.params.id, employee: { groupId: req.user!.groupId } },
    });
    if (!existing) throw createError('Sol·licitud no trobada', 404);
    if (existing.status === 'APPROVED') throw createError('No es pot cancel·lar una sol·licitud aprovada', 400);

    await prisma.vacationRequest.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Sol·licitud cancel·lada' });
  } catch (err) { next(err); }
});

export default router;
