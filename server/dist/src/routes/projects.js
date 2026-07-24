"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const projectController_1 = require("../controllers/projectController");
const authorize_1 = require("../middleware/authorize");
const router = (0, express_1.Router)();
router.post('/', (0, authorize_1.requirePermission)('project', 'create'), projectController_1.createProject); // Only Admin creates project + assigns PM
router.post('/chunks', (0, authorize_1.requirePermission)('project', 'chunk_create'), projectController_1.createProjectChunk); // Project Manager delegates chunk to Dept
router.get('/', projectController_1.getAllProjects);
router.get('/:id', projectController_1.getProject);
router.patch('/:id', (0, authorize_1.requirePermission)('project', 'edit'), projectController_1.updateProject);
exports.default = router;
//# sourceMappingURL=projects.js.map