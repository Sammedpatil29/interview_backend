const Candidate  = require('./candidateModel'); // Assuming models/index.js is set up
const { comparePassword } = require('../utils/bcrypt'); // Assuming you have this utility
const { generateToken } = require('../utils/jwt');
const crypto = require('crypto');
const sendEmail = require('../utils/email');
/**
 * @description Create a new candidate
 * @route POST /api/candidate
 */
exports.createCandidate = async (req, res) => {
  try {
    // If no password is provided, generate a random one.
    if (!req.body.password) {
      // This creates a secure, random 16-character hexadecimal string.
      const generatedPassword = crypto.randomBytes(8).toString('hex');
      req.body.password = generatedPassword;

      // Send the generated password to the user's email
      await sendEmail({
        to: req.body.email,
        subject: 'Welcome! Your Account Password',
        html: `<p>Welcome! Your password is: <strong>${generatedPassword}</strong></p><p>Please change it after your first login.</p>`,
      });
    }

    const candidate = await Candidate.create(req.body);

    res.status(201).json({
      message: 'New candidate created!',
      data: candidate
    });
  } catch (error) {
    res.status(400).json({
      message: 'Error creating candidate',
      error: error.message
    });
  }
};

/**
 * @description Get all candidates
 * @route GET /api/candidate
 */
exports.getAllCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.findAll({
      attributes: { exclude: ['password'] }, // Don't send back the password
    });
    res.status(200).json(candidates);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving candidates', error: error.message });
  }
};

/**
 * @description Get a single candidate by ID
 * @route GET /api/candidate/:id
 */
exports.getCandidateById = async (req, res) => {
  try {
    const candidate = await Candidate.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
    });
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    res.status(200).json(candidate);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving candidate', error: error.message });
  }
};

/**
 * @description Update a candidate by ID
 * @route PUT /api/candidate/:id
 */
exports.updateCandidate = async (req, res) => {
  try {
    const [updated] = await Candidate.update(req.body, {
      where: { id: req.params.id },
    });

    if (!updated) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const updatedCandidate = await Candidate.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
    });
    res.status(200).json({ message: 'Candidate updated', data: updatedCandidate });
  } catch (error) {
    res.status(500).json({ message: 'Error updating candidate', error: error.message });
  }
};

/**
 * @description Delete a candidate by ID
 * @route DELETE /api/candidate/:id
 */
exports.deleteCandidate = async (req, res) => {
  try {
    const deleted = await Candidate.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    res.status(204).send(); // 204 No Content is a standard response for a successful delete
  } catch (error) {
    res.status(500).json({ message: 'Error deleting candidate', error: error.message });
  }
};

exports.loginCandidate = async (req, res) => {
  try {
    const { contact, password } = req.body;

    if (!contact || !password) {
      return res.status(400).json({ message: 'Contact and password are required.' });
    }

    const candidate = await Candidate.findOne({ where: { contact } });

    if (!candidate) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await comparePassword(password, candidate.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = generateToken({ id: candidate.id, role: candidate.role, name: candidate.name });

    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};