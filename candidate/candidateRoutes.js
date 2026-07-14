const express = require('express');
const router = express.Router();
const candidateController = require('./candidateController');

// POST /api/candidate - Create a new candidate
router.post('/', candidateController.createCandidate);

// GET /api/candidate - Get all candidates
router.get('/', candidateController.getAllCandidates);

// GET /api/candidate/:id - Get a single candidate by ID
router.get('/:id', candidateController.getCandidateById);

// PUT /api/candidate/:id - Update a candidate by ID
router.put('/:id', candidateController.updateCandidate);

// DELETE /api/candidate/:id - Delete a candidate by ID
router.delete('/:id', candidateController.deleteCandidate);

router.post('/candidateLogin', candidateController.loginCandidate);

// Forgot/Reset Password Routes
router.post('/forgot-password', candidateController.forgotPassword);
router.put('/reset-password/:token', candidateController.resetPassword);


module.exports = router;