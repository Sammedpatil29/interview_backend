const express = require('express');
const router = express.Router();
const hrController = require('./hrController');
const auth = require('../middlewares/auth');

router.post('/login', hrController.loginHr);
router.post('/', auth, hrController.createHr);
router.get('/', auth, hrController.getAllHrs);
router.get('/:id', auth, hrController.getHrById);
router.put('/:id', auth, hrController.updateHr);
router.delete('/:id', auth, hrController.deleteHr);

module.exports = router;