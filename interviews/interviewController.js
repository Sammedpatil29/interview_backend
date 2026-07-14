const Interview = require('./interviewModel');
const Candidate = require('../candidate/candidateModel');
const sendEmail = require('../utils/email');
const crypto = require('crypto');

/**
 * @description Create a new interview
 * @route POST /api/interview
 */
exports.createInterview = async (req, res) => {
  try {
    const { mobileNumber, candidateEmail, candidateName, skills, type } = req.body;

    // Find an existing candidate or create a new one
    let candidate = await Candidate.findOne({ where: { contact: mobileNumber } });

    if (!candidate) {
      // If candidate doesn't exist, create one
      const generatedPassword = crypto.randomBytes(8).toString('hex');

      candidate = await Candidate.create({
        name: candidateName,
        email: candidateEmail,
        contact: mobileNumber,
        skills,
        type,
        password: generatedPassword, // This will be hashed by the model's beforeCreate hook
      });

      // Send welcome email with the generated password
      try {
        await sendEmail({
          to: candidate.email,
          subject: 'Welcome! Your Account Password',
          html: `<p>An account has been created for you. Your password is: <strong>${generatedPassword}</strong></p><p>Please change it after your first login.</p>`,
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // The interview is still created, but we should be aware the email failed.
        // In a production app, you might add this to a retry queue.
      }
    }

    // Create the interview and link it to the candidate
    const interviewData = { ...req.body, candidateId: candidate.id };
    const interview = await Interview.create(interviewData);

    res.status(201).json({ message: 'New interview created!', data: interview });
  } catch (error) {
    res.status(400).json({ message: 'Error creating interview', error: error.message });
  }
};

/**
 * @description Get all interviews
 * @route GET /api/interview
 */
exports.getAllInterviews = async (req, res) => {
  try {
    const interviews = await Interview.findAll();
    res.status(200).json(interviews);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving interviews', error: error.message });
  }
};

/**
 * @description Get a single interview by ID
 * @route GET /api/interview/:id
 */
exports.getInterviewById = async (req, res) => {
  try {
    const interview = await Interview.findByPk(req.params.id);
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }
    res.status(200).json(interview);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving interview', error: error.message });
  }
};

/**
 * @description Update an interview by ID
 * @route PUT /api/interview/:id
 */
exports.updateInterview = async (req, res) => {
  try {
    const [updated] = await Interview.update(req.body, {
      where: { id: req.params.id },
    });

    if (!updated) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    const updatedInterview = await Interview.findByPk(req.params.id);
    res.status(200).json({ message: 'Interview updated', data: updatedInterview });
  } catch (error) {
    res.status(500).json({ message: 'Error updating interview', error: error.message });
  }
};

/**
 * @description Delete an interview by ID
 * @route DELETE /api/interview/:id
 */
exports.deleteInterview = async (req, res) => {
  try {
    const deleted = await Interview.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      return res.status(404).json({ message: 'Interview not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting interview', error: error.message });
  }
};