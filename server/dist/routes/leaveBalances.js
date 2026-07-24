"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leaveBalanceController_1 = require("../controllers/leaveBalanceController");
const authorize_1 = require("../middleware/authorize");
const router = (0, express_1.Router)();
// All balances (HR/Admin)
router.get('/', (0, authorize_1.requirePermission)('leave', 'correct_balance'), leaveBalanceController_1.getAllLeaveBalances);
// Employee's own balances (any authenticated user for their own, or HR for any)
router.get('/:employeeId', leaveBalanceController_1.getLeaveBalances);
// Correct a balance (HR only)
router.patch('/:id/correct', (0, authorize_1.requirePermission)('leave', 'correct_balance'), leaveBalanceController_1.correctLeaveBalance);
exports.default = router;
//# sourceMappingURL=leaveBalances.js.map