import React, { useState, useEffect } from 'react';
import { Search, MapPin, Stethoscope, TestTube, Brain, HeartPulse, ShieldCheck, Clock, FileText, Pill, MessageSquare, ArrowRight } from 'lucide-react';
import hospital from '../assets/hospital_pic.jpg';
import { motion } from 'framer-motion';
import { TypeAnimation } from 'react-type-animation';
import '../styles/Home.css';

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const badgeVariants = {
  hidden: { opacity: 0, y: -15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  },
};

const headingVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  },
};

const descriptionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  },
};

const searchCardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: "easeOut" }
  },
};

const featuresContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const featureCardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  },
  hover: {
    y: -6,
    transition: { duration: 0.25, ease: "easeInOut" }
  }
};

const searchButtonHoverVariants = {
  hover: {
    scale: 1.04,
    transition: { duration: 0.2, ease: "easeOut" }
  }
};

const Home = ({ onSearch, onNavigate, onOpenChat }) => {
  const [activeTab, setActiveTab] = useState('doctors');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const commonSpecialties = [
    'Dentist',
    'Gynaecologist/obstetrician',
    'General Physician',
    'Dermatologist',
    'ENT Specialist',
    'Homoeopath',
    'Ayurveda'
  ];

  const allSpecialties = [
    'Dentist',
    'Gynaecologist/obstetrician',
    'General Physician',
    'Dermatologist',
    'ENT Specialist',
    'Homoeopath',
    'Ayurveda',
    'Cardiologist',
    'Neurologist',
    'Pediatrician',
    'Orthopedist',
    'Oncologist',
    'Psychiatrist',
    'Urologist',
    'Gastroenterologist',
    'Pulmonologist',
    'Endocrinologist',
    'Nephrologist',
    'Ophthalmologist',
    'Physiotherapist',
    'Sexologist',
    'Dietitian'
  ];

  const getFilteredSpecialties = () => {
    if (!searchQuery.trim()) return commonSpecialties;

    const cleanQuery = searchQuery.toLowerCase().trim()
      .replace(/nuer/g, 'neur')
      .replace(/neurolg/g, 'neurolog')
      .replace(/physcian/g, 'physician')
      .replace(/physican/g, 'physician')
      .replace(/gyne/g, 'gyna')
      .replace(/cardio/g, 'cardio');

    const startsWithMatches = [];
    const includesMatches = [];

    for (const spec of allSpecialties) {
      const specLower = spec.toLowerCase();
      if (specLower.startsWith(cleanQuery)) {
        startsWithMatches.push(spec);
      } else if (specLower.includes(cleanQuery)) {
        includesMatches.push(spec);
      }
    }

    return [...startsWithMatches, ...includesMatches].slice(0, 7);
  };

  const suggestions = getFilteredSpecialties();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    let queryVal = searchQuery.trim();
    if (queryVal.toLowerCase() === 'ent specialist' || queryVal.toLowerCase() === 'ent') {
      queryVal = 'ENT';
    }
    onSearch({
      type: 'doctors',
      query: queryVal
    });
  };

  const handleSpecialtySelect = (specialty) => {
    const searchVal = specialty === 'ENT Specialist' ? 'ENT' : specialty;
    setSearchQuery(searchVal);
    setShowSuggestions(false);
    onSearch({
      type: 'doctors',
      query: searchVal
    });
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950">
      {/* Background */}
      <img
        src={hospital}
        alt="Hospital building"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/40 z-0"></div>

      {/* Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/60 to-slate-950 z-0"></div>

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="home-container"
      >

        {/* Hero Headline Section */}
        <motion.section
          variants={containerVariants}
          className="home-hero"
        >
          <motion.span
            variants={badgeVariants}
            className="home-badge"
          >
            <HeartPulse size={14} />
           Bengaluru's Leading Healthcare Platform
          </motion.span>
          <motion.h1
            variants={headingVariants}
            className="home-heading"
          >
            <TypeAnimation
              sequence={[
                'Consult Doctors Instantly',
                2000,
                'Decode Your Prescriptions',
                2000,
                'Find the Right Specialist',
                2000,
              ]}
              wrapper="span"
              speed={150}
              style={{
                color: "#ffffff",
                fontWeight: 600,
                display: "inline-block",
              }}
              repeat={Infinity}
            />
          </motion.h1>
          <motion.p
            variants={descriptionVariants}
            className="home-description"
          >
            Easily find nearby doctors, specialists, and medical clinics. Compare prices in real-time, locate registered clinics close to you, and consult with our helpful AI health assistants.
          </motion.p>
        </motion.section>

        <motion.section
          variants={searchCardVariants}
          className="glass-panel home-search-panel"
        >
          {/* Section Header */}
          <div className="home-search-header">
            <Stethoscope size={18} style={{ color: 'var(--primary-neon)' }} />
            <h2 className="home-search-title">
              Find Doctors
            </h2>
          </div>


          <form onSubmit={handleSearchSubmit} className="home-search-form">


            <div className="home-search-input-wrapper">
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.3)' }} size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Specialty (e.g. ENT, Dentist, Gynaecologist)..."
                className="home-search-input"
              />

              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div className="glass-panel home-suggestions-panel">
                  <div className="home-suggestions-header">
                    {searchQuery.trim() ? 'Suggested Specialities' : 'Common Specialities'}
                  </div>
                  {suggestions.length === 0 ? (
                    <div className="home-suggestions-empty">
                      No matching specialties found. Try searching anyway!
                    </div>
                  ) : (
                    suggestions.map((spec) => (
                      <div
                        key={spec}
                        onMouseDown={() => handleSpecialtySelect(spec)}
                        className="home-suggestion-item suggestion-item"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Search size={14} style={{ color: 'var(--text-muted)' }} />
                          <span>{spec}</span>
                        </div>
                        <span className="home-suggestion-label">
                          SPECIALITY
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Search Button */}
            <motion.button
              variants={searchButtonHoverVariants}
              whileHover="hover"
              type="submit"
              className="home-search-btn"
            >
              Search
            </motion.button>
          </form>

          <div className="home-quick-tags">
            <span className="home-quick-tag-label">Popular in Bengaluru:</span>
            {['ENT', 'Cardiologist', 'General Physician'].map(tag => (
              <button
                key={tag}
                onClick={() => {
                  setSearchQuery(tag);
                  onSearch({ type: 'doctors', query: tag });
                }}
                className="home-quick-tag-btn"
              >
                {tag}
              </button>
            ))}
          </div>
        </motion.section>

        {/* AI Features Suite */}
        <motion.section
          variants={featuresContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="home-features-section"
        >
          <div className="home-features-header">
            <h2 className="home-features-title">
              Explore Our AI Powered Health Tools
            </h2>
            <p className="home-features-subtitle">
              We help you read handwritten prescriptions, know general uses and side effects of Prescribed Medicines and connect you with the right doctor in just a few clicks.
            </p>
          </div>

          <div className="home-features-stack">

            {/* Feature 1: Report Analyzer */}
            <motion.div variants={featureCardVariants} className="home-feature-card">
              {/* Text Info */}
              <div className="home-feature-info">
                <span className="home-feature-badge-cyan">
                  AI REPORT ANALYZER
                </span>
                <h3 className="home-feature-title">
                  Understand Your Laboratory Reports
                </h3>
                <p className="home-feature-desc">
                  Simply upload any blood test, lab PDF, or paper scan. Our AI translates it into simple language, highlights abnormal values, and explains what they mean for your body.
                </p>
                <button
                  onClick={() => onNavigate && onNavigate('reports')}
                  className="home-feature-btn-cyan"
                >
                  Analyze My Reports
                  <ArrowRight size={16} />
                </button>
              </div>

              {/* Visual Mockup Column */}
              <div className="home-feature-visual">
                <div className="home-glow-backdrop glow-backdrop" style={{ background: 'rgba(6, 182, 212, 0.25)' }} />

                {/* Main Card */}
                <div className="glass-panel home-mock-card float-card-anim">
                  <div className="home-mock-card-header">
                    <div className="home-mock-card-status">
                      <span className="pulse-status" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                      <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em' }}>REPORT ANALYSIS ACTIVE</span>
                    </div>
                  </div>

                  <div className="home-mock-card-items">
                    <div className="home-mock-card-item">
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                      <span>Read blood report scan (PDF)</span>
                    </div>
                    <div className="home-mock-card-item">
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                      <span>Convert medical metrics to logs</span>
                    </div>
                    <div className="home-mock-card-item">
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                      <span style={{ color: '#f43f5e', fontWeight: 600 }}>Flag: Cholesterol level (High)</span>
                    </div>
                  </div>

                  <div className="home-mock-progress-wrapper">
                    <div className="home-mock-progress-info">
                      <span>PARSING COMPLETION</span>
                      <span style={{ color: 'var(--primary-neon)', fontWeight: 'bold' }}>75%</span>
                    </div>
                    <div className="home-mock-progress-bar">
                      <div className="home-mock-progress-fill" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Feature 2: Prescription Scanner */}
            <motion.div variants={featureCardVariants} className="home-feature-card">
              {/* Visual Mockup Column */}
              <div className="home-feature-visual">
                <div className="home-glow-backdrop glow-backdrop" style={{ background: 'rgba(16, 185, 129, 0.2)' }} />

                {/* Main Card */}
                <div className="glass-panel home-mock-card float-card-anim">
                  <div className="laser-scanner-line" />

                  <div className="home-mock-card-header">
                    <div className="home-mock-card-status">
                      <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--secondary-neon)', padding: '4px', borderRadius: '6px', display: 'flex' }}><Pill size={14} /></span>
                      <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em' }}>PRESCRIPTION SCANNER</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <span className="home-mock-drug-header">Extracted Drug</span>
                      <span className="home-mock-drug-val">Amoxicillin (500mg)</span>
                    </div>

                    <div className="home-mock-drug-grid">
                      <div>
                        <span className="home-mock-drug-header">Reason for Use</span>
                        <span style={{ fontSize: '0.78rem', color: '#e5e7eb' }}>Bacterial Infection</span>
                      </div>
                      <div>
                        <span className="home-mock-drug-header">Standard Usage</span>
                        <span style={{ fontSize: '0.78rem', color: '#e5e7eb' }}>1 Capsule every 8h</span>
                      </div>
                    </div>

                    <div className="home-mock-drug-safety">
                      <span className="home-mock-drug-header">Precautions</span>
                      <ul style={{ margin: 0, paddingLeft: '12px', fontSize: '0.7rem', color: '#9ca3af' }}>
                        <li>Take post meals with warm water</li>
                        <li>Avoid dairy products</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Text Info */}
              <div className="home-feature-info">
                <span className="home-feature-badge-green">
                  PRESCRIPTION TRANSLATOR
                </span>
                <h3 className="home-feature-title">
                  Scan & Decode Your Prescription
                </h3>
                <p className="home-feature-desc">
                  Simply take a snapshot of your written prescription page. Our system scans the image, lists the medicine names clearly, explains dosage frequencies, and provides safety precaution alerts, side effects and general uses of medicince.
                </p>
                <button
                  onClick={() => onNavigate && onNavigate('prescription')}
                  className="home-feature-btn-green"
                >
                  Scan Prescription
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>

            {/* Feature 3: Symptom Chatbot */}
            <motion.div variants={featureCardVariants} className="home-feature-card">
              {/* Text Info */}
              <div className="home-feature-info">
                <span className="home-feature-badge-cyan">
                  VIRTUAL HEALTH CARE
                </span>
                <h3 className="home-feature-title">
                  Consult Your 24/7 AI Health Advisor
                </h3>
                <p className="home-feature-desc">
                  Chat with our virtual clinical assistant, AeroBot. Explain how you feel in simple terms, and it will ask follow-up questions to understand your symptoms, advise on standard self-care steps, and recommend slots with matched local doctors.
                </p>

                <button
                  onClick={() => onOpenChat && onOpenChat()}
                  className="home-feature-btn-cyan"
                >
                  Consult Assistant
                  <ArrowRight size={16} />
                </button>
              </div>

              {/* Visual Mockup Column */}
              <div className="home-feature-visual">
                <div className="home-glow-backdrop glow-backdrop" style={{ background: 'rgba(6, 182, 212, 0.2)' }} />

                {/* Main Card */}
                <div className="glass-panel home-mock-card float-card-anim">
                  <div className="home-mock-card-header">
                    <div className="home-mock-card-status">
                      <span className="pulse-status" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                      <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em' }}>AEROBOT VIRTUAL HELPER</span>
                    </div>
                  </div>

                  {/* Chat Dialog simulation */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'hidden' }}>
                    <div className="home-mock-chat-bubble-ai">
                      Hi! Explain your symptoms in simple terms.
                    </div>
                    <div className="home-mock-chat-bubble-user">
                      I have a mild fever and a dry cough since yesterday.
                    </div>
                    <div className="home-mock-chat-bubble-ai">
                      Rest is advised. Let's find you slot bookings with local Physicians?
                    </div>
                  </div>

                  <div className="home-mock-chat-tags">
                    <span style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--primary-neon)', border: '1px solid rgba(6, 182, 212, 0.25)', borderRadius: '20px', padding: '4px 10px', fontSize: '0.65rem', fontWeight: 600 }}>Book Doctor</span>
                    <span style={{ background: 'rgba(255, 255, 255, 0.03)', color: '#9ca3af', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px', padding: '4px 10px', fontSize: '0.65rem' }}>Precautions</span>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </motion.section>

        <style dangerouslySetInnerHTML={{
          __html: `
        .suggestion-item:hover {
          background: rgba(6, 182, 212, 0.1) !important;
          color: var(--primary-neon) !important;
        }
        @keyframes workflowPulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        @keyframes barGrow {
          0% { transform: scaleY(0.2); }
          100% { transform: scaleY(1); }
        }
        @keyframes floatCard {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.12; }
          50% { opacity: 0.28; }
        }
        @keyframes laserScan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .laser-scanner-line {
          position: absolute;
          left: 0;
          width: 100%;
          height: 2px;
          background: var(--secondary-neon);
          box-shadow: 0 0 8px var(--secondary-neon);
          animation: laserScan 4s linear infinite;
          z-index: 2;
          pointer-events: none;
        }
        .float-card-anim {
          animation: floatCard 4s ease-in-out infinite;
        }
        .pulse-status {
          animation: workflowPulse 2.2s infinite;
        }
        .bar-grow-anim {
          transform-origin: bottom;
          animation: barGrow 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
      </motion.div>
    </div>
  );
};

export default Home;
