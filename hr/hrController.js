const Hr = require('./hrModel');
const { comparePassword } = require('../utils/bcrypt');
const { generateToken } = require('../utils/jwt');

/**
 * @description Create a new HR user
 * @route POST /api/hr
 */
exports.createHr = async (req, res) => {
  try {
    const hr = await Hr.create(req.body);
    const hrData = hr.toJSON();
    delete hrData.password;
    res.status(201).json({ message: 'New HR user created!', data: hrData });
  } catch (error) {
    res.status(400).json({ message: 'Error creating HR user', error: error.message });
  }
};

/**
 * @description Get all HR users
 * @route GET /api/hr
 */
exports.getAllHrs = async (req, res) => {
  try {
    const hrs = await Hr.findAll({ attributes: { exclude: ['password'] } });
    res.status(200).json(hrs);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving HR users', error: error.message });
  }
};

/**
 * @description Get a single HR user by ID
 * @route GET /api/hr/:id
 */
exports.getHrById = async (req, res) => {
  try {
    const hr = await Hr.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    if (!hr) {
      return res.status(404).json({ message: 'HR user not found' });
    }
    res.status(200).json(hr);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving HR user', error: error.message });
  }
};

/**
 * @description Update an HR user by ID
 * @route PUT /api/hr/:id
 */
exports.updateHr = async (req, res) => {
  try {
    // Prevent password from being updated directly through this route
    if (req.body.password) {
      delete req.body.password;
    }

    const [updated] = await Hr.update(req.body, { where: { id: req.params.id } });

    if (!updated) {
      return res.status(404).json({ message: 'HR user not found' });
    }

    const updatedHr = await Hr.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    res.status(200).json({ message: 'HR user updated', data: updatedHr });
  } catch (error) {
    res.status(500).json({ message: 'Error updating HR user', error: error.message });
  }
};

/**
 * @description Delete an HR user by ID
 * @route DELETE /api/hr/:id
 */
exports.deleteHr = async (req, res) => {
  try {
    const deleted = await Hr.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      return res.status(404).json({ message: 'HR user not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting HR user', error: error.message });
  }
};

/**
 * @description Login for HR user
 * @route POST /api/hr/login
 */
exports.loginHr = async (req, res) => {
  try {
    const { contact, password } = req.body;
    if (!contact || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const hr = await Hr.findOne({ where: { contact } });
    if (!hr || !(await comparePassword(password, hr.password))) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = generateToken({ id: hr.id, role: hr.role, name: hr.name });
    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};