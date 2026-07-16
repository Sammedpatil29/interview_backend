const express = require('express');
const router = express.Router();
const interviewController = require('./interviewController');
const auth = require('../middlewares/auth');

// Create a new interview
router.post('/', interviewController.createInterview);

// Get all interviews
router.get('/', auth, interviewController.getAllInterviews);

// Get interviews pending interviewer share approval
router.get('/pending-approvals', auth, interviewController.getPendingApprovals);

// Get a single interview by ID
router.get('/:id', auth, interviewController.getInterviewById);

// Update an interview by ID
router.put('/:id', auth, interviewController.updateInterview);

// Approve an interviewer's share for an interview
router.put('/:id/approve-share', auth, interviewController.approveInterviewerShare);

// Delete an interview by ID
router.delete('/:id', auth, interviewController.deleteInterview);

module.exports = router;