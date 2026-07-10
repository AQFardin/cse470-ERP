import express from 'express';
import cors from 'cors';
import employeeRoutes from './routes/employees';
import leaveRequestRoutes from './routes/leaveRequests';
import taskRoutes from './routes/tasks';

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

// ─── Start Server ───────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 ERP Server running on http://localhost:${PORT}`);
  console.log(`   Health check:  http://localhost:${PORT}/api/health`);
  console.log(`   Employees:     http://localhost:${PORT}/api/employees`);
  console.log(`   Leave Requests: http://localhost:${PORT}/api/leave-requests`);
  console.log(`   Tasks:         http://localhost:${PORT}/api/tasks\n`);
});

export default app;
