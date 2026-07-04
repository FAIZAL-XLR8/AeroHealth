const Doctor = require('../models/Doctor');
const PendingDoctor = require('../models/PendingDoctor');
const { sendApprovalEmail, sendSuspensionEmail, sendRejectionEmail } = require('../services/emailServices');
const jwt = require('jsonwebtoken');
const User = require('../models/User');


exports.getPendingDoctors = async (req, res) => {
  try {
    const pending = await PendingDoctor.find({}).sort({ createdAt: -1 });
    const registered = await Doctor.find({}).sort({ createdAt: -1 });
    res.status(200).json([...pending, ...registered]);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving doctor applications.' });
  }
};


exports.approveDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;


    let doctor = await Doctor.findById(doctorId);
    if (doctor) {
      if (doctor.status !== 'approved') {
        doctor.status = 'approved';
        doctor.isVerified = true;
        doctor.rejectionReason = '';
        await doctor.save();

        try {
          await sendApprovalEmail(doctor.email, doctor.name);
        } catch (mailErr) {
          console.error('Error sending doctor approval email:', mailErr.message);
        }

        return res.status(200).json({ message: 'Doctor account approved successfully. Notification email sent.', doctor });
      }
      return res.status(200).json({ message: 'Doctor is already approved.', doctor });
    }

    const pending = await PendingDoctor.findById(doctorId);
    if (!pending) {
      return res.status(404).json({ message: 'Doctor application not found.' });
    }

    doctor = await Doctor.create({
      name: pending.name,
      email: pending.email,
      password: pending.password,
      profileImage: pending.profileImage,
      specialization: pending.specialization,
      qualification: pending.qualification,
      experienceYears: pending.experienceYears,
      consultationFee: pending.consultationFee,
      bio: pending.bio,
      isOnline: pending.isOnline,
      lastSeen: pending.lastSeen,
      phone: pending.phone,
      governmentIdUrl: pending.governmentIdUrl,
      emailVerified: true,
      phoneVerified: true,
      status: 'approved',
      isVerified: true,
      approvedBy: req.user?.name || req.user?.id || 'Admin',
      approvedAt: new Date(),
      location: pending.location,
      address: pending.address,
      activeHours: pending.activeHours
    });

    await PendingDoctor.findByIdAndDelete(doctorId);

    try {
      await sendApprovalEmail(doctor.email, doctor.name);
    } catch (mailErr) {
      console.error('Error sending doctor approval email:', mailErr.message);
    }

    res.status(200).json({ message: 'Doctor application approved successfully. Notification email sent.', doctor });
  } catch (error) {

    res.status(500).json({ message: 'Error approving doctor application.' });
  }
};


exports.rejectDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ message: 'Rejection reason is required.' });
    }

    const doctor = await PendingDoctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor application not found.' });
    }

    doctor.status = 'rejected';
    doctor.isVerified = false;
    doctor.rejectionReason = rejectionReason.trim();

    await doctor.save();

    await sendRejectionEmail(doctor.email, doctor.name, doctor.rejectionReason);
    res.status(200).json({ message: 'Doctor application rejected. Notification email sent.', doctor });
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting doctor application.' });
  }
};


exports.suspendDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { suspensionReason } = req.body;

    if (!suspensionReason || !suspensionReason.trim()) {
      return res.status(400).json({ message: 'Suspension reason is required.' });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found.' });
    }

    doctor.status = 'suspended';
    doctor.isVerified = false;
    doctor.rejectionReason = suspensionReason.trim();

    await doctor.save();

    try {
      await sendSuspensionEmail(doctor.email, doctor.name, suspensionReason.trim());
    } catch (mailErr) {
    }

    res.status(200).json({ message: 'Doctor account suspended and email notification sent.', doctor });
  } catch (error) {
    res.status(500).json({ message: 'Error suspending doctor account.' });
  }
};
