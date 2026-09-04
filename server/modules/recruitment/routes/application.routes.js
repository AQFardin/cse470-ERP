"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const application_controller_1 = require("../controllers/application.controller");
const router = (0, express_1.Router)();
// HR
router.get('/', application_controller_1.getAllApplications);
router.get('/:id', application_controller_1.getApplication);
router.patch('/:id/status', application_controller_1.updateApplicationStatus);
exports.default = router;
//# sourceMappingURL=application.routes.js.map