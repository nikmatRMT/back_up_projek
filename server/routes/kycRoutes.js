const express = require('express');
const requireAuth = require('../middleware/authMiddleware');
const controller = require('../controllers/kycController');
const router = express.Router();
router.use(requireAuth);
router.get('/status', controller.getStatus);
router.post('/verify', controller.submitVerification);
router.post('/verify-dummy', controller.verifyDummy);
module.exports = router;
