import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

// ─── Schemas ─────────────────────────────────────────────────────────────────

const SupplierSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
});

const clean = (b: z.infer<typeof SupplierSchema>) => ({
  ...b,
  email: b.email ? b.email : null,
  contact: b.contact || null,
  phone: b.phone || null,
});

// ─── GET /api/suppliers ───────────────────────────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { groupId: req.user!.groupId },
      include: { _count: { select: { orders: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: suppliers });
  } catch (err) { next(err); }
});

// ─── POST /api/suppliers ──────────────────────────────────────────────────────

router.post('/', authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = SupplierSchema.parse(req.body);
    const supplier = await prisma.supplier.create({
      data: { ...clean(body), groupId: req.user!.groupId },
    });
    res.status(201).json({ success: true, data: supplier });
  } catch (err) { next(err); }
});

// ─── PATCH /api/suppliers/:id ─────────────────────────────────────────────────

router.patch('/:id', authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = SupplierSchema.partial().parse(req.body);
    const existing = await prisma.supplier.findFirst({ where: { id: req.params.id, groupId: req.user!.groupId } });
    if (!existing) throw createError('Proveïdor no trobat', 404);

    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.contact !== undefined && { contact: body.contact || null }),
        ...(body.email !== undefined && { email: body.email || null }),
        ...(body.phone !== undefined && { phone: body.phone || null }),
      },
    });
    res.json({ success: true, data: supplier });
  } catch (err) { next(err); }
});

// ─── DELETE /api/suppliers/:id ────────────────────────────────────────────────

router.delete('/:id', authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.supplier.findFirst({
      where: { id: req.params.id, groupId: req.user!.groupId },
      include: { _count: { select: { orders: true } } },
    });
    if (!existing) throw createError('Proveïdor no trobat', 404);
    if (existing._count.orders > 0) throw createError('No es pot eliminar un proveïdor amb comandes associades', 409);

    await prisma.supplier.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Proveïdor eliminat correctament' });
  } catch (err) { next(err); }
});

export default router;
