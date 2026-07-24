"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employeeController_1 = require("../controllers/employeeController");
const authorize_1 = require("../middleware/authorize");
const router = (0, express_1.Router)();
// Dashboard stats (any authenticated user)
router.get('/stats', employeeController_1.getDashboardStats);
// CRUD with permission guards
router.post('/', (0, authorize_1.requirePermission)('employee_records', 'create'), employeeController_1.createEmployee);
router.get('/', employeeController_1.getAllEmployees); // Scoping handled inside controller
router.get('/:id', employeeController_1.getEmployee);
router.put('/:id', (0, authorize_1.requirePermission)('employee_records', 'edit'), employeeController_1.updateEmployee);
router.patch('/:id/status', (0, authorize_1.requirePermission)('employee_records', 'edit'), employeeController_1.toggleEmployeeStatus);
exports.default = router;
//# sourceMappingURL=employees.js.map