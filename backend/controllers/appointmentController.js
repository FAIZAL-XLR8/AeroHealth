const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const DoctorAvailability = require('../models/DoctorAvailability');

const DEFAULT_SLOTS = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
];

const parseTimeToMinutes = (timeStr) => {
  const match = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return 0;
  let [_, hoursStr, minutesStr, ampm] = match;
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr ? parseInt(minutesStr, 10) : 0;
  if (hours === 12) hours = 0;
  if (ampm.toUpperCase() === 'PM') hours += 12;
  return hours * 60 + minutes;
};

const getStartOfDay = (dateInput) => {
  const targetDate = new Date(dateInput);
  targetDate.setHours(0, 0, 0, 0);
  return targetDate;
};

const isSlotPassed = (dateInput, slotStr) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  let targetStr = '';
  if (dateInput instanceof Date) {
    const y = dateInput.getFullYear();
    const m = String(dateInput.getMonth() + 1).padStart(2, '0');
    const d = String(dateInput.getDate()).padStart(2, '0');
    targetStr = `${y}-${m}-${d}`;
  } else if (typeof dateInput === 'string') {
    targetStr = dateInput.split('T')[0];
  } else {
    const dObj = new Date(dateInput);
    const y = dObj.getFullYear();
    const m = String(dObj.getMonth() + 1).padStart(2, '0');
    const d = String(dObj.getDate()).padStart(2, '0');
    targetStr = `${y}-${m}-${d}`;
  }

  if (targetStr < todayStr) {
    return true;
  }
  if (targetStr > todayStr) {
    return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const slotMinutes = parseTimeToMinutes(slotStr);

  return currentMinutes > slotMinutes;
};

const findApprovedDoctor = async (doctorId) => {
  const doctor = await Doctor.findOne({ _id: doctorId, status: 'approved', isVerified: true });
  if (!doctor) {
    throw new Error('Doctor not found or profile is not approved/verified.');
  }
  return doctor;
};

const findOrCreateAvailability = async (doctorId, date) => {
  const startOfDay = getStartOfDay(date);
  let availability = await DoctorAvailability.findOne({ doctorId, date: startOfDay });
  if (!availability) {
    availability = new DoctorAvailability({
      doctorId,
      date: startOfDay,
      slots: DEFAULT_SLOTS.map(time => ({ time, isBooked: false }))
    });
    await availability.save();
  }
  return availability;
};

exports.getAvailableSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required.' });
    }

    await findApprovedDoctor(doctorId);

    const startOfDay = getStartOfDay(date);

    const availability = await findOrCreateAvailability(doctorId, startOfDay);

    const now = new Date();
    const activeReservations = await Appointment.find({
      doctorId,
      appointmentDate: startOfDay,
      paymentStatus: 'pending',
      reservedUntil: { $gt: now }
    });

    const reservationMap = new Map();
    activeReservations.forEach(r => {
      reservationMap.set(r.slotTime, r);
    });

    const slotDetails = availability.slots
      .filter(s => DEFAULT_SLOTS.includes(s.time))
      .map(s => {
        const reservation = reservationMap.get(s.time);
        const isReserved = !!reservation;
        const passed = isSlotPassed(date, s.time);
        const isAvailable = !s.isBooked && !isReserved && !passed;

        return {
          slot: s.time,
          isAvailable,
          reason: s.isBooked ? 'booked' : (isReserved ? 'reserved' : (passed ? 'passed' : null)),
          expiresInSeconds: isReserved
            ? Math.max(0, Math.floor((reservation.reservedUntil.getTime() - now.getTime()) / 1000))
            : null
        };
      });

    res.status(200).json(slotDetails);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error retrieving available slots.' });
  }
};

exports.reserveSlot = async (req, res) => {
  try {
    const { doctorId, date, slotTime, patientName, patientAge, patientGender } = req.body;
    const userId = req.user.id;

    if (!doctorId || !date || !slotTime) {
      return res.status(400).json({ message: 'Doctor, date, and slot time are required.' });
    }

    if (isSlotPassed(date, slotTime)) {
      return res.status(400).json({ message: 'This slot time has already passed.' });
    }

    const doctor = await findApprovedDoctor(doctorId);

    const startOfDay = getStartOfDay(date);

    const availability = await findOrCreateAvailability(doctorId, startOfDay);

    const slotIndex = availability.slots.findIndex(s => s.time === slotTime);
    if (slotIndex === -1) {
      return res.status(400).json({ message: 'Invalid slot time.' });
    }

    const slot = availability.slots[slotIndex];
    if (slot.isBooked) {
      return res.status(400).json({ message: 'This slot is already booked.' });
    }

    const now = new Date();
    const activeReservation = await Appointment.findOne({
      doctorId,
      appointmentDate: startOfDay,
      slotTime,
      paymentStatus: 'pending',
      reservedUntil: { $gt: now }
    });

    if (activeReservation) {
      if (activeReservation.patientId.toString() === userId.toString()) {
        activeReservation.reservedUntil = new Date(Date.now() + 10 * 60 * 1000);
        if (patientName) activeReservation.patientName = patientName;
        if (patientAge) activeReservation.patientAge = patientAge;
        if (patientGender) activeReservation.patientGender = patientGender;
        await activeReservation.save();
        return res.status(200).json({
          message: 'Reservation refreshed.',
          appointment: activeReservation
        });
      }
      return res.status(400).json({ message: 'This slot is currently reserved.' });
    }

    const previousBookings = await Appointment.find({
      doctorId,
      appointmentDate: startOfDay,
      paymentStatus: 'paid'
    });

    const targetMinutes = parseTimeToMinutes(slotTime);
    const beforeCount = previousBookings.filter(appt =>
      parseTimeToMinutes(appt.slotTime) < targetMinutes
    ).length;

    const queueNumber = beforeCount + 1;

    const appointment = new Appointment({
      patientId: userId,
      doctorId,
      appointmentDate: startOfDay,
      slotTime,
      amountPaid: doctor.consultationFee || 500,
      paymentStatus: 'pending',
      appointmentStatus: 'pending',
      reservedUntil: new Date(Date.now() + 10 * 60 * 1000),
      queueNumber,
      patientName,
      patientAge,
      patientGender
    });

    await appointment.save();

    res.status(201).json({
      message: 'Slot reserved for 10 minutes.',
      appointment,
      estimatedWaitMinutes: beforeCount * 15
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error reserving slot.' });
  }
};

exports.cancelReservation = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const userId = req.user.id;

    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required.' });
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      patientId: userId,
      paymentStatus: 'pending'
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Active pending appointment not found.' });
    }

    await Appointment.findByIdAndDelete(appointmentId);

    res.status(200).json({ message: 'Reservation cancelled and slot released.' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error cancelling reservation.' });
  }
};
