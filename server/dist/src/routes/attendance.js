"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attendanceController_1 = require("../controllers/attendanceController");
const authorize_1 = require("../middleware/authorize");
const router = (0, express_1.Router)();
router.post('/clock-in', (0, authorize_1.requirePermission)('attendance', 'clock'), attendanceController_1.clockIn);
router.post('/clock-out', (0, authorize_1.requirePermission)('attendance', 'clock'), attendanceController_1.clockOut);
router.get('/today', attendanceController_1.getTodayStatus);
router.get('/team-calendar', (0, authorize_1.requirePermission)('attendance', 'view_team'), attendanceController_1.getTeamCalendar);
router.get('/:employeeId', attendanceController_1.getEmployeeAttendance);
exports.default = router;
//# sourceMappingURL=attendance.js.map