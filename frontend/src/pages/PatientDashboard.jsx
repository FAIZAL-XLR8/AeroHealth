import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CreditCard, MessageSquare, Video, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { showFlash } from '../components/FlashMessage';
import '../styles/PatientDashboard.css';
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

const PatientDashboard = ({ onOpenAuth, onStartConsultation }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(apiUrl('/api/appointments/patient/dashboard'));
      const data = await res.json();
      if (res.ok) {
        setAppointments(data);
      } else {
        setError(data.message || 'Failed to fetch dashboard appointments.');
      }
    } catch (err) {
      setError('Connection error retrieving appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handlePayNow = async (apptId) => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(apiUrl('/api/payments/create-checkout-session'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ appointmentId: apptId })
      });
      const data = await res.json();
      if (res.ok && data.orderId) {
        const options = {
          key: data.key,
          amount: data.amount,
          currency: data.currency,
          name: "Telehealth Consultation",
          description: "Consultation Payment",
          order_id: data.orderId,
          handler: async function (response) {
            setLoading(true);
            try {
              const verifyRes = await fetchWithAuth(apiUrl('/api/payments/verify-checkout-session'), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  appointmentId: apptId
                })
              });
              const verifyData = await verifyRes.json();
              if (verifyRes.ok) {
                showFlash('Appointment booked successfully!', 'success');
                fetchAppointments();
              } else {
                showFlash(verifyData.message || 'Payment verification failed.', 'error');
              }
            } catch (err) {
              showFlash('Verification error. Please contact support.', 'error');
            } finally {
              setLoading(false);
            }
          },
          prefill: {
            name: data.patient?.name || '',
            email: data.patient?.email || '',
            contact: data.patient?.phone || ''
          },
          theme: {
            color: '#10b981'
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        showFlash(data.message || 'Payment initiation failed.', 'error');
        setLoading(false);
      }
    } catch (err) {
      showFlash('Razorpay connection error.', 'error');
      setLoading(false);
    }
  };

  const getStatusBadge = (appt) => {
    const isExpired = appt.remainingValidity === 'Expired' || new Date() >= new Date(appt.chatEnabledUntil);

    if (appt.paymentStatus === 'pending') {
      return (
        <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--accent-star)', color: 'var(--accent-star)', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>
          Pending Payment
        </span>
      );
    }
    if (isExpired) {
      return (
        <span style={{ fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--text-muted)', color: 'var(--text-muted)', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>
          Expired
        </span>
      );
    }
    return (
      <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--secondary-neon)', color: 'var(--secondary-neon)', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>
        {appt.remainingValidity || 'Active'}
      </span>
    );
  };

  const activeAppointments = appointments.filter(appt => {
    const isExpired = appt.remainingValidity === 'Expired' || (appt.chatEnabledUntil && new Date() >= new Date(appt.chatEnabledUntil));
    return !isExpired;
  });

  return (
    <div className="pat-container">

      <div className="pat-header-row">
        <div>
          <motion.h2
            initial="hidden"
            animate="visible"
            variants={headingVariants}
            className="pat-title"
          >
            Patient Dashboard
          </motion.h2>
          <motion.p
            initial="hidden"
            animate="visible"
            variants={descriptionVariants}
            className="pat-subtitle"
          >
            Manage your booked consultations, payments, and active telehealth rooms.
          </motion.p>
        </div>

        <button
          onClick={fetchAppointments}
          disabled={loading}
          className="pat-refresh-btn"
        >
          <RefreshCw size={14} className={loading ? 'spin-anim' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="pat-error-panel">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading && appointments.length === 0 ? (
        <div style={{ color: 'var(--primary-neon)', fontSize: '0.9rem' }}>Loading appointments...</div>
      ) : appointments.length === 0 ? (
        <div className="glass-panel pat-empty-state">
          <Calendar size={48} style={{ color: 'var(--card-border)', marginBottom: '12px' }} />
          <p className="pat-empty-title">No appointments or reservations found.</p>
          <p className="pat-empty-desc">Search for doctors on the homepage to book a consultation slot.</p>
        </div>
      ) : (
        <div className="pat-main-stack">

          <div className="pat-section-header">
            <h3 className="pat-section-title">
              Ongoing Appointments
            </h3>
          </div>

          {activeAppointments.length === 0 ? (
            <div className="glass-panel pat-active-empty">
              No active appointments.
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="pat-active-list"
            >
              {[...activeAppointments].sort((a, b) => new Date(b.appointmentDate || b.date) - new Date(a.appointmentDate || a.date)).map(appt => {
                const doc = appt.doctorId || {};
                const isPaid = appt.paymentStatus === 'paid';
                const isExpired = appt.remainingValidity === 'Expired' || (appt.chatEnabledUntil && new Date() >= new Date(appt.chatEnabledUntil));

                return (
                  <motion.div
                    key={appt._id}
                    variants={cardVariants}
                    whileHover="hover"
                    className="glass-panel pat-card"
                  >
                    {/* Doctor Profile Info */}
                    <div className="pat-doctor-info">
                      <img
                        src={ 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=200&auto=format&fit=crop'}
                        alt={doc.name}
                        className="pat-doctor-avatar"
                      />
                      <div>
                        <h4 className="pat-doctor-name">
                          {doc.name ? (doc.name.startsWith('Dr.') || doc.name.startsWith('Dr ') ? doc.name : `Dr. ${doc.name}`) : 'Seeded Doctor'}
                        </h4>
                        <p className="pat-doctor-specialty">
                          {doc.specialization || doc.specialty || 'General Practitioner'}
                        </p>
                        <div className="pat-appointment-time">
                          <span className="pat-time-badge">
                            <Calendar size={12} />
                            {new Date(appt.appointmentDate || appt.date).toLocaleDateString('en-GB')}
                          </span>
                          <span className="pat-time-badge">
                            <Clock size={12} />
                            {appt.slotTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Column */}
                    <div className="pat-status-col">
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>STATUS</span>
                      {getStatusBadge(appt)}
                    </div>

                    {/* Pricing / Payments */}
                    <div className="pat-charges-col">
                      <span className="pat-charges-title">CONSULTATION FEE</span>
                      <strong className="pat-charges-val">₹{appt.amountPaid || appt.amount}</strong>
                    </div>

                    {/* Actions */}
                    <div className="pat-actions-col">
                      {!isPaid ? (
                        <button
                          onClick={() => handlePayNow(appt._id)}
                          disabled={loading}
                          className="pat-pay-btn"
                        >
                          <CreditCard size={14} />
                          Pay Now
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => onStartConsultation(appt._id)}
                            disabled={isExpired}
                            className="pat-chat-btn"
                            style={{
                              background: isExpired ? 'rgba(255,255,255,0.05)' : 'var(--secondary-neon)',
                              color: isExpired ? 'var(--text-muted)' : '#fff',
                              cursor: isExpired ? 'not-allowed' : 'pointer',
                              boxShadow: isExpired ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.2)'
                            }}
                          >
                            <MessageSquare size={14} />
                            Chat & Consultation
                          </button>
                        </>
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
    </div>
  );
};

export default PatientDashboard;
