"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const employees_1 = __importDefault(require("./routes/employees"));
const leaveRequests_1 = __importDefault(require("./routes/leaveRequests"));
const tasks_1 = __importDefault(require("./routes/tasks"));
const jobPosting_routes_1 = __importDefault(require("../modules/recruitment/routes/jobPosting.routes"));
const applicant_routes_1 = __importDefault(require("../modules/recruitment/routes/applicant.routes"));
const application_routes_1 = __importDefault(require("../modules/recruitment/routes/application.routes"));
const inventory_routes_1 = __importDefault(require("../modules/inventory/routes/inventory.routes"));
const catalog_routes_1 = __importDefault(require("../modules/catalog/routes/catalog.routes"));
const notification_routes_1 = __importDefault(require("../modules/notifications/routes/notification.routes"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// ─── Middleware ──────────────────────────────────────────
app.use((0, cors_1.default)({
    origin: 'http://localhost:5173', // Vite dev server
    credentials: true,
}));
app.use(express_1.default.json());
app.use("/api/notifications", notification_routes_1.default);
// ─── Health Check ───────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// ─── Routes ─────────────────────────────────────────────
app.use('/api/employees', employees_1.default);
app.use('/api/leave-requests', leaveRequests_1.default);
app.use('/api/tasks', tasks_1.default);
app.use('/api/job-postings', jobPosting_routes_1.default);
app.use('/api/applicants', applicant_routes_1.default);
app.use('/api/applications', application_routes_1.default);
app.use('/api/catalog', catalog_routes_1.default);
app.use('/api/inventory', inventory_routes_1.default);
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// ─── Start Server ───────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🚀 ERP Server running on http://localhost:${PORT}`);
    console.log(`   Health check:  http://localhost:${PORT}/api/health`);
    console.log(`   Employees:     http://localhost:${PORT}/api/employees`);
    console.log(`   Leave Requests: http://localhost:${PORT}/api/leave-requests`);
    console.log(`   Tasks:         http://localhost:${PORT}/api/tasks\n`);
    console.log(`   Catalog:       http://localhost:${PORT}/api/catalog/products\n`);
});
exports.default = app;
//# sourceMappingURL=index.js.map