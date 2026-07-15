const Interviewer = require('./interviewerModel');
const { comparePassword } = require('../utils/bcrypt');
const { generateToken } = require('../utils/jwt');

/**
 * @description Create a new interviewer
 * @route POST /api/interviewer
 */
exports.createInterviewer = async (req, res) => {
  try {
    const interviewer = await Interviewer.create(req.body);
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
    if (req.body.password) {
      delete req.body.password;
    }

    const [updated] = await Interviewer.update(req.body, { where: { id: req.params.id } });

    if (!updated) {
      return res.status(404).json({ message: 'Interviewer not found' });
    }

    const updatedInterviewer = await Interviewer.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    res.status(200).json({ message: 'Interviewer updated', data: updatedInterviewer });
  } catch (error) {
    res.status(500).json({ message: 'Error updating interviewer', error: error.message });
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

    const token = generateToken({ id: interviewer.id, role: interviewer.role, name: interviewer.name });
    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};