const Interview = require('../interviews/interviewModel');
const Candidate = require('../candidate/candidateModel');
const Interviewer = require('../interviewer/interviewerModel');
const Hr = require('../hr/hrModel');
const Payout = require('../payout/payoutModel');
const { Sequelize } = require('sequelize');

/**
 * @description Get dashboard data for the logged-in user based on their role.
 * @route GET /api/dashboard
 */
exports.getDashboardData = async (req, res) => {
  try {
    const { id, role } = req.user;
    let dashboardCards = [];

    if (role === 'candidate') {
      const interviews = await Interview.findAll({ where: { candidateId: id } });

      let amountSpent = 0;
      let activeInterviews = 0;
      let interviewsTaken = 0;

      interviews.forEach(interview => {
        // Sum up the amount spent
        amountSpent += parseFloat(interview.amount || 0);

        // Check the status of the last timeline event
        const lastTimelineEvent = interview.timeline && interview.timeline.length > 0
          ? interview.timeline[interview.timeline.length - 1]
          : null;

        if (lastTimelineEvent && lastTimelineEvent.status === 'Completed') {
          interviewsTaken++;
        } else {
          activeInterviews++;
        }
      });

      dashboardCards = [
        { title: 'Total Interviews', value: String(interviews.length), icon: 'work_history', color: 'primary' },
        { title: 'Active Interviews', value: String(activeInterviews), icon: 'pending_actions', color: 'info' },
        { title: 'Interviews Taken', value: String(interviewsTaken), icon: 'task_alt', color: 'success' },
        { title: 'Amount Spent', value: `₹${amountSpent.toFixed(2)}`, icon: 'shopping_cart', color: 'danger' },
      ];
    } else if (role === 'hr') {
      // Find interviews where the 'hr' JSONB field contains the logged-in HR's ID.
      const interviewsPromise = Interview.findAll({
        where: Sequelize.where(
          Sequelize.cast(Sequelize.json("hr.id"), 'int'),
          id
        ),
      });

      // Count interviewers with inactive status
      const inactiveInterviewersCountPromise = Interviewer.count({ where: { status: 'inactive' } });

      const [interviews, inactiveInterviewersCount] = await Promise.all([
        interviewsPromise,
        inactiveInterviewersCountPromise,
      ]);

      let activeInterviews = 0;

      interviews.forEach(interview => {
        const lastTimelineEvent = interview.timeline && interview.timeline.length > 0
          ? interview.timeline[interview.timeline.length - 1]
          : null;

        if (!lastTimelineEvent || lastTimelineEvent.status !== 'Completed') {
          activeInterviews++;
        }
      });

      dashboardCards = [
        { title: 'Total Interviews', value: String(interviews.length), icon: 'work_history', color: 'primary' },
        { title: 'Active Interviews', value: String(activeInterviews), icon: 'pending_actions', color: 'info' },
        { title: 'Pending Activations', value: String(inactiveInterviewersCount), icon: 'person_off', color: 'warning' },
      ];
    } else if (role === 'admin') {
      const interviewsPromise = Interview.findAll();
      const pendingPayoutsCountPromise = Payout.count({ where: { status: 'pending' } });
      const hrCountPromise = Hr.count();
      const interviewerCountPromise = Interviewer.count();
      const inactiveInterviewersCountPromise = Interviewer.count({ where: { status: 'inactive' } });
      const totalRevenuePromise = Interview.sum('amount');
      const totalPayoutsPromise = Payout.sum('amount');

      const [
        interviews,
        pendingPayoutsCount,
        hrCount,
        interviewerCount,
        inactiveInterviewersCount,
        totalRevenue,
        totalPayouts,
      ] = await Promise.all([
        interviewsPromise,
        pendingPayoutsCountPromise,
        hrCountPromise,
        interviewerCountPromise,
        inactiveInterviewersCountPromise,
        totalRevenuePromise,
        totalPayoutsPromise,
      ]);

      let activeInterviews = 0;
      let pendingPaymentApprovals = 0;

      interviews.forEach(interview => {
        const lastTimelineEvent = interview.timeline && interview.timeline.length > 0
          ? interview.timeline[interview.timeline.length - 1]
          : null;

        if (!lastTimelineEvent || lastTimelineEvent.status !== 'Completed') {
          activeInterviews++;
        }

        if (lastTimelineEvent && lastTimelineEvent.status === 'Completed' && interview.interviewerShare && !interview.interviewerShare.approved) {
          pendingPaymentApprovals++;
        }
      });

      dashboardCards = [
        { title: 'Total Interviews', value: String(interviews.length), icon: 'work_history', color: 'primary' },
        { title: 'Active Interviews', value: String(activeInterviews), icon: 'pending_actions', color: 'info' },
        { title: 'Pending Payouts', value: String(pendingPayoutsCount), icon: 'request_quote', color: 'danger' },
        { title: 'Pending Transactions', value: String(pendingPaymentApprovals), icon: 'approval', color: 'purple' },
        { title: 'Total HRs', value: String(hrCount), icon: 'manage_accounts', color: 'success' },
        { title: 'Total Interviewers', value: String(interviewerCount), icon: 'groups', color: 'warning' },
        { title: 'Pending Interviewers', value: String(inactiveInterviewersCount), icon: 'pending_actions', color: 'info' },
        { title: 'Total Revenue', value: `₹${Number(totalRevenue || 0).toLocaleString('en-IN')}`, icon: 'manage_accounts', color: 'success' },
        { title: 'Total Payouts', value: `₹${Number(totalPayouts || 0).toLocaleString('en-IN')}`, icon: 'request_quote', color: 'primary' },
      ];
    }
    else if (role === 'interviewer') {
      const interviewsPromise = Interview.findAll({
        where: Sequelize.where(
          Sequelize.cast(Sequelize.json("interviewer.id"), 'int'),
          id
        ),
      });

      const interviewerDetailsPromise = Interviewer.findByPk(id, {
        attributes: ['wallet'],
      });

      const [interviews, interviewerDetails] = await Promise.all([
        interviewsPromise,
        interviewerDetailsPromise,
      ]);

      let activeInterviews = 0;
      let interviewsTaken = 0;
      let totalAmountEarned = 0;

      interviews.forEach(interview => {
        const lastTimelineEvent = interview.timeline && interview.timeline.length > 0 ? interview.timeline[interview.timeline.length - 1] : null;
        if (lastTimelineEvent && lastTimelineEvent.status === 'Completed') {
          interviewsTaken++;
        } else {
          activeInterviews++;
        }

        if (interview.interviewerShare && interview.interviewerShare.share) {
          totalAmountEarned += parseFloat(interview.interviewerShare.share);
        }
      });

      const walletBalance = interviewerDetails?.wallet?.balance || 0;
      const pendingPayouts = interviewerDetails?.wallet?.pending || 0;

      dashboardCards = [
        { title: 'Total Interviews', value: String(interviews.length), icon: 'work_history', color: 'primary' },
        { title: 'Active Interviews', value: String(activeInterviews), icon: 'pending_actions', color: 'info' },
        { title: 'Interviews Taken', value: String(interviewsTaken), icon: 'task_alt', color: 'success' },
        { title: 'Total Earned', value: `₹${totalAmountEarned.toLocaleString('en-IN')}`, icon: 'paid', color: 'purple' },
        { title: 'Wallet Balance', value: `₹${parseFloat(walletBalance).toLocaleString('en-IN')}`, icon: 'account_balance_wallet', color: 'warning' },
        { title: 'Pending Payouts', value: `₹${parseFloat(pendingPayouts).toLocaleString('en-IN')}`, icon: 'request_quote', color: 'danger' },
      ];
    }

    res.status(200).json(dashboardCards);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving dashboard data', error: error.message });
  }
};