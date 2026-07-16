const Payout = require('./payoutModel');
const Interviewer = require('../interviewer/interviewerModel');
const sendEmail = require('../utils/email');
const sequelize = require('../db');

/**
 * @description Create a new payout request (Interviewer only)
 * @route POST /api/payout
 */
exports.createPayout = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id: interviewerId, role, name: interviewerName } = req.user;
    const { upiId } = req.body;

    if (role !== 'interviewer') {
      await transaction.rollback();
      return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action.' });
    }

    if (!upiId) {
      await transaction.rollback();
      return res.status(400).json({ message: 'UPI ID is required for the payout request.' });
    }

    // Lock the interviewer row to prevent race conditions on wallet updates
    const interviewer = await Interviewer.findByPk(interviewerId, { transaction, lock: transaction.LOCK.UPDATE });

    if (!interviewer) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Interviewer not found.' });
    }

    const payoutAmount = parseFloat(interviewer.wallet.balance) || 0;
    if (payoutAmount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Your wallet balance is zero. No payout can be created.' });
    }

    // Update wallet: move amount from balance to pending
    const newBalance = 0;
    const newPending = (parseFloat(interviewer.wallet.pending) || 0) + payoutAmount;
    interviewer.wallet = { ...interviewer.wallet, balance: newBalance, pending: newPending };

    // Add a debit transaction to interviewer's history
    const debitTransaction = {
      date: new Date().toISOString(),
      amount: payoutAmount,
      type: 'debit',
      comment: `Payout request of ${payoutAmount}`,
    };
    interviewer.transactions = [...interviewer.transactions, debitTransaction];
    await interviewer.save({ transaction });

    // Create the payout record for admin processing
    const payout = await Payout.create({ interviewerId, interviewerName, upiId, amount: payoutAmount, status: 'pending' }, { transaction });

    await transaction.commit();

    // Send notification email for payout request after transaction is committed
    try {
      await sendEmail({
        to: interviewer.email,
        subject: 'Your Payout Request has been Received',
        html: `<p>Hello ${interviewer.name},</p><p>We have received your payout request for the amount of <strong>${payoutAmount}</strong>. It is now being processed.</p><p>You will receive another email once the payout is completed.</p><p>Thank you,</p><p>The Finance Team</p>`,
      });
    } catch (emailError) {
      // Log the error, but don't fail the request as the transaction is already complete.
      console.error(`Failed to send 'payout created' email to ${interviewer.email}:`, emailError);
    }

    res.status(201).json({ message: 'New payout created!', data: payout });
  } catch (error) {
    await transaction.rollback();
    res.status(400).json({ message: 'Error creating payout', error: error.message });
  }
};

/**
 * @description Get all payouts (Admin) or only personal payouts (Interviewer)
 * @route GET /api/payout
 */
exports.getAllPayouts = async (req, res) => {
  try {
    const { id, role } = req.user;
    let queryOptions = {};

    if (role === 'interviewer') {
      queryOptions.where = { interviewerId: id };
    } else if (role !== 'admin') {
      return res.status(200).json([]); // Return empty for other roles
    }

    const payouts = await Payout.findAll(queryOptions);
    res.status(200).json(payouts);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving payouts', error: error.message });
  }
};

/**
 * @description Get a single payout by ID
 * @route GET /api/payout/:id
 */
exports.getPayoutById = async (req, res) => {
  try {
    const payout = await Payout.findByPk(req.params.id);
    if (!payout) {
      return res.status(404).json({ message: 'Payout not found' });
    }

    // Security check: an interviewer can only see their own payout
    if (req.user.role === 'interviewer' && payout.interviewerId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: You cannot view this payout.' });
    }

    res.status(200).json(payout);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving payout', error: error.message });
  }
};

/**
 * @description Update a payout by ID (e.g., status, utrId)
 * @route PUT /api/payout/:id
 */
exports.updatePayout = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id: payoutId } = req.params;
    const { status, utrId } = req.body;

    if (req.user.role !== 'admin') {
      await transaction.rollback();
      return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action.' });
    }

    const payout = await Payout.findByPk(payoutId, { transaction });
    if (!payout) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Payout not found' });
    }

    if (payout.status === 'completed' || payout.status === 'failed') {
      await transaction.rollback();
      return res.status(400).json({ message: `This payout has already been marked as ${payout.status}.` });
    }

    const interviewer = await Interviewer.findByPk(payout.interviewerId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!interviewer) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Associated interviewer not found.' });
    }

    const payoutAmount = parseFloat(payout.amount);
    const currentPending = parseFloat(interviewer.wallet.pending) || 0;

    if (status === 'completed') {
      if (!utrId) {
        await transaction.rollback();
        return res.status(400).json({ message: 'UTR ID is required to mark a payout as completed.' });
      }

      // Move amount from pending to withdrawn
      const newPending = currentPending - payoutAmount;
      const newWithdrawn = (parseFloat(interviewer.wallet.withdrawn) || 0) + payoutAmount;
      interviewer.wallet = { ...interviewer.wallet, pending: newPending, withdrawn: newWithdrawn };

      // Add a transaction record for the completed payout
      interviewer.transactions = [...interviewer.transactions, {
        date: new Date().toISOString(),
        amount: payoutAmount,
        type: 'payout_complete',
        comment: `Payout of ${payoutAmount} completed. UTR: ${utrId}`,
      }];

      payout.status = 'completed';
      payout.utrId = utrId;

      // Send notification email for completed payout
      try {
        await sendEmail({
          to: interviewer.email,
          subject: 'Your Payout has been Processed',
          html: `<p>Hello ${interviewer.name},</p><p>Your payout request for the amount of <strong>${payoutAmount}</strong> has been successfully processed.</p><p>The transaction reference ID is: <strong>${utrId}</strong>.</p><p>Thank you,</p><p>The Finance Team</p>`,
        });
      } catch (emailError) {
        console.error(`Failed to send 'completed' payout email to ${interviewer.email}:`, emailError);
      }

    } else if (status === 'failed') {
      // Refund amount from pending back to balance
      const newPending = currentPending - payoutAmount;
      const newBalance = (parseFloat(interviewer.wallet.balance) || 0) + payoutAmount;
      interviewer.wallet = { ...interviewer.wallet, pending: newPending, balance: newBalance };

      // Add a transaction record for the failed payout
      interviewer.transactions = [...interviewer.transactions, {
        date: new Date().toISOString(),
        amount: payoutAmount,
        type: 'payout_failed',
        comment: `Payout request of ${payoutAmount} failed and was refunded to wallet.`,
      }];

      payout.status = 'failed';

      // Send notification email for failed payout
      try {
        await sendEmail({
          to: interviewer.email,
          subject: 'Your Payout Request Failed',
          html: `<p>Hello ${interviewer.name},</p><p>We're sorry, but your payout request for the amount of <strong>${payoutAmount}</strong> has failed. The amount has been refunded to your wallet balance.</p><p>Please check your payment details or contact support for assistance.</p><p>Thank you,</p><p>The Finance Team</p>`,
        });
      } catch (emailError) {
        console.error(`Failed to send 'failed' payout email to ${interviewer.email}:`, emailError);
      }
    }

    await interviewer.save({ transaction });
    await payout.save({ transaction });
    await transaction.commit();

    res.status(200).json({ message: `Payout marked as ${status}.`, data: payout });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: 'Error updating payout', error: error.message });
  }
};