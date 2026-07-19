const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboardController');
const auth = require('../middlewares/auth');

router.get('/', auth, dashboardController.getDashboardData);

module.exports = router;