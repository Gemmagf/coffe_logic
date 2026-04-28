import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../config/database';
import { generateToken } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  groupName: z.string().min(2),
  plan: z.enum(['SOLO', 'MULTI', 'MULTI_PLUS']).default('SOLO'),
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { group: true },
    });

    if (!user) {
      throw createError('Credencials incorrectes', 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw createError('Credencials incorrectes', 401);
    }

    const token = generateToken({
      userId: user.id,
      groupId: user.groupId,
      role: user.role,
      email: user.email,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          group: { id: user.group.id, name: user.group.name, plan: user.group.plan },
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, groupName, plan } = RegisterSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw createError('Aquest correu ja està registrat', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const group = await prisma.group.create({
      data: { name: groupName, plan },
    });

    const user = await prisma.user.create({
      data: { email, passwordHash, role: 'OWNER', groupId: group.id },
    });

    const token = generateToken({
      userId: user.id,
      groupId: user.groupId,
      role: user.role,
      email: user.email,
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          group: { id: group.id, name: group.name, plan: group.plan },
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError('No autenticat', 401);
    }

    // The authenticate middleware sets req.user; re-import here to avoid circular deps
    const jwt = await import('jsonwebtoken');
    const secret = process.env.JWT_SECRET ?? 'fallback-secret-change-in-production';
    const payload = jwt.default.verify(authHeader.split(' ')[1], secret) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { group: true },
    });

    if (!user) throw createError('Usuari no trobat', 404);

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        group: { id: user.group.id, name: user.group.name, plan: user.group.plan },
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
