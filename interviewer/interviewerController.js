const Interviewer = require('./interviewerModel');
const { comparePassword } = require('../utils/bcrypt');
const { generateToken } = require('../utils/jwt');
const sendEmail = require('../utils/email');

/**
 * @description Create a new interviewer
 * @route POST /api/interviewer
 */
exports.createInterviewer = async (req, res) => {
  try {
    const creationData = { ...req.body };    // Set status to inactive by default on creation, pending admin approval.
    const interviewer = await Interviewer.create({ ...creationData, status: 'inactive' });

    // Send a welcome email to the new interviewer.
    try {
      await sendEmail({
        to: interviewer.email,
        subject: 'Welcome to the Interviewer Platform!',
        html: `<p>Hello ${interviewer.name},</p>
               <p>Thank you for signing up. Your account has been created and is currently under review by our administrative team.</p>
               <p>You will be notified via email once your account is activated. After activation, you will be able to log in and start receiving interview assignments.</p>
               <p>Best regards,</p>
               <p>The Hiring Team</p>`,
      });
    } catch (emailError) {
      console.error(`Failed to send welcome email to new interviewer ${interviewer.email}:`, emailError);
      // The account is still created, but we should be aware the email failed.
    }

    const interviewerData = interviewer.toJSON();
    delete interviewerData.password;
    res.status(201).json({ message: 'New interviewer created!', data: interviewerData });
  } catch (error) {
    res.status(400).json({ message: 'Error creating interviewer', error: error.message });
  }
};

/**
 * @description Get all interviewers
 * @route GET /api/interviewer
 */
exports.getAllInterviewers = async (req, res) => {
  try {
    const interviewers = await Interviewer.findAll({ attributes: { exclude: ['password'] } });
    res.status(200).json(interviewers);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving interviewers', error: error.message });
  }
};

/**
 * @description Get a single interviewer by ID
 * @route GET /api/interviewer/:id
 */
exports.getInterviewerById = async (req, res) => {
  try {
    const interviewer = await Interviewer.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    if (!interviewer) {
      return res.status(404).json({ message: 'Interviewer not found' });
    }
    res.status(200).json(interviewer);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving interviewer', error: error.message });
  }
};

/**
 * @description Update an interviewer by ID
 * @route PUT /api/interviewer/:id
 */
exports.updateInterviewer = async (req, res) => {
  try {
    const interviewerId = req.params.id;
    const { role: userRole, id: userId } = req.user;
    const updateData = req.body;

    const interviewer = await Interviewer.findByPk(interviewerId);
    if (!interviewer) {
      return res.status(404).json({ message: 'Interviewer not found' });
    }

    const isSelfUpdate = String(userId) === String(interviewerId);
    const isAdminOrHr = userRole === 'admin' || userRole === 'hr';

    // Prevent password updates via this route
    if (updateData.password) {
      delete updateData.password;
    }

    // Handle status update
    if (updateData.status && updateData.status !== interviewer.status) {
      // If the incoming status is 'active', only an admin or HR can set it.
      if (updateData.status === 'active' && !isAdminOrHr) {
        return res.status(403).json({ message: 'Forbidden: Only an admin or HR can set an account to active.' });
      }
      // If the incoming status is 'inactive', the user can do it to themselves, or an admin/HR can.
      if (updateData.status === 'inactive' && !isSelfUpdate && !isAdminOrHr) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to deactivate this account.' });
      }

      // If status is being changed, send an email.
      try {
        let emailSubject = 'Your Account Status has been Updated';
        let emailHtml = `<p>Hello ${interviewer.name},</p><p>An administrator has updated your account status to <strong>${updateData.status.toUpperCase()}</strong>.</p>`;

        if (updateData.status === 'active') {
          emailSubject = 'Your Interviewer Account is Now Active!';
          emailHtml += `<p>You can now log in to the platform and start receiving interview assignments. Welcome aboard!</p>`;
        } else if (updateData.status === 'inactive') {
          emailHtml += `<p>You will not be able to log in or receive new assignments until your account is reactivated. Please contact an administrator if you have questions.</p>`;
        }
        emailHtml += `<p>Best regards,</p><p>The Hiring Team</p>`;

        await sendEmail({
          to: interviewer.email,
          subject: emailSubject,
          html: emailHtml,
        });
      } catch (emailError) {
        console.error(`Failed to send status update email to ${interviewer.email}:`, emailError);
        // Continue with the update even if email fails, but log the error.
      }
    }

    // After handling status, check permissions for updating other fields.
    // If the user is not an admin/hr and is attempting to update a profile
    // that is not their own, block the request.
    if (!isAdminOrHr && !isSelfUpdate) {
      return res.status(403).json({ message: 'Forbidden: You can only update your own profile.' });
    }

    const updatedInterviewer = await interviewer.update(updateData);

    res.status(200).json({ message: 'Interviewer updated', data: updatedInterviewer });
  } catch (error) {
    res.status(500).json({ message: 'Error updating interviewer', error: error.message, stack: error.stack });
  }
};

/**
 * @description Delete an interviewer by ID
 * @route DELETE /api/interviewer/:id
 */
exports.deleteInterviewer = async (req, res) => {
  try {
    const deleted = await Interviewer.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      return res.status(404).json({ message: 'Interviewer not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting interviewer', error: error.message });
  }
};

/**
 * @description Login for interviewer
 * @route POST /api/interviewer/login
 */
exports.loginInterviewer = async (req, res) => {
  try {
    const { contact, password } = req.body;
    if (!contact || !password) {
      return res.status(400).json({ message: 'Contact and password are required.' });
    }

    const interviewer = await Interviewer.findOne({ where: { contact } });
    if (!interviewer || !(await comparePassword(password, interviewer.password))) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (interviewer.status !== 'active') {
      return res.status(403).json({ message: 'Your account is inactive. Please contact an administrator.' });
    }

    const token = generateToken({ id: interviewer.id, role: interviewer.role, name: interviewer.name });
    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

/**
 * @description Get wallet and transaction details for the logged-in interviewer.
 * @route GET /api/interviewer/wallet
 */
exports.getWalletDetails = async (req, res) => {
  try {
    const { id, role } = req.user; // Decoded from auth token

    // Ensure the user is an interviewer
    if (role !== 'interviewer') {
      return res.status(403).json({ message: 'Forbidden: Access is restricted to interviewers.' });
    }

    const interviewer = await Interviewer.findByPk(id, {
      attributes: ['wallet', 'transactions'],
    });

    if (!interviewer) {
      return res.status(404).json({ message: 'Interviewer not found.' });
    }

    res.status(200).json(interviewer);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving wallet details', error: error.message });
  }
};

/**
 * @description Get UPI ID for the logged-in interviewer.
 * @route GET /api/interviewer/upi
 */
exports.getUpi = async (req, res) => {
  try {
    const { id, role } = req.user; // Decoded from auth token

    // Ensure the user is an interviewer
    if (role !== 'interviewer') {
      return res.status(403).json({ message: 'Forbidden: Access is restricted to interviewers.' });
    }

    const interviewer = await Interviewer.findByPk(id, {
      attributes: ['upi'],
    });

    if (!interviewer) {
      return res.status(404).json({ message: 'Interviewer not found.' });
    }

    res.status(200).json({ upi: interviewer.upi });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving UPI details', error: error.message });
  }
};