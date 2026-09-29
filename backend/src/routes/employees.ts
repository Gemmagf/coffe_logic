import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../types';

const router = Router();

router.use(authenticate);

// ─── Schemas ─────────────────────────────────────────────────────────────────

const EmployeeSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  weeklyHours: z.number().int().min(0).max(80).optional().nullable(),
  locationIds: z.array(z.string()).optional(),
});

// ─── GET /api/employees ───────────────────────────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { locationId } = req.query as { locationId?: string };

    const employees = await prisma.employee.findMany({
      where: {
        groupId: req.user!.groupId,
        ...(locationId && {
          locations: { some: { locationId } },
        }),
      },
      include: {
        locations: { include: { location: { select: { id: true, name: true } } } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: employees });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/employees ──────────────────────────────────────────────────────

router.post('/', authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { locationIds, ...rest } = EmployeeSchema.parse(req.body);

    const employee = await prisma.employee.create({
      data: {
        ...rest,
        groupId: req.user!.groupId,
        locations: locationIds?.length
          ? { create: locationIds.map((locationId) => ({ locationId })) }
          : undefined,
      },
      include: {
        locations: { include: { location: { select: { id: true, name: true } } } },
      },
    });

    res.status(201).json({ success: true, data: employee });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/employees/:id ───────────────────────────────────────────────────

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const employee = await prisma.employee.findFirst({
      where: { id: req.params.id, groupId: req.user!.groupId },
      include: {
        locations: { include: { location: true } },
        schedules: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });

    if (!employee) throw createError('Empleat no trobat', 404);

    res.json({ success: true, data: employee });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/employees/:id ─────────────────────────────────────────────────

router.patch('/:id', authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { locationIds, ...rest } = EmployeeSchema.partial().parse(req.body);

    const existing = await prisma.employee.findFirst({
      where: { id: req.params.id, groupId: req.user!.groupId },
    });
    if (!existing) throw createError('Empleat no trobat', 404);

    const employee = await prisma.$transaction(async (tx) => {
      if (locationIds !== undefined) {
        await tx.employeeLocation.deleteMany({ where: { employeeId: req.params.id } });
        if (locationIds.length > 0) {
          await tx.employeeLocation.createMany({
            data: locationIds.map((locationId) => ({ employeeId: req.params.id, locationId })),
          });
        }
      }

      return tx.employee.update({
        where: { id: req.params.id },
        data: rest,
        include: {
          locations: { include: { location: { select: { id: true, name: true } } } },
        },
      });
    });

    res.json({ success: true, data: employee });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/employees/:id ────────────────────────────────────────────────

router.delete('/:id', authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.employee.findFirst({
      where: { id: req.params.id, groupId: req.user!.groupId },
    });
    if (!existing) throw createError('Empleat no trobat', 404);

    await prisma.employee.delete({ where: { id: req.params.id } });

    res.json({ success: true, message: 'Empleat eliminat correctament' });
  } catch (err) {
    next(err);
  }
});

export default router;
