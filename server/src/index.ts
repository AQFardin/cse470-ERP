import express from 'express';
import cors from 'cors';
import employeeRoutes from './routes/employees';
import leaveRequestRoutes from './routes/leaveRequests';
import taskRoutes from './routes/tasks';
import jobPostingRoutes from '../modules/recruitment/routes/jobPosting.routes';
import applicantRoutes from '../modules/recruitment/routes/applicant.routes';
import applicationRoutes from '../modules/recruitment/routes/application.routes';
import catalogRoutes from '../modules/catalog/routes/catalog.routes';
import crmRoutes from '../modules/crm/routes/crm.routes';
import subscriptionRoutes from '../modules/subscription/routes/subscription.routes';
import returnsRoutes from '../modules/returns/routes/returns.routes';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ──────────────────────────────────────────
app.use(cors({
  origin: 'http://localhost:5173', // Vite dev server
  credentials: true,
}));
app.use(express.json());

// ─── Health Check ───────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ─────────────────────────────────────────────
app.use('/api/employees', employeeRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/job-postings', jobPostingRoutes);
app.use('/api/applicants', applicantRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/crm', crmRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/returns', returnsRoutes);
// ─── Start Server ───────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 ERP Server running on http://localhost:${PORT}`);
  console.log(`   Health check:  http://localhost:${PORT}/api/health`);
  console.log(`   Employees:     http://localhost:${PORT}/api/employees`);
  console.log(`   Leave Requests: http://localhost:${PORT}/api/leave-requests`);
  console.log(`   Tasks:         http://localhost:${PORT}/api/tasks\n`);
  console.log(`   CRM:           http://localhost:${PORT}/api/crm\n`);
  console.log(`   Catalog:       http://localhost:${PORT}/api/catalog/products\n`);
});

export default app;
