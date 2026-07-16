const express = require('express');
const router = express.Router();
const payoutController = require('./payoutController');
const auth = require('../middlewares/auth');

// Create, read, and update payouts
router.post('/', auth, payoutController.createPayout);
router.get('/', auth, payoutController.getAllPayouts);
router.get('/:id', auth, payoutController.getPayoutById);
router.put('/:id', auth, payoutController.updatePayout);

module.exports = router;