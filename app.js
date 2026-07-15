const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const sequelize = require('./db'); // Import the database configuration


const candidateRoutes = require('./candidate/candidateRoutes');
const interviewRoutes = require('./interviews/interviewRoutes');
const hrRoutes = require('./hr/hrRoutes');
const interviewerRoutes = require('./interviewer/interviewerRoutes');

// Create an Express application
const app = express();

// Define the port the server will run on.
// It's good practice to use an environment variable for the port.
const port = process.env.PORT || 3000;

// Add middleware to parse incoming request bodies.
// `body-parser.json()` handles JSON-encoded bodies.
app.use(bodyParser.json());
// `body-parser.urlencoded()` handles URL-encoded bodies.
// The `extended: true` option allows for rich objects and arrays to be encoded.
app.use(bodyParser.urlencoded({ extended: true }));

// Enable CORS for all routes. This allows your front-end to make requests to your API.
// For production, you might want to configure it to only allow specific origins.
app.use(cors());

app.use('/api/candidate', candidateRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/interviewer', interviewerRoutes);

// A simple route to check if the server is running
app.get('/', (req, res) => {
  res.status(200).send('Hello from the Express server!');
});

// Connect to the database and start the server
sequelize
  .sync({ alter: true }) // Use { force: true } to drop and re-create tables. `alter: true` is safer.
  .then(() => {
    console.log('Database connected and models synchronized.');
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });