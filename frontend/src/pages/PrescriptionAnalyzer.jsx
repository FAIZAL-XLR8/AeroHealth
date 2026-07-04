import React, { useState } from 'react';
import { Upload, AlertOctagon, Heart, BrainCircuit, Activity, ArrowRight, Loader, Pill, ShieldAlert, CheckCircle } from 'lucide-react';
import reportBg from '../assets/prescription.jpg';
import { motion } from 'framer-motion';
import { showFlash } from '../components/FlashMessage';
import '../styles/PrescriptionAnalyzer.css';
import { apiUrl, fetchWithAuth } from '../utils/api';

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
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
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: 'easeOut' } },
  hover: { y: -6, transition: { duration: 0.25, ease: 'easeInOut' } },
};

const PrescriptionAnalyzer = ({ user, onOpenAuth }) => {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setIsLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('prescription', file);

    try {
      const response = await fetchWithAuth(apiUrl('/api/prescriptions/analyze'), {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        setResult(data);
        showFlash('Prescription analyzed successfully.', 'success');
      } else {
        showFlash(data.message || 'Error analyzing prescription file.', 'error');
      }
    } catch (err) {
      showFlash('Internal Server Error connecting to prescription analyzer.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950">
      {/* Background */}
      <img
        src={reportBg}
        alt="Medical background"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/0 z-0"></div>

      {/* Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/60 to-slate-950 z-0"></div>

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="rx-container"
      >

        {/* Header Banner */}
        <motion.section
          variants={containerVariants}
          className="rx-header"
        >
          <motion.h2 variants={headingVariants} className="rx-title">
            AI Prescription Analyzer
          </motion.h2>
          <motion.p variants={descriptionVariants} className="rx-subtitle">
            Scan your doctor's handwritten or digital prescriptions. Our system uses AI Vision to decode medicine names, usages, and side effects.
          </motion.p>
        </motion.section>

        <div className="rx-console-grid">

          {/* Lockscreen Panel for Unauthenticated Users */}
          {!user && (
            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="glass-panel rx-auth-card"
            >
              <div className="rx-auth-icon-wrapper">
                <Upload style={{ color: 'var(--accent-alert)' }} size={28} />
              </div>
              <div>
                <h3 className="rx-auth-title">Authentication Required</h3>
                <p className="rx-auth-desc">
                  Please login or sign up to analyze medical prescriptions.
                </p>
              </div>
              <button onClick={onOpenAuth} className="rx-auth-btn">
                Login / Sign Up
              </button>
            </motion.div>
          )}

          {/* Upload Container Panel */}
          {user && !result && (
            <motion.form
              variants={cardVariants}
              whileHover="hover"
              onSubmit={handleUploadSubmit}
              className="glass-panel rx-upload-form"
              style={{
                borderColor: file ? 'var(--primary-neon)' : 'var(--card-border)'
              }}
            >
              <div className="rx-upload-icon-wrapper">
                <Pill style={{ color: 'var(--primary-neon)' }} size={28} />
              </div>

              <div className="rx-upload-text-wrapper">
                <label htmlFor="prescription-upload" style={{ cursor: 'pointer', display: 'inline-block' }}>
                  <span className="rx-upload-label-main">Click to upload prescription</span>
                  <span className="rx-upload-label-sub">
                    Supports PDFs, PNGs, and JPEGs up to 5MB
                  </span>
                  <input
                    id="prescription-upload"
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.png,.jpg,.jpeg"
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {file && (
                <div className="rx-selected-doc-badge">
                  Selected Document: <strong>{file.name}</strong>
                </div>
              )}

              <button
                type="submit"
                disabled={!file || isLoading}
                className="rx-submit-btn"
                style={{
                  background: file && !isLoading ? 'var(--primary-neon)' : 'rgba(255, 255, 255, 0.05)',
                  color: file && !isLoading ? '#000' : 'var(--text-muted)',
                  cursor: file && !isLoading ? 'pointer' : 'default'
                }}
              >
                {isLoading ? (
                  <>
                    <Loader size={16} style={{ animation: 'spin 2s linear infinite' }} />
                    Extracting &amp; Analyzing...
                  </>
                ) : (
                  'Submit'
                )}
              </button>
            </motion.form>
          )}

          {result && (
            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="glass-panel rx-result-card"
            >

              {/* Header / Actions */}
              <div className="rx-result-header">
                <div>
                  <span className="rx-result-label">DIGITIZED PRESCRIPTION DATA</span>
                  <h3 className="rx-result-title">AI Analysis Dashboard</h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => {
                      setResult(null);
                      setFile(null);
                    }}
                    className="rx-result-clear-btn"
                  >
                    Analyze New
                  </button>
                </div>
              </div>

              {/* Medicine Breakdown */}
              <div className="rx-med-list-container">
                <h4 className="rx-med-list-title">
                  <Activity size={16} style={{ color: 'var(--primary-neon)' }} />
                  Prescribed Medications ({result.analysis.medicines.length})
                </h4>

                {result.analysis.medicines.length === 0 ? (
                  <div className="rx-med-empty-state">
                    No medications were identified. Try uploading a clearer picture or document.
                  </div>
                ) : (
                  result.analysis.medicines.map((med, index) => (
                    <motion.div
                      key={index}
                      variants={cardVariants}
                      whileHover="hover"
                      className="glass-panel rx-med-card"
                    >
                      {/* Medicine Header */}
                      <div className="rx-med-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="rx-med-icon-wrapper">
                            <Pill size={16} style={{ color: 'var(--primary-neon)' }} />
                          </div>
                          <div>
                            <h5 className="rx-med-name">{med.name}</h5>
                          </div>
                        </div>
                      </div>

                      {/* Drug Information Grid */}
                      <div className="rx-med-details-grid">

                        {/* Reason & Description */}
                        <div className="rx-med-info-col">
                          <div>
                            <span className="rx-med-info-label">Reason for Prescription</span>
                            <span className="rx-med-info-val">{med.reason}</span>
                          </div>
                          <div>
                            <span className="rx-med-info-label">Clinical Description</span>
                            <p className="rx-med-info-desc">{med.description}</p>
                          </div>
                          <div>
                            <span className="rx-med-info-label">Standard Administration</span>
                            <span className="rx-med-info-val">{med.usage}</span>
                          </div>
                        </div>

                        {/* Safety: Precautions & Side Effects */}
                        <div className="rx-med-safety-panel">
                          <div>
                            <span className="rx-med-safety-label-green">
                              <CheckCircle size={10} /> Precautions
                            </span>
                            <ul className="rx-med-safety-list">
                              {med.precautions.map((p, i) => <li key={i}>{p}</li>)}
                            </ul>
                          </div>
                          <div>
                            <span className="rx-med-safety-label-red">
                              <ShieldAlert size={10} /> Common Side Effects
                            </span>
                            <ul className="rx-med-safety-list">
                              {med.sideEffects.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                        </div>

                      </div>

                    </motion.div>
                  ))
                )}
              </div>

              {/* Overall Advice Box */}
              {result.analysis.overallAdvice && (
                <div className="rx-overall-advice-panel">
                  <span className="rx-overall-advice-label">PHARMACIST'S ADVISORY</span>
                  <p className="rx-overall-advice-desc">
                    {result.analysis.overallAdvice}
                  </p>
                  <div className="rx-overall-advice-disclaimer">
                    Disclaimer: This analysis is for educational purposes only. Always consult your prescribing doctor before changing any medication schedules.
                  </div>
                </div>
              )}

            </motion.div>
          )}

        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}} />
      </motion.div>
    </div>
  );
};

export default PrescriptionAnalyzer;
