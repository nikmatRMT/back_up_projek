const express = require('express');
const requireAuth = require('../middleware/authMiddleware');
const controller = require('../controllers/paymentController');
const router = express.Router();
router.use(requireAuth);
router.get('/:questId', controller.getPayment);
router.post('/:questId/create', controller.createSandboxPayment);
router.post('/:questId/simulate', controller.simulateOutcome);
module.exports = router;
