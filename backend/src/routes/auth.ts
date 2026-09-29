import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, generateToken } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { AuthRequest, Role } from '../types';
import { createError } from '../middleware/errorHandler';

const router = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const LoginSchema = z.object({
  email: z.string().trim().min(1), // email or username
  password: z.string().min(1),
});

/** Usernames are compared case-insensitively and ignoring whitespace ("My Café" == "mycafé"). */
const normalizeUsername = (v: string) => v.toLowerCase().replace(/\s+/g, '');

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  groupName: z.string().min(2),
  plan: z.enum(['SOLO', 'MULTI', 'MULTI_PLUS']).default('SOLO'),
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.post('/login', loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email: identifier, password } = LoginSchema.parse(req.body);

    const user = identifier.includes('@')
      ? await prisma.user.findUnique({ where: { email: identifier.toLowerCase() }, include: { group: true } })
      : await prisma.user.findUnique({ where: { username: normalizeUsername(identifier) }, include: { group: true } });

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
      role: user.role as Role,
      email: user.email,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role as Role,
          groupId: user.groupId,
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
      role: user.role as Role,
      email: user.email,
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role as Role,
          groupId: user.groupId,
          group: { id: group.id, name: group.name, plan: group.plan },
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { group: true },
    });

    if (!user) throw createError('Usuari no trobat', 404);

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role as Role,
        groupId: user.groupId,
        group: { id: user.group.id, name: user.group.name, plan: user.group.plan },
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
