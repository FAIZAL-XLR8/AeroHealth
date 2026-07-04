import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Phone, Calendar, Briefcase, FileText, CheckCircle, Clock, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import '../styles/Profile.css';
import { apiUrl, fetchWithAuth } from '../utils/api';

const Profile = ({ user: initialUser, onBack }) => {
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetchWithAuth(apiUrl('/api/auth/me'));
        if (res.ok) {
          const fullData = await res.json();
          setUser(fullData);
        }
      } catch (err) {
        console.error('Failed fetching full profile details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading && !user) {
    return (
      <div className="profile-container" style={{ textAlign: 'center', padding: '100px 24px' }}>
        <h2 style={{ fontFamily: 'Outfit', fontWeight: 700 }}>Loading Profile Details...</h2>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isImageUrl = (url) => {
    if (!url) return false;
    return /\.(jpeg|jpg|gif|png|webp)/i.test(url) || url.includes('cloudinary');
  };

  return (
    <div className="profile-container">

      {/* Back button */}
      <button onClick={onBack} className="profile-back-button">
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      {/* Hero Profile Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-panel profile-header-card"
      >
        <div className="profile-avatar-container">
          {user.profileImage ? (
            <img src={user.profileImage} alt={user.name} className="profile-avatar-image" />
          ) : (
            <User size={40} style={{ color: 'var(--primary-neon)' }} />
          )}
        </div>

        <div className="profile-name-container">
          <h1 className="profile-name">
            {user.role === 'doctor' && !(user.name.startsWith('Dr.') || user.name.startsWith('Dr ')) ? `Dr. ${user.name}` : user.name}
          </h1>
          <div className="profile-badge-row">
            <span
              className="profile-role-badge"
              style={{
                background: user.role === 'doctor' ? 'var(--secondary-neon)' : 'var(--primary-neon)'
              }}
            >
              {user.role}
            </span>
            <span className="profile-member-since">
              Member since {formatDate(user.createdAt)}
            </span>
          </div>
        </div>

        {user.role === 'doctor' && (
          <div
            className="profile-status-badge"
            style={{
              background: user.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              border: `1px solid ${user.status === 'approved' ? 'var(--secondary-neon)' : '#f59e0b'}`,
              color: user.status === 'approved' ? 'var(--secondary-neon)' : '#f59e0b'
            }}
          >
            <CheckCircle size={14} />
            Status: {user.status ? user.status.toUpperCase() : 'PENDING'}
          </div>
        )}
      </motion.div>

      {/* Grid Layout for details */}
      <div
        className="profile-grid"
        style={{
          gridTemplateColumns: user.role === 'doctor' ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr'
        }}
      >

        {/* Left Side Column: Core Credentials */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-panel profile-details-card"
        >
          <h2 className="profile-section-heading">
            <User size={18} style={{ color: 'var(--primary-neon)' }} />
            Account Details
          </h2>

          <div className="profile-fields-list">
            <div>
              <span className="profile-field-label">Full Name</span>
              <span className="profile-field-value">
                {user.role === 'doctor' && !(user.name.startsWith('Dr.') || user.name.startsWith('Dr ')) ? `Dr. ${user.name}` : user.name}
              </span>
            </div>

            <div>
              <span className="profile-field-label">Email Address</span>
              <span className="profile-field-value-flex">
                <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                {user.email}
              </span>
            </div>

            <div>
              <span className="profile-field-label">Phone Number</span>
              <span className="profile-field-value-flex">
                <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                {user.phone || 'Not Provided'}
              </span>
            </div>

            {user.dateOfBirth && (
              <div>
                <span className="profile-field-label">Date of Birth</span>
                <span className="profile-field-value-flex">
                  <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                  {formatDate(user.dateOfBirth)}
                </span>
              </div>
            )}

            {user.gender && (
              <div>
                <span className="profile-field-label">Gender</span>
                <span className="profile-field-value">{user.gender}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Right Side Column: Doctor Professional Credentials */}
        {user.role === 'doctor' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-panel profile-details-card"
          >
            <h2 className="profile-section-heading">
              <Briefcase size={18} style={{ color: 'var(--secondary-neon)' }} />
              Professional Credentials
            </h2>

            <div className="profile-fields-list">
              <div className="profile-credentials-grid">
                <div>
                  <span className="profile-field-label">Specialization</span>
                  <span className="profile-field-value">{user.specialization}</span>
                </div>
                <div>
                  <span className="profile-field-label">Experience</span>
                  <span className="profile-field-value">{user.experienceYears} Years</span>
                </div>
              </div>

              <div className="profile-credentials-grid">
                <div>
                  <span className="profile-field-label">Consultation Fee</span>
                  <span className="profile-fee-text">₹{user.consultationFee}</span>
                </div>
                <div>
                  <span className="profile-field-label">Active Hours</span>
                  <span className="profile-field-value-flex">
                    <Clock size={12} />
                    {user.activeHours}
                  </span>
                </div>
              </div>

              {user.bio && (
                <div>
                  <span className="profile-field-label">Biography</span>
                  <span className="profile-bio-text">
                    "{user.bio}"
                  </span>
                </div>
              )}

              {/* Government ID Section */}
              <div className="profile-gov-id-section">
                <span className="profile-field-label" style={{ marginBottom: '6px' }}>Verification Proof (Government ID)</span>
                {user.governmentIdUrl ? (
                  isImageUrl(user.governmentIdUrl) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div className="profile-gov-id-image-wrapper">
                        <img src={user.governmentIdUrl} alt="Government ID Proof" className="profile-gov-id-image" />
                      </div>
                      <a
                        href={user.governmentIdUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="profile-gov-id-link"
                      >
                        <FileText size={12} />
                        Open full document proof
                      </a>
                    </div>
                  ) : (
                    <a
                      href={user.governmentIdUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="profile-gov-id-file-btn"
                    >
                      <FileText size={16} />
                      View Uploaded ID File
                    </a>
                  )
                ) : (
                  <span style={{ fontSize: '0.82rem', color: 'var(--accent-alert)', fontWeight: 600 }}>
                    No government ID uploaded yet.
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

    </div>
  );
};

export default Profile;
