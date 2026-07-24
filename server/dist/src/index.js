"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const authenticate_1 = require("./middleware/authenticate");
const employees_1 = __importDefault(require("./routes/employees"));
const leaveRequests_1 = __importDefault(require("./routes/leaveRequests"));
const tasks_1 = __importDefault(require("./routes/tasks"));
const auth_1 = __importDefault(require("./routes/auth"));
const offboarding_1 = __importDefault(require("./routes/offboarding"));
const leaveBalances_1 = __importDefault(require("./routes/leaveBalances"));
const attendance_1 = __importDefault(require("./routes/attendance"));
const tickets_1 = __importDefault(require("./routes/tickets"));
const projects_1 = __importDefault(require("./routes/projects"));
const jobPosting_routes_1 = __importDefault(require("../modules/recruitment/routes/jobPosting.routes"));
const applicant_routes_1 = __importDefault(require("../modules/recruitment/routes/applicant.routes"));
const application_routes_1 = __importDefault(require("../modules/recruitment/routes/application.routes"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// ─── Middleware ──────────────────────────────────────────
app.use((0, cors_1.default)({
    origin: 'http://localhost:5173', // Vite dev server
    credentials: true,
}));
app.use(express_1.default.json());
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
    return (0, authenticate_1.authenticate)(req, res, next);
}, auth_1.default);
// ─── Apply authentication to all other API routes ───────
app.use('/api', authenticate_1.authenticate);
// ─── Routes ─────────────────────────────────────────────
app.use('/api/employees', employees_1.default);
app.use('/api/leave-requests', leaveRequests_1.default);
app.use('/api/tasks', tasks_1.default);
app.use('/api/offboarding', offboarding_1.default);
app.use('/api/leave-balances', leaveBalances_1.default);
app.use('/api/attendance', attendance_1.default);
app.use('/api/tickets', tickets_1.default);
app.use('/api/projects', projects_1.default);
app.use('/api/job-postings', jobPosting_routes_1.default);
app.use('/api/applicants', applicant_routes_1.default);
app.use('/api/applications', application_routes_1.default);
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
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
exports.default = app;
//# sourceMappingURL=index.js.map