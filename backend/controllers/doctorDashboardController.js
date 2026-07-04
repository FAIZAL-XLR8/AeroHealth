const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const { formatAppointmentsWithValidity } = require('../utils/appointmentFormatter');

exports.getDoctorDashboard = async (req, res) => {
  try {
    const doctorProfile = await Doctor.findById(req.user.id);
    if (!doctorProfile) {
      return res.status(404).json({ message: 'Doctor profile not found.' });
    }

    const doctorId = doctorProfile._id;

    const appointments = await Appointment.find({
      doctorId,
      paymentStatus: 'paid'
    })
      .populate('patientId', 'name email phone profileImage isOnline lastSeen dateOfBirth gender')
      .sort({ appointmentDate: 1, slotTime: 1 });

    const formatted = await formatAppointmentsWithValidity(appointments);
    const activeOnly = formatted.filter(appt => appt.remainingValidity !== 'Expired');

    res.status(200).json({
      doctorProfile,
      appointments: activeOnly
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving doctor dashboard.' });
  }
};
