"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leaveController_1 = require("../controllers/leaveController");
const router = (0, express_1.Router)();
router.post('/', leaveController_1.createLeaveRequest);
router.get('/', leaveController_1.getAllLeaveRequests);
router.get('/employee/:id', leaveController_1.getEmployeeLeaveRequests);
router.patch('/:id/review', leaveController_1.reviewLeaveRequest);
exports.default = router;
//# sourceMappingURL=leaveRequests.js.map