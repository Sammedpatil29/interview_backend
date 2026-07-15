const express = require('express');
const router = express.Router();
const interviewerController = require('./interviewerController');
const auth = require('../middlewares/auth');

router.post('/login', interviewerController.loginInterviewer);
router.post('/', auth, interviewerController.createInterviewer);
router.get('/', auth, interviewerController.getAllInterviewers);
router.get('/:id', auth, interviewerController.getInterviewerById);
router.put('/:id', auth, interviewerController.updateInterviewer);
router.delete('/:id', auth, interviewerController.deleteInterviewer);

module.exports = router;