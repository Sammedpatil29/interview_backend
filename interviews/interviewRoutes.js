const express = require('express');
const router = express.Router();
const interviewController = require('./interviewController');
const auth = require('../middlewares/auth');

// Create a new interview
router.post('/', interviewController.createInterview);

// Get all interviews
router.get('/', auth, interviewController.getAllInterviews);

// Get a single interview by ID
router.get('/:id', auth, interviewController.getInterviewById);

// Update an interview by ID
router.put('/:id', auth, interviewController.updateInterview);

// Delete an interview by ID
router.delete('/:id', auth, interviewController.deleteInterview);

module.exports = router;