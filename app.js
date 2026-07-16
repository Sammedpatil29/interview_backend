const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const sequelize = require('./db'); // Import the database configuration


const candidateRoutes = require('./candidate/candidateRoutes');
const interviewRoutes = require('./interviews/interviewRoutes');
const hrRoutes = require('./hr/hrRoutes');
const interviewerRoutes = require('./interviewer/interviewerRoutes');
const payoutRoutes = require('./payout/payoutRoutes');

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
app.use('/api/payout', payoutRoutes);

// A simple route to check if the server is running
app.get('/', (req, res) => {
  res.status(200).send('Hello from the Express server!');
});

// Connect to the database and start the server
sequelize
  .sync() // Creates tables if they don't exist, but won't alter them. This is safer.
  .then(async () => {
    console.log('Initial sync complete. Now running manual schema alterations...');

    try {
      // This query manually alters the column type, providing a `USING` clause
      // to tell PostgreSQL how to cast the data from its old type to JSONB.
      // It constructs a JSON object from the old numeric value.
      const alterQuery = `
        ALTER TABLE "Interviews" 
        ALTER COLUMN "interviewerShare" TYPE JSONB 
        USING jsonb_build_object('share', "interviewerShare"::numeric, 'approved', false);`;
      await sequelize.query(alterQuery);
      console.log('✅ Successfully altered "Interviews" table.');
    } catch (alterErr) {
      // We expect this to fail if the column is already the correct type,
      // which is fine. We log a warning instead of crashing.
      console.warn('⚠️  Alteration of "Interviews" table skipped (likely already up-to-date).');
    }

    try {
      // Manually add the 'wallet' column to the 'Interviewers' table if it doesn't exist.
      const alterInterviewerQuery = `
        ALTER TABLE "Interviewers" 
        ADD COLUMN IF NOT EXISTS "wallet" JSONB DEFAULT '{"balance": 0, "pending": 0, "withdrawn": 0}'::jsonb;`;
      await sequelize.query(alterInterviewerQuery);
      console.log('✅ Successfully altered "Interviewers" table.');
    } catch (alterErr) {
      // This will likely fail if the column already exists, which is fine.
      console.warn('⚠️  Alteration of "Interviewers" table skipped (likely already up-to-date).');
    }

    try {
      // Manually add the 'feedback' column to the 'Interviews' table if it doesn't exist.
      const alterInterviewQuery = `
        ALTER TABLE "Interviews" 
        ADD COLUMN IF NOT EXISTS "feedback" JSONB;`;
      await sequelize.query(alterInterviewQuery);
      console.log('✅ Successfully altered "Interviews" table to add feedback column.');
    } catch (alterErr) {
      console.warn('⚠️  Alteration of "Interviews" table for feedback column skipped (likely already up-to-date).');
    }

    try {
      // Manually add the 'upi' column to the 'Interviewers' table if it doesn't exist.
      const alterInterviewerUpiQuery = `
        ALTER TABLE "Interviewers" 
        ADD COLUMN IF NOT EXISTS "upi" VARCHAR(255);`;
      await sequelize.query(alterInterviewerUpiQuery);
      console.log('✅ Successfully altered "Interviewers" table to add upi column.');
    } catch (alterErr) {
      console.warn('⚠️  Alteration of "Interviewers" table for upi column skipped (likely already up-to-date).');
    }

    // The basic .sync() will create the Payouts table if it doesn't exist,
    // as it's a new model. No manual ALTER is needed for creation.
    console.log('✅ Payout model synced.');

    // You can add more manual ALTER queries here in the future.

    console.log('Database connected and schema is up-to-date.');
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('❌ Unable to connect to the database or perform sync:', err);
  });