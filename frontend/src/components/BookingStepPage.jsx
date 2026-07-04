import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CreditCard, Shield, AlertTriangle, Ban } from 'lucide-react';
import { showFlash } from './FlashMessage';
import { apiUrl, fetchWithAuth } from '../utils/api';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const BookingStepPage = ({ provider, user, onCancel, onOpenAuth }) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    return getLocalDateString();
  });
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('Male');

  const [reservedAppt, setReservedAppt] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [step, setStep] = useState(1);

  const providerId = provider.labId || provider.doctorId || provider._id;
  const isDoctor = !provider.price;

  const isSlotPassed = (slotStr) => {
    const todayStr = getLocalDateString();
    if (selectedDate !== todayStr) {
      return false;
    }

    const match = slotStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (!match) return false;

    let [_, hoursStr, minutesStr, ampm] = match;
    let hours = parseInt(hoursStr, 10);
    const minutes = minutesStr ? parseInt(minutesStr, 10) : 0;

    if (ampm.toUpperCase() === 'PM' && hours !== 12) {
      hours += 12;
    } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
      hours = 0;
    }

    const todayLocal = new Date();
    const slotTimeToday = new Date(todayLocal);
    slotTimeToday.setHours(hours, minutes, 0, 0);

    return todayLocal > slotTimeToday;
  };

  const fetchSlots = async () => {
    if (!isDoctor) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(apiUrl(`/api/appointments/slots/${providerId}?date=${selectedDate}`));
      const data = await res.json();
      if (res.ok) {
        setSlots(data);
      } else {
        setError(data.message || 'Failed to fetch available slots.');
      }
    } catch (err) {
      setError('Connection error retrieving slots.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
    setSelectedSlot(null);
    setReservedAppt(null);
    setTimeLeft(0);
    setStep(1);
  }, [selectedDate, providerId]);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (reservedAppt) {
        setReservedAppt(null);
        setSelectedSlot(null);
        setError('Your 10-minute reservation has expired. Please select a slot again.');
        fetchSlots();
      }
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, reservedAppt]);

  const handleContinue = () => {
    setError('');
    if (!patientName.trim()) {
      setError('Please enter patient name.');
      showFlash('Please fill out patient details first', 'warning');
      return;
    }
    if (!patientAge.trim()) {
      setError('Please enter patient age.');
      showFlash('Please fill out patient details first', 'warning');
      return;
    }
    const ageNum = Number(patientAge);
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      setError('Please enter a valid numeric age (1 - 120).');
      showFlash('Please enter a valid numeric age', 'warning');
      return;
    }
    if (!patientGender) {
      setError('Please select patient gender.');
      showFlash('Please fill out patient details first', 'warning');
      return;
    }
    setStep(2);
  };

  const handleReserve = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!selectedSlot) {
      setError('Please select a time slot.');
      showFlash('Please fill all required fields', 'warning');
      return;
    }
    if (!patientName.trim()) {
      setError('Please enter patient name.');
      showFlash('Please fill all required fields', 'warning');
      return;
    }
    if (!patientAge.trim()) {
      setError('Please enter patient age.');
      showFlash('Please fill all required fields', 'warning');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(apiUrl('/api/appointments/reserve'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          doctorId: providerId,
          date: selectedDate,
          slotTime: selectedSlot,
          patientName: patientName.trim(),
          patientAge: patientAge.trim(),
          patientGender
        })
      });
      const data = await res.json();
      if (res.ok) {
        setReservedAppt(data.appointment);
        setTimeLeft(600);
      } else {
        setError(data.message || 'Failed to reserve slot.');
      }
    } catch (err) {
      setError('Error creating slot reservation.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!reservedAppt) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(apiUrl('/api/appointments/cancel-reservation'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appointmentId: reservedAppt._id
        })
      });
      const data = await res.json();
      if (res.ok) {
        setReservedAppt(null);
        setSelectedSlot(null);
        setTimeLeft(0);
        showFlash('Reservation cancelled successfully', 'info');
        fetchSlots();
      } else {
        setError(data.message || 'Failed to cancel reservation.');
      }
    } catch (err) {
      setError('Error cancelling slot reservation.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!reservedAppt) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(apiUrl('/api/payments/create-checkout-session'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appointmentId: reservedAppt._id
        })
      });
      const data = await res.json();
      if (res.ok && data.orderId) {
        const options = {
          key: data.key,
          amount: data.amount,
          currency: data.currency,
          name: "Telehealth Consultation",
          description: `Appointment with ${provider.name}`,
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
                  appointmentId: reservedAppt._id
                })
              });
              const verifyData = await verifyRes.json();
              if (verifyRes.ok) {
                sessionStorage.setItem('pending-flash', JSON.stringify({ message: 'Appointment booked successfully!', type: 'success' }));
                window.location.reload();
              } else {
                setError(verifyData.message || 'Payment verification failed.');
                showFlash('Payment failed', 'error');
              }
            } catch (err) {
              setError('Verification error. Please contact support.');
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
        setError(data.message || 'Failed to initialize payment.');
        setLoading(false);
      }
    } catch (err) {
      setError('Razorpay connection failed.');
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <div style={{ maxWidth: '650px', margin: '60px auto', padding: '0 24px' }}>
        <div className="glass-panel" style={{
          padding: '40px 24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          border: '1px solid var(--card-border)',
          borderRadius: '16px'
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-alert)',
            marginBottom: '8px'
          }}>
            <Ban size={30} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'Outfit' }}>
              Access Denied
            </h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.6' }}>
              Please log in to book appointments. This page can only be accessed when you are logged in.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center', marginTop: '12px' }}>
            <button
              onClick={onCancel}
              style={{
                flex: '1',
                maxWidth: '160px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--card-border)',
                color: '#fff',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Go Back
            </button>
            <button
              onClick={onOpenAuth}
              style={{
                flex: '1',
                maxWidth: '160px',
                background: 'var(--primary-neon)',
                border: 'none',
                color: '#000',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)',
                transition: 'all 0.2s'
              }}
            >
              Login / Signup
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '650px', margin: '40px auto', padding: '0 24px' }}>
      <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        <div>
          <h3 style={{ fontSize: '1.4rem', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={22} style={{ color: 'var(--primary-neon)' }} />
            Book Consultation Slot
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Consultation with <strong>{provider.name.startsWith('Dr.') || provider.name.startsWith('Dr ') ? provider.name : `Dr. ${provider.name}`}</strong> • fee: <strong style={{ color: 'var(--secondary-neon)' }}>₹{provider.fee || provider.price}</strong>
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid var(--accent-alert)', borderRadius: '8px', padding: '12px', color: 'var(--accent-alert)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Date Selector & Manual Patient Info */}
        {!reservedAppt && step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                APPOINTMENT DATE
              </label>
              <input
                type="date"
                value={selectedDate}
                min={getLocalDateString()}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                PATIENT NAME
              </label>
              <input
                type="text"
                placeholder="Enter patient full name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                  PATIENT AGE
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  placeholder="e.g., 28"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value.replace(/\D/g, ''))}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                  PATIENT GENDER
                </label>
                <select
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="Male" style={{ background: '#0b0f19' }}>Male</option>
                  <option value="Female" style={{ background: '#0b0f19' }}>Female</option>
                  <option value="Other" style={{ background: '#0b0f19' }}>Other</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 Booking Summary Header */}
        {step === 2 && !reservedAppt && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--card-border)',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '0.88rem',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div><strong>Patient Name:</strong> <span style={{ color: '#fff' }}>{patientName}</span></div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div><strong>Age:</strong> <span style={{ color: '#fff' }}>{patientAge}</span></div>
              <div><strong>Gender:</strong> <span style={{ color: '#fff' }}>{patientGender}</span></div>
            </div>
            <div><strong>Appointment Date:</strong> <span style={{ color: 'var(--primary-neon)' }}>{selectedDate}</span></div>
          </div>
        )}

        {/* Slot Grid for Doctors */}
        {isDoctor ? (
          !reservedAppt && step === 2 ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 600 }}>
                AVAILABLE TIMESLOTS (TODAY)
              </label>

              {loading ? (
                <div style={{ color: 'var(--primary-neon)', fontSize: '0.85rem' }}>Loading slots...</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {slots.map(s => {
                    const isSelected = selectedSlot === s.slot;
                    const passed = isSlotPassed(s.slot);
                    const available = s.isAvailable && !passed;

                    return (
                      <button
                        key={s.slot}
                        disabled={!available}
                        onClick={() => setSelectedSlot(s.slot)}
                        style={{
                          background: !available
                            ? 'rgba(255, 255, 255, 0.02)'
                            : isSelected
                              ? 'var(--primary-neon)'
                              : 'rgba(6, 182, 212, 0.08)',
                          border: isSelected
                            ? '1px solid var(--primary-neon)'
                            : '1px solid var(--card-border)',
                          borderRadius: '8px',
                          color: !available
                            ? 'var(--text-muted)'
                            : isSelected
                              ? '#000'
                              : '#fff',
                          padding: '12px 8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: available ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          opacity: available ? 1 : 0.4,
                          transition: 'all 0.2s'
                        }}
                      >
                        {available ? (
                          <Clock size={14} />
                        ) : (
                          <Ban size={14} style={{ color: 'var(--accent-alert)' }} />
                        )}
                        <span>{s.slot}</span>
                        {!available && (
                          <span style={{ fontSize: '0.62rem', color: 'var(--accent-alert)', fontWeight: 600 }}>
                            {passed ? 'Passed' : (s.reason === 'reserved' ? 'Holding' : 'Booked')}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : reservedAppt ? (
            // Reserved state count down timer
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid var(--secondary-neon)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '50%' }}>
                <Clock size={32} style={{ color: 'var(--secondary-neon)' }} />
              </div>
              <div>
                <h4 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700 }}>Timeslot Temporarily Reserved!</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  The slot <strong>{selectedSlot}</strong> is locked for you. Complete your checkout within:
                </p>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-alert)', fontFamily: 'Outfit', marginTop: '10px' }}>
                  {formatTime(timeLeft)}
                </div>
              </div>
            </div>
          ) : null
        ) : (
          step === 2 && !reservedAppt && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Diagnostic tests do not require daily slot selections. You can proceed directly to checkout.
            </div>
          )
        )}

        {/* Buttons / Actions */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
          {step === 1 ? (
            <>
              <button
                disabled={loading}
                onClick={onCancel}
                style={{
                  flex: 1,
                  background: 'none',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                disabled={loading}
                onClick={handleContinue}
                style={{
                  flex: 1,
                  background: 'var(--primary-neon)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#000',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(6, 182, 212, 0.25)'
                }}
              >
                Continue
              </button>
            </>
          ) : (
            <>
              {!reservedAppt && (
                <button
                  disabled={loading}
                  onClick={() => { setStep(1); setError(''); }}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                    padding: '12px',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                >
                  Back
                </button>
              )}
              {reservedAppt ? (
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                  <button
                    disabled={loading}
                    onClick={handleCancelReservation}
                    style={{
                      flex: 1,
                      background: 'none',
                      border: '1px solid var(--accent-alert)',
                      borderRadius: '8px',
                      padding: '12px',
                      color: 'var(--accent-alert)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      transition: 'all 0.2s'
                    }}
                  >
                    Cancel Reservation
                  </button>
                  <button
                    disabled={loading}
                    onClick={handlePayment}
                    style={{
                      flex: 1,
                      background: 'var(--secondary-neon)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                    }}
                  >
                    <CreditCard size={16} />
                    Pay with Razorpay
                  </button>
                </div>
              ) : (
                <button
                  disabled={loading || (isDoctor && !selectedSlot)}
                  onClick={handleReserve}
                  style={{
                    flex: 1,
                    background: 'var(--primary-neon)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#000',
                    cursor: (!isDoctor || selectedSlot) ? 'pointer' : 'not-allowed',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: (!isDoctor || selectedSlot) ? 1 : 0.5,
                    boxShadow: '0 4px 12px rgba(6, 182, 212, 0.25)'
                  }}
                >
                  <Shield size={16} />
                  Reserve & Book
                </button>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default BookingStepPage;
