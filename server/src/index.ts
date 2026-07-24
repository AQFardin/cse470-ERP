import express from 'express';
import cors from 'cors';
import { authenticate } from './middleware/authenticate';
import employeeRoutes from './routes/employees';
import leaveRequestRoutes from './routes/leaveRequests';
import taskRoutes from './routes/tasks';
import authRoutes from './routes/auth';
import offboardingRoutes from './routes/offboarding';
import leaveBalanceRoutes from './routes/leaveBalances';
import attendanceRoutes from './routes/attendance';
import ticketRoutes from './routes/tickets';
import projectRoutes from './routes/projects';
import jobPostingRoutes from '../modules/recruitment/routes/jobPosting.routes';
import applicantRoutes from '../modules/recruitment/routes/applicant.routes';
import applicationRoutes from '../modules/recruitment/routes/application.routes';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ──────────────────────────────────────────
app.use(cors({
  origin: 'http://localhost:5173', // Vite dev server
  credentials: true,
}));
app.use(express.json());

// ─── Health Check (no auth needed) ──────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Auth routes (users list is public, /me needs auth) ─
// Mount BEFORE authenticate middleware so /api/auth/users works without auth header
app.use('/api/auth', (req, res, next) => {
  // /api/auth/users is public (for the impersonation dropdown)
  if (req.path === '/users' && req.method === 'GET') {
    return next();
  }
  // Everything else under /api/auth needs authentication
  return authenticate(req, res, next);
}, authRoutes);

// ─── Apply authentication to all other API routes ───────
app.use('/api', authenticate);

// ─── Routes ─────────────────────────────────────────────
app.use('/api/employees', employeeRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/offboarding', offboardingRoutes);
app.use('/api/leave-balances', leaveBalanceRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/job-postings', jobPostingRoutes);
app.use('/api/applicants', applicantRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Start Server ───────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 ERP Server running on http://localhost:${PORT}`);
  console.log(`   Health check:     http://localhost:${PORT}/api/health`);
  console.log(`   Auth/Users:       http://localhost:${PORT}/api/auth/users`);
  console.log(`   Employees:        http://localhost:${PORT}/api/employees`);
  console.log(`   Leave Requests:   http://localhost:${PORT}/api/leave-requests`);
  console.log(`   Leave Balances:   http://localhost:${PORT}/api/leave-balances`);
  console.log(`   Tasks:            http://localhost:${PORT}/api/tasks`);
  console.log(`   Offboarding:      http://localhost:${PORT}/api/offboarding`);
  console.log(`   Attendance:       http://localhost:${PORT}/api/attendance`);
  console.log(`   Tickets:          http://localhost:${PORT}/api/tickets`);
  console.log(`   Projects:         http://localhost:${PORT}/api/projects\n`);
});

export default app;
