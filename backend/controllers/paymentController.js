const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const DoctorAvailability = require('../models/DoctorAvailability');
const Doctor = require('../models/Doctor');
const dotenv = require('dotenv');
const crypto = require('crypto');
const Razorpay = require('razorpay');

dotenv.config();

const getRazorpay = () => {
  const keyId = process.env.RAZORPAY_API_KEY;
  const keySecret = process.env.RAZORPAY_API_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials (RAZORPAY_API_KEY / RAZORPAY_API_SECRET) are missing in backend/.env.');
  }
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

const confirmAppointmentPayment = async (appointmentId, orderId, paymentId, signature, amountPaid) => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new Error('Appointment not found.');
  }

  if (appointment.paymentStatus === 'paid') {
    return appointment;
  }

  appointment.paymentStatus = 'paid';
  appointment.appointmentStatus = 'confirmed';
  appointment.chatEnabledUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  if (orderId) {
    appointment.razorpayOrderId = orderId;
  }
  await appointment.save();

  await DoctorAvailability.updateOne(
    {
      doctorId: appointment.doctorId,
      date: appointment.appointmentDate,
      'slots.time': appointment.slotTime
    },
    {
      $set: {
        'slots.$.isBooked': true,
        'slots.$.bookedBy': appointment.patientId,
        'slots.$.appointmentId': appointment._id
      }
    }
  );

  const paymentLog = new Payment({
    appointmentId: appointment._id,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: signature,
    amount: amountPaid,
    currency: 'INR',
    paymentStatus: 'paid',
  });
  await paymentLog.save();

  return appointment;
};

exports.createCheckoutSession = async (req, res) => {
  try {
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ success: false, message: 'Appointment ID is required.' });
    }

    const appointment = await Appointment.findById(appointmentId).populate('doctorId');
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    const doctor = appointment.doctorId;
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found for this appointment.' });
    }

    const doctorName = doctor.name;
    const amountInINR = appointment.amountPaid;

    const razorpay = getRazorpay();

    const options = {
      amount: Math.round(amountInINR * 100),
      currency: 'INR',
      receipt: `receipt_apt_${appointment._id}`,
      notes: {
        appointmentId: appointment._id.toString(),
        patientId: appointment.patientId.toString(),
        doctorId: appointment.doctorId.toString(),
      }
    };

    const order = await razorpay.orders.create(options);

    appointment.razorpayOrderId = order.id;
    await appointment.save();

    res.status(200).json({
      success: true,
      key: process.env.RAZORPAY_API_KEY,
      amount: order.amount,
      currency: order.currency,
      orderId: order.id,
      appointmentId: appointment._id,
      patient: {
        name: req.user ? req.user.name : '',
        email: req.user ? req.user.email : '',
        phone: req.user ? req.user.phone : '',
      }
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return res.status(400).json({ success: false, message: "Unable to complete Razorpay order request." });
  }
};

exports.verifyCheckoutSession = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appointmentId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !appointmentId) {
      return res.status(400).json({ success: false, message: 'All verification parameters are required.' });
    }

    const keySecret = process.env.RAZORPAY_API_SECRET;
    if (!keySecret) {
      throw new Error('RAZORPAY_API_SECRET is missing in backend/.env.');
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Signature verification failed. Invalid request.' });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    const amountPaid = appointment.amountPaid;

    const updatedAppointment = await confirmAppointmentPayment(
      appointmentId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amountPaid
    );

    res.status(200).json({
      success: true,
      message: 'Payment verified and appointment confirmed.',
      appointment: updatedAppointment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to complete Razorpay verification request." });
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('RAZORPAY_WEBHOOK_SECRET is missing in backend/.env.');
    }

    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update(req.body);
    const expectedSignature = shasum.digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).send('Invalid webhook signature.');
    }

    const payload = JSON.parse(req.body.toString());

    if (payload.event === 'order.paid' || payload.event === 'payment.captured') {
      let orderId, paymentId, amountPaise;

      if (payload.event === 'order.paid') {
        const orderEntity = payload.payload.order.entity;
        orderId = orderEntity.id;
        amountPaise = orderEntity.amount;
      } else {
        const paymentEntity = payload.payload.payment.entity;
        orderId = paymentEntity.order_id;
        paymentId = paymentEntity.id;
        amountPaise = paymentEntity.amount;
      }

      if (orderId) {
        const appointment = await Appointment.findOne({ razorpayOrderId: orderId });
        if (appointment) {
          const amountPaid = amountPaise / 100;
          await confirmAppointmentPayment(
            appointment._id,
            orderId,
            paymentId || '',
            '',
            amountPaid
          );
        }
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    res.status(500).send(`Webhook process error: ${err.message}`);
  }
};
