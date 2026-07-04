import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, AlertTriangle, FileText, Phone, Mail, User, Briefcase, IndianRupee, Clock } from 'lucide-react';
import { showFlash } from '../components/FlashMessage';
import { apiUrl, fetchWithAuth } from '../utils/api';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [showRejectInput, setShowRejectInput] = useState({});
  const [suspendingDoctor, setSuspendingDoctor] = useState(null);
  const [suspensionReasonText, setSuspensionReasonText] = useState('');
  const [submittingSuspension, setSubmittingSuspension] = useState(false);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(apiUrl('/api/admin/doctors'));
      const data = await res.json();
      if (res.ok) {
        setDoctors(data);
      } else {
        setError(data.message || 'Failed to fetch doctor profiles.');
      }
    } catch (err) {

      setError('Network error loading doctor applications.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (doctorId) => {
    try {
      const res = await fetchWithAuth(apiUrl(`/api/admin/doctors/${doctorId}/approve`), {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        showFlash('Doctor approved', 'success');
        fetchDoctors();
      } else {
        showFlash(data.message || 'Failed to approve doctor.', 'error');
      }
    } catch (err) {

      showFlash('Error connecting to approve doctor.', 'error');
    }
  };

  const handleRejectSubmit = async (doctorId) => {
    const reason = rejectionReasons[doctorId];
    if (!reason || !reason.trim()) {
      showFlash('Please enter a rejection reason.', 'warning');
      return;
    }

    try {
      const res = await fetchWithAuth(apiUrl(`/api/admin/doctors/${doctorId}/reject`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rejectionReason: reason })
      });
      const data = await res.json();
      if (res.ok) {
        showFlash('Doctor application rejected. Simulated notification email logged.', 'success');
        setRejectionReasons(prev => ({ ...prev, [doctorId]: '' }));
        setShowRejectInput(prev => ({ ...prev, [doctorId]: false }));
        fetchDoctors();
      } else {
        showFlash(data.message || 'Failed to reject doctor.', 'error');
      }
    } catch (err) {

      showFlash('Error connecting to reject doctor.', 'error');
    }
  };

  const pendingDocs = doctors.filter(d => d.status === 'pending');
  const activeDocs = doctors.filter(d => d.status === 'approved');
  const rejectedDocs = doctors.filter(d => d.status === 'rejected');
  const suspendedDocs = doctors.filter(d => d.status === 'suspended');

  return (
    <div className="admin-container">
      {/* Header HUD */}
      <div className="admin-header glass-panel">
        <div>
          <div className="admin-header-title-row">
            <Shield size={32} className="admin-header-icon" />
            <h1 className="admin-header-title">
              Verification Authority Dashboard
            </h1>
          </div>
          <p className="admin-header-desc">
            Review, verify credentials, examine uploaded IDs, and approve or reject medical doctor applications.
          </p>
        </div>
        <div className="admin-stats-row">
          <div className="admin-stat-card">
            <div className="admin-stat-number" style={{ color: 'var(--primary-neon)' }}>{pendingDocs.length}</div>
            <div className="admin-stat-label">Pending</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-number" style={{ color: 'var(--secondary-neon)' }}>{activeDocs.length}</div>
            <div className="admin-stat-label">Approved</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="admin-error-banner">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="admin-loading-container">
          <div className="admin-spinner spinner"></div>
          <p className="admin-loading-text">Loading doctor applications matrix...</p>
        </div>
      ) : (
        <div className="admin-sections-stack">

          {/* 1. Pending Verification Section */}
          <section>
            <h2 className="admin-section-heading" style={{ color: 'var(--primary-neon)' }}>
              Pending Applications ({pendingDocs.length})
            </h2>
            {pendingDocs.length === 0 ? (
              <div className="admin-empty-state glass-panel">
                No pending doctor applications awaiting verification.
              </div>
            ) : (
              <div className="admin-pending-grid">
                {pendingDocs.map(doc => (
                  <DoctorCard
                    key={doc._id}
                    doc={doc}
                    onApprove={handleApprove}
                    onRejectSubmit={handleRejectSubmit}
                    rejectionReason={rejectionReasons[doc._id] || ''}
                    setRejectionReason={(val) => setRejectionReasons(prev => ({ ...prev, [doc._id]: val }))}
                    showRejectInput={showRejectInput[doc._id]}
                    setShowRejectInput={(val) => setShowRejectInput(prev => ({ ...prev, [doc._id]: val }))}
                  />
                ))}
              </div>
            )}
          </section>

          {/* 2. Active Approved Doctors Section */}
          <section>
            <h2 className="admin-section-heading" style={{ color: 'var(--secondary-neon)' }}>
              Approved Doctors ({activeDocs.length})
            </h2>
            {activeDocs.length === 0 ? (
              <div className="admin-empty-state glass-panel">
                No approved doctor accounts found.
              </div>
            ) : (
              <div className="admin-approved-grid">
                {activeDocs.map(doc => (
                  <DoctorCardMini
                    key={doc._id}
                    doc={doc}
                    onSuspend={() => setSuspendingDoctor(doc)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* 3. Rejected & Suspended Accounts */}
          {(rejectedDocs.length > 0 || suspendedDocs.length > 0) && (
            <div className="admin-archived-row">
              <section>
                <h2 className="admin-section-heading-archive" style={{ color: 'var(--accent-alert)' }}>
                  Rejected ({rejectedDocs.length})
                </h2>
                <div className="admin-flex-col">
                  {rejectedDocs.map(doc => (
                    <DoctorCardArchive key={doc._id} doc={doc} type="rejected" onApprove={handleApprove} />
                  ))}
                </div>
              </section>
              <section>
                <h2 className="admin-section-heading-archive" style={{ color: '#eab308' }}>
                  Suspended ({suspendedDocs.length})
                </h2>
                <div className="admin-flex-col">
                  {suspendedDocs.map(doc => (
                    <DoctorCardArchive key={doc._id} doc={doc} type="suspended" onApprove={handleApprove} />
                  ))}
                </div>
              </section>
            </div>
          )}

        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />

      {suspendingDoctor && (
        <div className="admin-suspension-modal-overlay">
          <div className="admin-suspension-modal-card glass-panel">
            <h3 className="admin-suspension-modal-title">
              Confirm Account Suspension
            </h3>
            <p className="admin-suspension-modal-subtitle">
              Dr. {suspendingDoctor.name} ({suspendingDoctor.specialization || suspendingDoctor.specialty})
            </p>

            <div className="admin-suspension-textarea-group">
              <label className="admin-suspension-label">
                Reason for Suspension *
              </label>
              <textarea
                value={suspensionReasonText}
                onChange={(e) => setSuspensionReasonText(e.target.value)}
                rows={5}
                placeholder="Please enter the exact reason. This explanation will be included in the notification email sent to the doctor..."
                className="admin-suspension-textarea"
              />
            </div>

            <div className="admin-suspension-modal-footer">
              <button
                disabled={submittingSuspension}
                onClick={() => {
                  setSuspendingDoctor(null);
                  setSuspensionReasonText('');
                }}
                className="admin-suspension-btn-cancel"
              >
                Cancel
              </button>
              <button
                disabled={submittingSuspension}
                onClick={async () => {
                  if (!suspensionReasonText.trim()) {
                    showFlash('Please enter a reason for suspension.', 'warning');
                    return;
                  }
                  if (!window.confirm('Are you sure you want to suspend this doctor account? They will lose access immediately.')) {
                    return;
                  }

                  setSubmittingSuspension(true);
                  try {
                    const res = await fetchWithAuth(apiUrl(`/api/admin/doctors/${suspendingDoctor._id}/suspend`), {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ suspensionReason: suspensionReasonText.trim() })
                    });
                    const data = await res.json();
                    if (res.ok) {
                      showFlash('Doctor account suspended successfully and notification email sent.', 'success');
                      setSuspendingDoctor(null);
                      setSuspensionReasonText('');
                      fetchDoctors();
                    } else {
                      showFlash(data.message || 'Failed to suspend doctor.', 'error');
                    }
                  } catch (err) {

                    showFlash('Error connecting to server.', 'error');
                  } finally {
                    setSubmittingSuspension(false);
                  }
                }}
                className="admin-suspension-btn-confirm"
                style={{
                  background: '#eab308'
                }}
              >
                {submittingSuspension ? 'Suspending...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DoctorCard = ({ doc, onApprove, onRejectSubmit, rejectionReason, setRejectionReason, showRejectInput, setShowRejectInput }) => {
  return (
    <div className="admin-pending-card glass-panel">
      <div className="admin-pending-header">
        <div className="admin-pending-profile-row">
          <img
            src={ `https://api.dicebear.com/7.x/adventurer/svg?seed=${doc.name}`}
            alt="Doctor"
            className="admin-pending-avatar"
          />
          <div>
            <h3 className="admin-pending-name">Dr. {doc.name}</h3>
            <div className="admin-pending-specialty-row">
              <span className="admin-pending-specialty">{doc.specialization}</span>
              {doc.address && (
                <span className="admin-pending-address">{doc.address}</span>
              )}
            </div>
          </div>
        </div>
        <div className="admin-pending-badges">
          <span className="admin-verified-badge">
            Email Verified: {doc.emailVerified ? 'YES' : 'NO'}
          </span>
          <span className="admin-verified-badge">
            Phone Verified: {doc.phoneVerified ? 'YES' : 'NO'}
          </span>
        </div>
      </div>

      <hr className="admin-divider" />

      {/* Credentials Matrix */}
      <div className="admin-pending-details-grid">
        <div className="admin-info-item">
          <Briefcase size={16} className="admin-pending-detail-icon" />
          <span><strong>Experience:</strong> {doc.experienceYears} Years</span>
        </div>
        <div className="admin-info-item">
          <IndianRupee size={16} className="admin-pending-detail-icon" />
          <span><strong>Fee:</strong> ₹{doc.consultationFee} INR</span>
        </div>
        <div className="admin-info-item">
          <Mail size={16} className="admin-pending-detail-icon" />
          <span><strong>Email:</strong> {doc.email}</span>
        </div>
        <div className="admin-info-item">
          <Phone size={16} className="admin-pending-detail-icon" />
          <span><strong>Phone:</strong> {doc.phone || 'N/A'}</span>
        </div>
        <div className="admin-info-item">
          <Clock size={16} className="admin-pending-detail-icon" />
          <span><strong>Hours:</strong> {doc.activeHours}</span>
        </div>
        <div className="admin-info-item">
          <FileText size={16} className="admin-pending-gov-icon" />
          <span>
            <strong>Govt ID Proof:</strong>{' '}
            {doc.governmentIdUrl ? (
              <a href={doc.governmentIdUrl} target="_blank" rel="noreferrer" className="admin-pending-doc-link">
                View Uploaded Document
              </a>
            ) : (
              <span className="admin-pending-doc-missing">Missing Upload</span>
            )}
          </span>
        </div>
      </div>

      <hr className="admin-divider" />

      {/* Actions */}
      <div className="admin-pending-actions-col">
        <div className="admin-pending-actions-row">
          <button
            onClick={() => onApprove(doc._id)}
            className="admin-action-button admin-pending-btn-approve"
          >
            <CheckCircle size={16} /> Approve Doctor
          </button>

          <button
            onClick={() => setShowRejectInput(!showRejectInput)}
            className="admin-action-button admin-pending-btn-reject-toggle"
          >
            <XCircle size={16} /> Reject Application
          </button>
        </div>

        {showRejectInput && (
          <div className="admin-pending-reject-input-group">
            <label className="admin-pending-reject-label">Provide Rejection Reason (Email simulation will notify them) *</label>
            <div className="admin-pending-reject-row">
              <input
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Uploaded government ID proof is blurry / invalid"
                className="admin-input"
              />
              <button
                onClick={() => onRejectSubmit(doc._id)}
                className="admin-pending-btn-reject-submit"
              >
                Submit Rejection
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DoctorCardMini = ({ doc, onSuspend }) => {
  return (
    <div className="admin-mini-card glass-panel">
      <div className="admin-mini-profile-row">
        <img
          src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${doc.name}`}
          alt="Doc Mini"
          className="admin-mini-avatar"
        />
        <div>
          <h4 className="admin-mini-name">Dr. {doc.name}</h4>
          <span className="admin-mini-subtitle">{doc.specialization} • experience: {doc.experienceYears} yrs</span>
        </div>
      </div>
      <button
        onClick={onSuspend}
        className="admin-mini-btn-suspend"
      >
        Suspend
      </button>
    </div>
  );
};

const DoctorCardArchive = ({ doc, type, onApprove }) => {
  return (
    <div className="admin-archive-card glass-panel">
      <div className="admin-archive-header">
        <span className="admin-archive-name">Dr. {doc.name}</span>
        <button
          onClick={() => onApprove(doc._id)}
          className="admin-archive-btn-reapprove"
        >
          Re-Approve
        </button>
      </div>
      <span className="admin-archive-subtitle">Specialty: {doc.specialization}</span>
      {doc.rejectionReason && (
        <span
          className="admin-archive-reason"
          style={{
            color: type === 'rejected' ? 'var(--accent-alert)' : '#eab308',
            background: type === 'rejected' ? 'rgba(244,63,94,0.05)' : 'rgba(234,179,8,0.05)'
          }}
        >
          <strong>Reason:</strong> "{doc.rejectionReason}"
        </span>
      )}
    </div>
  );
};

export default AdminDashboard;
