"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jobPosting_controller_1 = require("../controllers/jobPosting.controller");
const router = (0, express_1.Router)();
// Public
router.get('/active', jobPosting_controller_1.getActiveJobPostings);
// HR
router.post('/', jobPosting_controller_1.createJobPosting);
router.get('/', jobPosting_controller_1.getAllJobPostings);
router.get('/:id', jobPosting_controller_1.getJobPosting);
router.put('/:id', jobPosting_controller_1.updateJobPosting);
exports.default = router;
//# sourceMappingURL=jobPosting.routes.js.map