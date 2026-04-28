import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

// ─── Helper: parseja items de string JSON a array ─────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseItems(order: any) {
  return {
    ...order,
    items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
  };
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const OrderItemSchema = z.object({
  productName: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  unitPrice: z.number().nonnegative(),
});

const OrderSchema = z.object({
  supplierId: z.string().min(1),
  locationId: z.string().min(1),
  items: z.array(OrderItemSchema).min(1),
  notes: z.string().optional().nullable(),
  deliveryAt: z.string().datetime().optional().nullable(),
});

const StatusSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'RECEIVED']),
});

// ─── GET /api/orders ──────────────────────────────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { locationId, supplierId, status } = req.query as Record<string, string | undefined>;

    const orders = await prisma.order.findMany({
      where: {
        location: { groupId: req.user!.groupId },
        ...(locationId && { locationId }),
        ...(supplierId && { supplierId }),
        ...(status && { status: status as 'DRAFT' | 'SENT' | 'RECEIVED' }),
      },
      include: {
        supplier: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: orders.map(parseItems) });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/orders ─────────────────────────────────────────────────────────

router.post('/', authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = OrderSchema.parse(req.body);

    const [supplier, location] = await Promise.all([
      prisma.supplier.findFirst({ where: { id: body.supplierId, groupId: req.user!.groupId } }),
      prisma.location.findFirst({ where: { id: body.locationId, groupId: req.user!.groupId } }),
    ]);

    if (!supplier) throw createError('Proveïdor no trobat', 404);
    if (!location) throw createError('Local no trobat', 404);

    const order = await prisma.order.create({
      data: {
        supplierId: body.supplierId,
        locationId: body.locationId,
        items: JSON.stringify(body.items),
        notes: body.notes,
        deliveryAt: body.deliveryAt ? new Date(body.deliveryAt) : null,
      },
      include: {
        supplier: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: parseItems(order) });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, location: { groupId: req.user!.groupId } },
      include: {
        supplier: true,
        location: { select: { id: true, name: true } },
      },
    });

    if (!order) throw createError('Comanda no trobada', 404);
    res.json({ success: true, data: parseItems(order) });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/orders/:id/status ────────────────────────────────────────────

router.patch('/:id/status', authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = StatusSchema.parse(req.body);

    const existing = await prisma.order.findFirst({
      where: { id: req.params.id, location: { groupId: req.user!.groupId } },
    });
    if (!existing) throw createError('Comanda no trobada', 404);

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        supplier: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: parseItems(order) });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/orders/:id ──────────────────────────────────────────────────────

router.put('/:id', authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = OrderSchema.parse(req.body);

    const existing = await prisma.order.findFirst({
      where: { id: req.params.id, location: { groupId: req.user!.groupId } },
    });
    if (!existing) throw createError('Comanda no trobada', 404);
    if (existing.status !== 'DRAFT') throw createError('Només es poden editar comandes en esborrany', 400);

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        supplierId: body.supplierId,
        locationId: body.locationId,
        items: JSON.stringify(body.items),
        notes: body.notes,
        deliveryAt: body.deliveryAt ? new Date(body.deliveryAt) : null,
      },
      include: {
        supplier: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: parseItems(order) });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/orders/:id ───────────────────────────────────────────────────

router.delete('/:id', authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.order.findFirst({
      where: { id: req.params.id, location: { groupId: req.user!.groupId } },
    });
    if (!existing) throw createError('Comanda no trobada', 404);
    if (existing.status === 'RECEIVED') throw createError('No es pot eliminar una comanda rebuda', 400);

    await prisma.order.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Comanda eliminada correctament' });
  } catch (err) {
    next(err);
  }
});

export default router;
