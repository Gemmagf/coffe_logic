import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../types';

const router = Router();

// All group routes require authentication
router.use(authenticate);

// ─── Schemas ─────────────────────────────────────────────────────────────────

const UpdateGroupSchema = z.object({
  name: z.string().min(2).optional(),
  plan: z.enum(['SOLO', 'MULTI', 'MULTI_PLUS']).optional(),
});

// ─── GET /api/groups/me ───────────────────────────────────────────────────────

router.get('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const group = await prisma.group.findUnique({
      where: { id: req.user!.groupId },
      include: {
        _count: {
          select: { locations: true, employees: true, users: true },
        },
      },
    });

    if (!group) throw createError('Grup no trobat', 404);

    res.json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/groups/me ─────────────────────────────────────────────────────

router.patch('/me', authorize('OWNER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = UpdateGroupSchema.parse(req.body);

    const group = await prisma.group.update({
      where: { id: req.user!.groupId },
      data: body,
    });

    res.json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/groups/me/users ─────────────────────────────────────────────────

router.get('/me/users', authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: { groupId: req.user!.groupId },
      select: { id: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

export default router;
