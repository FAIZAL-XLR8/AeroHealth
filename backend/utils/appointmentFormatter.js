const Payment = require('../models/Payment');
const formatAppointmentsWithValidity = async (appointments) => {
  const paidApptIds = appointments
    .filter(a => a.paymentStatus === 'paid')
    .map(a => a._id);

  const payments = await Payment.find({ appointmentId: { $in: paidApptIds }, paymentStatus: 'paid' });

  const paymentsMap = new Map();
  payments.forEach(p => {
    paymentsMap.set(p.appointmentId.toString(), p);
  });

  return appointments.map(appt => {
    const apptObj = appt.toObject();

    let start = appt.createdAt;
    if (appt.paymentStatus === 'paid') {
      const payment = paymentsMap.get(appt._id.toString());
      if (payment) {
        start = payment.createdAt;
      }
    }

    const expiresAt = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    apptObj.chatEnabledUntil = expiresAt;

    const msRemaining = expiresAt.getTime() - Date.now();
    let remainingValidity = 'Expired';
    if (msRemaining > 0) {
      const dateStr = expiresAt.toLocaleDateString('en-GB');
      remainingValidity = `Expires on ${dateStr}`;
    } else {
      remainingValidity = 'Expired';
    }

    apptObj.remainingValidity = remainingValidity;
    apptObj.bookingTime = start;

    return apptObj;
  });
};

module.exports = {
  formatAppointmentsWithValidity,
};
