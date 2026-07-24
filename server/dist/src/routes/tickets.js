"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ticketController_1 = require("../controllers/ticketController");
const authorize_1 = require("../middleware/authorize");
const router = (0, express_1.Router)();
router.post('/', (0, authorize_1.requirePermission)('ticket', 'raise'), ticketController_1.createTicket);
router.get('/', ticketController_1.getAllTickets); // Scoping & category lanes handled inside controller
router.get('/:id', ticketController_1.getTicket);
router.patch('/:id', ticketController_1.updateTicket); // Status update / resolution
exports.default = router;
//# sourceMappingURL=tickets.js.map