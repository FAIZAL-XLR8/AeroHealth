import React, { useState } from 'react';
import { Upload, AlertOctagon, Heart, BrainCircuit, Activity, Calendar, ArrowRight, Loader } from 'lucide-react';
import reportBg from '../assets/report.jpg';
import { motion } from 'framer-motion';
import { showFlash } from '../components/FlashMessage';
import '../styles/ReportAnalyzer.css';
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

const ReportAnalyzer = ({ onSearchDoctor, user, onOpenAuth }) => {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setIsLoading(true);
    setAnalysis(null);

    const formData = new FormData();
    formData.append('report', file);
    formData.append('userId', 'mock-user-123');

    try {
      const response = await fetchWithAuth(apiUrl('/api/reports/analyze'), {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        setAnalysis(data.analysis);
        showFlash('Report analyzed successfully.', 'success');
      } else {
        showFlash(data.message || 'Error parsing report file.', 'error');
      }
    } catch (err) {

      showFlash('Internal Server Error connecting to report analyzer.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950">
      {/* Background */}
      <img
        src={reportBg}
        alt="Medical report background"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/50  z-0"></div>

      {/* Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/60 to-slate-950 z-0"></div>

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="report-container"
      >

      {/* Header Banner */}
      <motion.section
        variants={containerVariants}
        className="report-header"
      >
        <motion.h2 variants={headingVariants} className="report-title">
          Multimodal AI Laboratory Report Locker
        </motion.h2>
        <motion.p variants={descriptionVariants} className="report-subtitle">
          Drop any diagnostic PDF or image (CBC, Lipid Panel, Thyroid) and let Gemini read, analyze, and map your metrics instantly.
        </motion.p>
      </motion.section>


      <div className="report-console-grid">

        {/* Lockscreen Panel for Unauthenticated Users */}
        {!user && (
          <motion.div
            variants={cardVariants}
            whileHover="hover"
            className="glass-panel report-auth-card"
          >
            <div className="report-auth-icon-wrapper">
              <Upload style={{ color: 'var(--accent-alert)' }} size={28} />
            </div>
            <div>
              <h3 className="report-auth-title">Authentication Required</h3>
              <p className="report-auth-desc">
                Please login or sign up to access your personal AI medical report locker.
              </p>
            </div>
            <button onClick={onOpenAuth} className="report-auth-btn">
              Login / Sign Up
            </button>
          </motion.div>
        )}

        {/* Upload Container Panel */}
        {user && !analysis && (
          <motion.form
            variants={cardVariants}
            whileHover="hover"
            onSubmit={handleUploadSubmit}
            className="glass-panel report-upload-form"
            style={{
              borderColor: file ? 'var(--primary-neon)' : 'var(--card-border)'
            }}
          >
            <div className="report-upload-icon-wrapper">
              <Upload style={{ color: 'var(--primary-neon)' }} size={28} />
            </div>

            <div className="report-upload-text-wrapper">
              <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'inline-block' }}>
                <span className="report-upload-label-main">Click to upload report</span>
                <span className="report-upload-label-sub">
                  Supports PDFs, PNGs, and JPEGs up to 5MB
                </span>
                <input
                  id="file-upload"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg"
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {file && (
              <div className="report-selected-doc-badge">
                Selected Document: <strong>{file.name}</strong>
              </div>
            )}

            <button
              type="submit"
              disabled={!file || isLoading}
              className="report-submit-btn"
              style={{
                background: file && !isLoading ? 'var(--primary-neon)' : 'var(--card-border)',
                color: file && !isLoading ? 'var(--bg-dark)' : 'var(--text-muted)',
                cursor: file && !isLoading ? 'pointer' : 'default'
              }}
            >
              {isLoading ? (
                <>
                  <Loader size={16} style={{ animation: 'spin 2s linear infinite' }} />
                  Analyzing Document...
                </>
              ) : (
                'Submit'
              )}
            </button>
          </motion.form>
        )}

        {/* 📊 High-End AI Analysis Dashboard Renders */}
        {analysis && (
          <motion.div
            variants={cardVariants}
            whileHover="hover"
            className="glass-panel report-analysis-card"
          >

            {/* Header patient profile info */}
            <div className="report-analysis-header">
              <div>
                <span className="report-analysis-label">PATIENT SUMMARY</span>
                <h3 className="report-analysis-patient-title">Patient: {analysis.patientName }</h3>
              </div>

              <button onClick={() => setAnalysis(null)} className="report-analysis-clear-btn">
                Clear Analysis
              </button>
            </div>

            {/* Simple patient-friendly brief summary */}
            <div>
              <p className="report-analysis-summary-quote">
                "{analysis.fullSummary}"
              </p>
            </div>

            {/* Dual Grid: Identified Tests & High Risk Critical Flags */}
            <div className="report-analysis-dual-grid">

              {/* Identified tests */}
              <div className="glass-panel report-analysis-panel-card">
                <h4 className="report-analysis-panel-title" style={{ color: 'var(--primary-neon)' }}>
                  <Activity size={14} />
                  Identified Tests
                </h4>
                <div className="report-analysis-panel-items">
                  {analysis.testsIdentified.map((test, index) => (
                    <span key={index} style={{ fontSize: '0.78rem', color: 'var(--text-primary)', display: 'block' }}>
                      • {test}
                    </span>
                  ))}
                </div>
              </div>

              {/* Critical out of bounds lights */}
              <div className="glass-panel report-analysis-panel-card" style={{ borderColor: 'rgba(244, 63, 94, 0.15)' }}>
                <h4 className="report-analysis-panel-title" style={{ color: 'var(--accent-alert)' }}>
                  <AlertOctagon size={14} />
                  Out-of-Range Metrics
                </h4>
                <div className="report-analysis-panel-items">
                  {analysis.criticalAlerts.length === 0 ? (
                    <span style={{ fontSize: '0.78rem', color: 'var(--secondary-neon)' }}>All metrics within normal thresholds.</span>
                  ) : (
                    analysis.criticalAlerts.map((alert, index) => (
                      <span key={index} style={{ fontSize: '0.78rem', color: '#fda4af', display: 'block' }}>
                        {alert}
                      </span>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Dynamic AI Triage Recommendation Panel */}
            <div className="report-recommendation-panel">

              <div className="report-recommendation-content">
                <span className="report-recommendation-label">AI RECOMMENDATION</span>
                <h4 className="report-recommendation-title">
                  Consult a {analysis.recommendedSpecialist}
                </h4>
                <p className="report-recommendation-desc">
                  Based on flagged out-of-range metrics, scheduling a physical consultation with a local {analysis.recommendedSpecialist} is highly advised.
                </p>
              </div>

              <button
                onClick={() => onSearchDoctor(analysis.recommendedSpecialist)}
                className="report-find-doc-btn"
              >
                Find Nearby {analysis.recommendedSpecialist}
                <ArrowRight size={14} />
              </button>

            </div>

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

export default ReportAnalyzer;
