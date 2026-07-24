"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const applicant_controller_1 = require("../controllers/applicant.controller");
const upload_middleware_1 = require("../middleware/upload.middleware");
const router = (0, express_1.Router)();
// Public
router.post('/apply', upload_middleware_1.uploadCV.single('resume'), applicant_controller_1.submitApplication);
router.get('/status', applicant_controller_1.checkApplicationStatus);
exports.default = router;
//# sourceMappingURL=applicant.routes.js.map