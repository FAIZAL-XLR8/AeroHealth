const Appointment = require('../models/Appointment');
const { formatAppointmentsWithValidity } = require('../utils/appointmentFormatter');

exports.getPatientDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    const appointments = await Appointment.find({
      patientId: userId,
      $or: [
        { paymentStatus: 'paid' },
        { paymentStatus: 'pending', reservedUntil: { $gt: now } }
      ]
    })
      .populate({
        path: 'doctorId',
        select: 'name specialization consultationFee activeHours profileImage isOnline lastSeen'
      })
      .sort({ appointmentDate: 1, slotTime: 1 });

    const formatted = await formatAppointmentsWithValidity(appointments);
    const activeOnly = formatted.filter(appt => appt.remainingValidity !== 'Expired');
    res.status(200).json(activeOnly);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving patient dashboard.' });
  }
};

exports.getPatientAppointments = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (req.user && req.user.id !== patientId) {
      return res.status(403).json({ message: 'Forbidden.' });
    }
    const appointments = await Appointment.find({ patientId })
      .populate('doctorId', 'name specialization')
      .sort({ appointmentDate: 1, slotTime: 1 });
    res.status(200).json(appointments);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving appointments.' });
  }
};
