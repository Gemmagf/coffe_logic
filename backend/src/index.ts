import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorHandler } from './middleware/errorHandler';
import authRouter from './routes/auth';
import groupsRouter from './routes/groups';
import locationsRouter from './routes/locations';
import employeesRouter from './routes/employees';
import schedulesRouter from './routes/schedules';
import ordersRouter from './routes/orders';
import cashClosingsRouter from './routes/cashClosings';
import vacationsRouter from './routes/vacations';
import preferencesRouter from './routes/preferences';
import analyticsRouter from './routes/analytics';

const app = express();
const PORT = process.env.PORT ?? 4000;

// ─── Global Middleware ────────────────────────────────────────────────────────

app.use(helmet());
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:5200')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some((o) => origin.startsWith(o))) return cb(null, true);
    cb(new Error(`CORS: origen no permès: ${origin}`));
  },
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'coffe_logic API operativa', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/cash-closings', cashClosingsRouter);
app.use('/api/vacations', vacationsRouter);
app.use('/api/preferences', preferencesRouter);
app.use('/api/analytics', analyticsRouter);

// ─── 404 catch-all ───────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Ruta no trobada' });
});

// ─── Error Handler ───────────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[coffe_logic] Servidor escoltant al port ${PORT} (${process.env.NODE_ENV ?? 'development'})`);
});

export default app;
