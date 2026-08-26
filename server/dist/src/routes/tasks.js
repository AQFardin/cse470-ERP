"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const taskController_1 = require("../controllers/taskController");
const authorize_1 = require("../middleware/authorize");
const router = (0, express_1.Router)();
router.post('/', (0, authorize_1.requirePermission)('task', 'create'), taskController_1.createTask);
router.get('/', taskController_1.getAllTasks); // Scoping is done inside the controller
router.get('/employee/:id', taskController_1.getEmployeeTasks);
router.patch('/:id', (0, authorize_1.requirePermission)('task', 'edit'), taskController_1.updateTask);
router.delete('/:id', (0, authorize_1.requirePermission)('task', 'delete'), taskController_1.deleteTask);
exports.default = router;
//# sourceMappingURL=tasks.js.map