const express = require('express');
const router = express.Router();
const interviewerController = require('./interviewerController');
const auth = require('../middlewares/auth');

router.post('/login', interviewerController.loginInterviewer);
router.post('/', auth, interviewerController.createInterviewer);
router.get('/', auth, interviewerController.getAllInterviewers);

// Get wallet details for the logged-in interviewer
router.get('/wallet', auth, interviewerController.getWalletDetails);

// Get UPI ID for the logged-in interviewer
router.get('/upi', auth, interviewerController.getUpi);

router.get('/:id', auth, interviewerController.getInterviewerById);
router.put('/:id', auth, interviewerController.updateInterviewer);
router.delete('/:id', auth, interviewerController.deleteInterviewer);

module.exports = router;