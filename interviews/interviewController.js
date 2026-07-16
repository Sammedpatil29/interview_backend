const Interview = require('./interviewModel');
const Candidate = require('../candidate/candidateModel');
const Interviewer = require('../interviewer/interviewerModel');
const sequelize = require('../db');
const sendEmail = require('../utils/email');
const crypto = require('crypto');

/**
 * @description Create a new interview
 * @route POST /api/interview
 */
exports.createInterview = async (req, res) => {
  try {
    const { mobileNumber, candidateEmail, candidateName, skills, type, amount } = req.body;

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

    // Calculate and set the interviewer's share
    if (amount && !isNaN(parseFloat(amount))) {
      interviewData.interviewerShare = {
        share: parseFloat(amount) * 0.3,
        approved: false,
      };
    }

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
    const { id, role } = req.user; // Decoded from auth token
    const whereClause = {};

    switch (role) {
      case 'admin':
        // Admin sees all interviews, so the whereClause remains empty.
        break;
      case 'candidate':
        whereClause.candidateId = id;
        break;
      case 'hr':
        whereClause['hr.id'] = id;
        break;
      case 'interviewer':
        whereClause['interviewer.id'] = id;
        break;
      default:
        // For any other role, or if role is undefined, return no interviews.
        return res.status(200).json([]);
    }

    const interviews = await Interview.findAll({ where: whereClause });
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
    const interviewId = req.params.id;
    const interview = await Interview.findByPk(interviewId);

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    const newTimelineEvents = [];
    const updateData = { ...req.body };

    // A helper to safely send emails and log errors
    const sendNotificationEmail = async (options) => {
      try {
        await sendEmail(options);
      } catch (emailError) {
        console.error(`Failed to send email to ${options.to}:`, emailError);
        // In a production app, you might add this to a retry queue.
      }
    };

    // Check for a new timeline event sent in the request body
    if (updateData.timeline && typeof updateData.timeline === 'object' && !Array.isArray(updateData.timeline)) {
      const newTimelineEntry = updateData.timeline;
      const newStatus = newTimelineEntry.status;
      const comment = newTimelineEntry.comment || `Interview status manually updated to ${newStatus}.`;

      newTimelineEvents.push({
        date: new Date(),
        status: newStatus,
        comment: comment,
      });

      // If the new status is 'cancelled', notify relevant parties
      if (newStatus && newStatus.toLowerCase() === 'cancelled') {
        const cancellationReason = comment ? `<p>Reason: ${comment}</p>` : '';
        const subject = `Interview Cancelled: ${interview.candidateName}`;

        // Notify candidate
        sendNotificationEmail({
          to: interview.candidateEmail,
          subject: subject,
          html: `<p>Hello ${interview.candidateName},</p><p>We regret to inform you that your scheduled interview has been cancelled.</p>${cancellationReason}<p>The Hiring Team</p>`,
        });

        // Notify interviewer if they exist
        if (interview.interviewer?.email) {
          sendNotificationEmail({
            to: interview.interviewer.email,
            subject: subject,
            html: `<p>Hello ${interview.interviewer.name},</p><p>The interview with candidate ${interview.candidateName} has been cancelled.</p>${cancellationReason}<p>The Hiring Team</p>`,
          });
        }
      }
    }

    // Check for changes and create timeline events
    if (updateData.hr && JSON.stringify(interview.hr) !== JSON.stringify(updateData.hr)) {
      newTimelineEvents.push({
        date: new Date(),
        status: 'HR Assigned',
        comment: 'HR details were updated.',
      });
      // Notify candidate that HR has been assigned
      sendNotificationEmail({
        to: interview.candidateEmail,
        subject: `Update on Your Interview Process`,
        html: `<p>Hello ${interview.candidateName},</p><p>This is to inform you that ${updateData.hr.name} has been assigned as the HR contact for your interview process. They will be in touch with you regarding the next steps.</p><p>Best regards,</p><p>The Hiring Team</p>`,
      });
    }
    if (updateData.interviewer && JSON.stringify(interview.interviewer) !== JSON.stringify(updateData.interviewer)) {
      newTimelineEvents.push({
        date: new Date(),
        status: 'Interviewer Assigned',
        comment: 'Interviewer was assigned or changed.',
      });
      // Notify candidate
      sendNotificationEmail({
        to: interview.candidateEmail,
        subject: `An Interviewer has been Assigned`,
        html: `<p>Hello ${interview.candidateName},</p><p>We are pleased to inform you that an interviewer has been assigned for your upcoming technical discussion. We will share the schedule with you shortly.</p><p>Best regards,</p><p>The Hiring Team</p>`,
      });
      // Notify interviewer
      sendNotificationEmail({
        to: updateData.interviewer.email,
        subject: `New Interview Assignment: ${interview.candidateName}`,
        html: `<p>Hello ${updateData.interviewer.name},</p><p>You have been assigned a new interview for the candidate: <strong>${interview.candidateName}</strong>.</p><p>The role is for a ${interview.type} position with skills in ${interview.skills.join(', ')}.</p><p>We will notify you once the interview is scheduled.</p><p>Thank you,</p><p>The Hiring Team</p>`,
      });
    }
    if (updateData.schedule && JSON.stringify(interview.schedule) !== JSON.stringify(updateData.schedule)) {
      newTimelineEvents.push({
        date: new Date(),
        status: 'Interview Scheduled',
        comment: 'Interview schedule was updated.',
      });

      const scheduleDetails = `<p>Date: ${new Date(updateData.schedule.date).toLocaleDateString()}</p><p>Time: ${updateData.schedule.time}</p>`;
      const meetingLink = updateData.meetingUrl ? `<p>Meeting Link: <a href="${updateData.meetingUrl}">${updateData.meetingUrl}</a></p>` : '';

      // Notify candidate
      sendNotificationEmail({
        to: interview.candidateEmail,
        subject: `Your Interview has been Scheduled`,
        html: `<p>Hello ${interview.candidateName},</p><p>Your interview has been scheduled. Please find the details below:</p>${scheduleDetails}${meetingLink}<p>Please ensure you join on time. All the best!</p>`,
      });

      // Determine the correct interviewer email (newly assigned or existing)
      const interviewerEmail = updateData.interviewer?.email || interview.interviewer?.email;
      const interviewerName = updateData.interviewer?.name || interview.interviewer?.name;

      if (interviewerEmail) {
        // Notify interviewer
        sendNotificationEmail({
          to: interviewerEmail,
          subject: `Interview Scheduled: ${interview.candidateName}`,
          html: `<p>Hello ${interviewerName},</p><p>The interview with ${interview.candidateName} has been scheduled. Please find the details below:</p>${scheduleDetails}${meetingLink}<p>Thank you for your time.</p>`,
        });
      }
    }

    // If there are new events, add them to the existing timeline
    if (newTimelineEvents.length > 0) {
      updateData.timeline = [...interview.timeline, ...newTimelineEvents];
    }

    const updatedInterview = await interview.update(updateData);
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

/**
 * @description Get interviews that are complete and pending interviewer payment approval.
 * @route GET /api/interview/pending-approvals
 */
exports.getPendingApprovals = async (req, res) => {
  try {
    // This is an admin/finance task, so we should check the user's role.
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action.' });
    }

    const { Op } = require('sequelize');
    const pendingInterviews = await Interview.findAll({
      where: {
        // Find interviews where the interviewerShare object exists...
        [Op.and]: [
          { interviewerShare: { [Op.ne]: null } },
          // ...and the 'approved' flag within that JSONB object is false.
          sequelize.literal(`("interviewerShare"->>'approved')::boolean = false`),
          // ...and the last timeline status is 'Completed'.
          sequelize.literal(`("timeline" -> -1 ->> 'status') = 'Completed'`),
        ],
      },
    });

    res.status(200).json(pendingInterviews);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving interviews pending approval', error: error.message });
  }
};

/**
 * @description Approve interviewer share, and add a transaction record to the interviewer.
 * @route PUT /api/interview/:id/approve-share
 */
exports.approveInterviewerShare = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    // Ensure the user is an admin
    if (req.user.role !== 'admin') {
      await transaction.rollback();
      return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action.' });
    }

    const interviewId = req.params.id;
    const interview = await Interview.findByPk(interviewId, { transaction });

    if (!interview) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Interview not found.' });
    }

    if (!interview.interviewer || !interview.interviewerShare) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Interview has no interviewer or share amount to approve.' });
    }

    if (interview.interviewerShare.approved) {
      await transaction.rollback();
      return res.status(400).json({ message: 'This interviewer share has already been approved.' });
    }

    const interviewer = await Interviewer.findByPk(interview.interviewer.id, { transaction });

    if (!interviewer) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Associated interviewer not found.' });
    }

    // 1. Update the Interview: Mark share as approved and add a timeline event
    const updatedShare = { ...interview.interviewerShare, approved: true };
    const newTimelineEvent = {
      date: new Date(),
      status: 'Payment Approved',
      comment: `Interviewer share of ${updatedShare.share} approved by admin.`,
    };
    interview.interviewerShare = updatedShare;
    // interview.timeline = [...interview.timeline, newTimelineEvent];
    await interview.save({ transaction });

    // 2. Update the Interviewer's wallet and transaction history
    const shareAmount = parseFloat(updatedShare.share);
    const currentWallet = interviewer.wallet || { balance: 0, pending: 0, withdrawn: 0 };

    const newTransaction = {
      date: new Date().toISOString(),
      amount: shareAmount,
      type: 'credit',
      comment: `Payment for interview with ${interview.candidateName} (Interview ID: ${interview.id})`,
    };

    // Update wallet balance and add the new transaction to its history
    const newBalance = (parseFloat(currentWallet.balance) || 0) + shareAmount;
    interviewer.set('wallet', { ...currentWallet, balance: newBalance });

    interviewer.transactions = [...interviewer.transactions, newTransaction];
    await interviewer.save({ transaction });

    // If all goes well, commit the transaction
    await transaction.commit();

    res.status(200).json({ message: 'Interviewer share approved successfully.' });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: 'Error approving interviewer share', error: error.message });
  }
};