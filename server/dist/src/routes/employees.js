"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employeeController_1 = require("../controllers/employeeController");
const router = (0, express_1.Router)();
// Dashboard stats
router.get('/stats', employeeController_1.getDashboardStats);
// CRUD
router.post('/', employeeController_1.createEmployee);
router.get('/', employeeController_1.getAllEmployees);
router.get('/:id', employeeController_1.getEmployee);
router.put('/:id', employeeController_1.updateEmployee);
router.patch('/:id/status', employeeController_1.toggleEmployeeStatus);
exports.default = router;
//# sourceMappingURL=employees.js.map