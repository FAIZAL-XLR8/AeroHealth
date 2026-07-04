import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MessageSquare, Users, CheckCircle, RefreshCw, AlertCircle, FileText, CreditCard, Shield, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import '../styles/DoctorDashboard.css';
import { apiUrl, fetchWithAuth } from '../utils/api';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const headingVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const descriptionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
  hover: { y: -5, transition: { duration: 0.22, ease: 'easeInOut' } },
};



const DoctorDashboard = ({ onStartConsultation }) => {
  const [appointments, setAppointments] = useState([]);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('todays');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(apiUrl('/api/appointments/doctor/dashboard'));
      const data = await res.json();
      if (res.ok) {
        setAppointments(data.appointments || []);
        setDoctorProfile(data.doctorProfile || null);
      } else {
        setError(data.message || 'Failed to load Doctor Dashboard.');
      }
    } catch (err) {

      setError('Connection error loading dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const startOfToday = new Date();
  startOfToday.setHours(0,0,0,0);
  const endOfToday = new Date();
  endOfToday.setHours(23,59,59,999);

  const todaysAppointments = appointments.filter(appt => {
    const apptDate = new Date(appt.date);
    return apptDate >= startOfToday && apptDate <= endOfToday;
  });

  const upcomingAppointments = appointments.filter(appt => {
    const apptDate = new Date(appt.date);
    return apptDate > endOfToday;
  });

  const activeChats = appointments.filter(appt => {
    const isExpired = appt.remainingValidity === 'Expired' || (appt.chatEnabledUntil && new Date() >= new Date(appt.chatEnabledUntil));
    return appt.paymentStatus === 'paid' && !isExpired;
  });

  const patientsMap = new Map();
  appointments.forEach(appt => {
    const p = appt.patientId;
    if (p && !patientsMap.has(p._id)) {
      patientsMap.set(p._id, {
        ...p,
        lastVisit: appt.date,
        totalBookings: appointments.filter(a => a.patientId?._id === p._id).length
      });
    }
  });
  const patientsList = Array.from(patientsMap.values());

  const getActiveList = () => {
    switch (activeTab) {
      case 'todays': return todaysAppointments;
      case 'upcoming': return upcomingAppointments;
      case 'active-chats': return activeChats;
      default: return [];
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="doc-container"
    >

      {/* Top Banner */}
      <div className="doc-banner">
        <div>
          {doctorProfile && (
            <motion.h2
              variants={headingVariants}
              initial="hidden"
              animate="visible"
              className="doc-title"
            >
              Welcome, {doctorProfile.name.startsWith('Dr.') || doctorProfile.name.startsWith('Dr ') ? doctorProfile.name : `Dr. ${doctorProfile.name}`}
            </motion.h2>
          )}
          <motion.p
            variants={descriptionVariants}
            initial="hidden"
            animate="visible"
            className="doc-subtitle"
          >
            Manage appointments, connect with active consultations, and view patient health history.
          </motion.p>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="doc-refresh-btn"
        >
          <RefreshCw size={14} className={loading ? 'spin-anim' : ''} />
          Refresh Dashboard
        </button>
      </div>

      {error && (
        <div className="doc-error-panel">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="doc-tabs">
        {[
          { id: 'todays', label: `Today's Appointments (${todaysAppointments.length})` },
          { id: 'upcoming', label: `Upcoming (${upcomingAppointments.length})` },
          { id: 'active-chats', label: `Active Chats (${activeChats.length})` },
          { id: 'patients', label: `Patient List (${patientsList.length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="doc-tab"
            style={{
              borderBottom: activeTab === tab.id ? '2px solid var(--primary-neon)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--primary-neon)' : 'var(--text-muted)'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Render Views */}
      {activeTab === 'patients' ? (
        <div className="glass-panel doc-patient-records">
          <h3 className="doc-patient-title">
            <Users size={18} style={{ color: 'var(--primary-neon)' }} />
            Patient Records
          </h3>

          {patientsList.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No registered patients found in your records.
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="doc-patients-grid"
            >
              {patientsList.map(p => (
                <motion.div key={p._id} variants={cardVariants} whileHover="hover" className="doc-patient-card">
                  <img
                    src={p.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop'}
                    alt={p.name}
                    className="doc-patient-avatar"
                  />
                  <div>
                    <h4 className="doc-patient-name">{p.name}</h4>
                    <p className="doc-patient-phone">Phone: {p.phone}</p>
                    <p className="doc-patient-summary">
                      Visited {p.totalBookings} times • Last: {new Date(p.lastVisit).toLocaleDateString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      ) : (
        <div>
          {loading && getActiveList().length === 0 ? (
            <div style={{ color: 'var(--primary-neon)', fontSize: '0.9rem' }}>Loading appointments...</div>
          ) : getActiveList().length === 0 ? (
            <div className="glass-panel doc-appt-empty">
              <Calendar size={48} style={{ color: 'var(--card-border)', marginBottom: '12px' }} />
              <p style={{ fontSize: '0.9rem' }}>No appointments found in this section.</p>
            </div>
          ) : (
            <motion.div
              key={activeTab}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="doc-appt-list"
            >
              {getActiveList().map(appt => {
                const patient = appt.patientId || {};
                const isExpired = appt.remainingValidity === 'Expired' || (appt.chatEnabledUntil && new Date() >= new Date(appt.chatEnabledUntil));

                return (
                  <motion.div key={appt._id} variants={cardVariants} whileHover="hover" className="glass-panel doc-appt-card">

                    {/* Patient detail */}
                    <div className="doc-appt-patient-info">
                      <img
                        src={ 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop'}
                        alt={appt.patientName || patient.name}
                        className="doc-appt-patient-avatar"
                      />
                      <div>
                        <h4 className="doc-appt-patient-name">
                          {appt.patientName || patient.name }
                        </h4>
                        <div className="doc-appt-patient-meta">
                          <span>Phone: {patient.phone || 'N/A'}</span>
                          <span>Age: {appt.patientAge ? `${appt.patientAge} yrs` : 'N/A'}</span>
                          <span>Gender: {appt.patientGender || patient.gender || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Booking slot time details */}
                    <div className="doc-appt-slot">
                      <span className="doc-appt-slot-label">TIMESLOT</span>
                      <span className="doc-appt-slot-val">
                        <Calendar size={12} style={{ color: 'var(--primary-neon)' }} />
                        {new Date(appt.appointmentDate || appt.date).toLocaleDateString('en-GB')}
                      </span>
                      <span className="doc-appt-slot-val" style={{ marginTop: '2px' }}>
                        <Clock size={12} style={{ color: 'var(--primary-neon)' }} />
                        {appt.slotTime}
                      </span>
                    </div>

                    {/* Booking Date & Time */}
                    <div className="doc-appt-slot">
                      <span className="doc-appt-slot-label">BOOKED ON</span>
                      <span className="doc-appt-slot-val">
                        <Calendar size={12} style={{ color: 'var(--primary-neon)' }} />
                        {appt.bookingTime ? new Date(appt.bookingTime).toLocaleDateString('en-GB') : 'N/A'}
                      </span>
                      <span className="doc-appt-slot-val" style={{ marginTop: '2px' }}>
                        <Clock size={12} style={{ color: 'var(--primary-neon)' }} />
                        {appt.bookingTime ? new Date(appt.bookingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                      </span>
                    </div>

                    {/* Payment details */}
                    <div className="doc-payment-status">
                      <span className="doc-appt-slot-label">PAYMENT STATUS</span>
                      <strong className="doc-payment-val">
                        PAID (₹{appt.amountPaid || appt.amount})
                      </strong>
                    </div>

                    {/* Consultation Validity */}
                    <div className="doc-validity-status">
                      <span className="doc-appt-slot-label">VALIDITY</span>
                      {isExpired ? (
                        <span style={{ fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--text-muted)', color: 'var(--text-muted)', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>
                          Expired
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--secondary-neon)', color: 'var(--secondary-neon)', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>
                          {appt.remainingValidity || 'Active'}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="doc-actions-col">
                      {activeTab === 'active-chats' || (appt.paymentStatus === 'paid' && !isExpired) ? (
                        <button
                          onClick={() => onStartConsultation(appt._id)}
                          className="doc-consult-btn"
                        >
                          <MessageSquare size={14} />
                          Consult Room
                        </button>
                      ) : isExpired ? (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={14} style={{ color: 'var(--text-muted)' }} />
                          Completed
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          Upcoming Appointment
                        </span>
                      )}
                    </div>

                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-anim {
          animation: spin 1s linear infinite;
        }
      `}} />
    </motion.div>
  );
};

export default DoctorDashboard;
