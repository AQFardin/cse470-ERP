"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const offboardController_1 = require("../controllers/offboardController");
const authorize_1 = require("../middleware/authorize");
const router = (0, express_1.Router)();
router.post('/', (0, authorize_1.requirePermission)('offboarding', 'request'), offboardController_1.createOffboardRequest);
router.get('/', (0, authorize_1.requirePermission)('offboarding', 'view'), offboardController_1.getAllOffboardRequests);
router.patch('/:id/review', (0, authorize_1.requirePermission)('offboarding', 'execute'), offboardController_1.reviewOffboardRequest);
exports.default = router;
//# sourceMappingURL=offboarding.js.map