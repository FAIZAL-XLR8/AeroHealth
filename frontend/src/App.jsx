import React, { useState, useEffect } from 'react';
import { Home as HomeIcon, FileText, MessageCircle, HeartPulse, CheckCircle, Clock, Calendar, Pill, ClipboardList, Shield } from 'lucide-react';
import Home from './pages/Home';
import SearchHub from './pages/SearchHub';
import ReportAnalyzer from './pages/ReportAnalyzer';
import PrescriptionAnalyzer from './pages/PrescriptionAnalyzer';
import ChatDrawer from './components/ChatDrawer';
import AuthModal from './components/AuthModal';
import FlashMessage, { showFlash } from './components/FlashMessage';
import { apiUrl, fetchWithAuth } from './utils/api';

import BookingStepPage from './components/BookingStepPage';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import TelehealthRoom from './pages/TelehealthRoom';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';

const getPageFromHash = () => {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const validPages = ['home', 'search', 'reports', 'prescription', 'booking-step', 'patient-dashboard', 'doctor-dashboard', 'admin-dashboard', 'profile', 'telehealth-room'];
  return validPages.includes(hash) ? hash : 'home';
};

function App() {
  const [activePage, setActivePage] = useState(getPageFromHash);
  const [searchParams, setSearchParams] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    window.location.hash = `/${activePage}`;
  }, [activePage]);

  useEffect(() => {
    const handleHashChange = () => {
      const page = getPageFromHash();
      setActivePage(page);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const res = await fetchWithAuth(apiUrl('/api/auth/me'));
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          localStorage.setItem('user', JSON.stringify(data));
        } else {
          setUser(null);
          localStorage.removeItem('user');
        }
      } catch (err) {
        console.error('Session verification check failed:', err);
      }
    };
    verifySession();
  }, []);

  const [selectedProvider, setSelectedProvider] = useState(null);
  const [activeAppointmentId, setActiveAppointmentId] = useState(null);
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('pending-flash');
      if (pending) {
        const { message, type } = JSON.parse(pending);
        sessionStorage.removeItem('pending-flash');
        setTimeout(() => {
          showFlash(message, type);
        }, 100);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activePage]);

  const handleAuthSuccess = (data) => {
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    setIsAuthModalOpen(false);
    showFlash('Login successful', 'success');

    if (data.user.role === 'admin') {
      setActivePage('admin-dashboard');
    } else if (data.user.role === 'doctor') {
      setActivePage('doctor-dashboard');
    } else {
      setActivePage('patient-dashboard');
    }
  };

  const handleLogout = () => {
    fetchWithAuth(apiUrl('/api/auth/logout'), {
      method: 'POST'
    }).catch((err) => {
      console.error('Logout request failed:', err);
    });

    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setActivePage('home');
    setIsLogoutConfirmOpen(false);
    showFlash('Logged out successfully', 'success');
  };

  const handleSearchTrigger = (params) => {
    setSearchParams(params);
    setActivePage('search');
  };

  const handleSearchSpecialtyFromAI = (specialist) => {
    setSearchParams({
      type: 'doctors',
      query: specialist
    });
    setActivePage('search');
  };

  const handleBookTrigger = (provider) => {
    setSelectedProvider(provider);
    setActivePage('booking-step');
  };

  const handleStartConsultation = (apptId) => {
    setActiveAppointmentId(apptId);
    setActivePage('telehealth-room');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* 🧭 Navigation Bar */}
      <nav
        className="glass-panel"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,

          borderRadius: 0,
          borderLeft: 'none',
          borderRight: 'none',
          borderTop: 'none',
          background: 'rgba(7, 9, 19, 0.75)',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div
          onClick={() => setActivePage('home')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
        >
          <HeartPulse size={24} style={{ color: 'var(--primary-neon)' }} />
          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', fontFamily: 'Outfit' }}>
            Aero<span style={{ color: 'var(--primary-neon)' }}>Health</span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button
            onClick={() => setActivePage('home')}
            style={{
              background: 'none', border: 'none', color: activePage === 'home' ? 'var(--primary-neon)' : 'var(--text-muted)',
              fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <HomeIcon size={16} />
            Search
          </button>

          <button
            onClick={() => setActivePage('reports')}
            style={{
              background: 'none', border: 'none', color: activePage === 'reports' ? 'var(--primary-neon)' : 'var(--text-muted)',
              fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <FileText size={16} />
            Report Locker
          </button>

          <button
            onClick={() => setActivePage('prescription')}
            style={{
              background: 'none', border: 'none', color: activePage === 'prescription' ? 'var(--primary-neon)' : 'var(--text-muted)',
              fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <Pill size={16} />
            Prescription
          </button>

          {/* Role-Specific Portal Redirect Buttons */}
          {user && (
            user.role === 'admin' ? (
              <button
                onClick={() => setActivePage('admin-dashboard')}
                style={{
                  background: 'none', border: 'none', color: activePage === 'admin-dashboard' ? '#f43f5e' : 'var(--text-muted)',
                  fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <Shield size={16} style={{ color: '#f43f5e' }} />
                Admin Dashboard
              </button>
            ) : user.role === 'doctor' ? (
              <button
                onClick={() => setActivePage('doctor-dashboard')}
                style={{
                  background: 'none', border: 'none', color: activePage === 'doctor-dashboard' ? 'var(--secondary-neon)' : 'var(--text-muted)',
                  fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <Shield size={16} style={{ color: 'var(--secondary-neon)' }} />
                Doctor Dashboard
              </button>
            ) : (
              <button
                onClick={() => setActivePage('patient-dashboard')}
                style={{
                  background: 'none', border: 'none', color: activePage === 'patient-dashboard' ? 'var(--primary-neon)' : 'var(--text-muted)',
                  fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <ClipboardList size={16} />
                My Dashboard
              </button>
            )
          )}

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                onClick={() => setActivePage('profile')}
                style={{
                  fontSize: '0.82rem',
                  color: user.role === 'admin' ? '#f43f5e' : (user.role === 'doctor' ? 'var(--secondary-neon)' : 'var(--primary-neon)'),
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                className="hover-opacity"
                title="View My Profile Details"
              >
                {user.role === 'doctor' && !(user.name.startsWith('Dr.') || user.name.startsWith('Dr ')) ? `Dr. ${user.name}` : user.name}
              </span>
              <button
                onClick={() => setIsLogoutConfirmOpen(true)}
                style={{
                  background: 'none',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  color: 'var(--accent-alert)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  padding: '6px 12px',
                  cursor: 'pointer'
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              style={{
                background: 'var(--primary-neon)',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '6px 16px',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(6, 182, 212, 0.2)'
              }}
            >
              Login / Signup
            </button>
          )}
        </div>
      </nav>

      {/* 🚀 Main Page router view */}
      <main style={{ flex: 1, paddingBottom: activePage === 'telehealth-room' ? '0px' : '80px', display: 'flex', flexDirection: 'column' }}>

        {activePage === 'home' && (
          <Home
            onSearch={handleSearchTrigger}
            onNavigate={(page) => setActivePage(page)}
            onOpenChat={() => setIsChatOpen(true)}
          />
        )}

        {activePage === 'search' && searchParams && (
          <SearchHub searchParams={searchParams} onBook={handleBookTrigger} />
        )}

        {activePage === 'reports' && (
          <ReportAnalyzer onSearchDoctor={handleSearchSpecialtyFromAI} user={user} onOpenAuth={() => setIsAuthModalOpen(true)} />
        )}

        {activePage === 'prescription' && (
          <PrescriptionAnalyzer user={user} onOpenAuth={() => setIsAuthModalOpen(true)} />
        )}

        {/* 📅 Slot Selection & Booking Page */}
        {activePage === 'booking-step' && selectedProvider && (
          <BookingStepPage
            provider={selectedProvider}
            user={user}
            onCancel={() => setActivePage('search')}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {/* 👤 Patient Portal Page */}
        {activePage === 'patient-dashboard' && (
          <PatientDashboard
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onStartConsultation={handleStartConsultation}
          />
        )}

        {/* 🩺 Doctor Portal Dashboard Page */}
        {activePage === 'doctor-dashboard' && (
          <DoctorDashboard
            onStartConsultation={handleStartConsultation}
          />
        )}

        {/* 🛡️ Admin Dashboard Page */}
        {activePage === 'admin-dashboard' && (
          <AdminDashboard />
        )}

        {/* 👤 User Profile Details Page */}
        {activePage === 'profile' && (
          <Profile
            user={user}
            onBack={() => {
              if (user && user.role === 'admin') {
                setActivePage('admin-dashboard');
              } else if (user && user.role === 'doctor') {
                setActivePage('doctor-dashboard');
              } else {
                setActivePage('patient-dashboard');
              }
            }}
          />
        )}

        {/* 💬 WebRTC Consultation Chat Room */}
        {activePage === 'telehealth-room' && activeAppointmentId && (
          <TelehealthRoom
            appointmentId={activeAppointmentId}
            user={user}
            onBack={() => {
              if (user && user.role === 'doctor') {
                setActivePage('doctor-dashboard');
              } else {
                setActivePage('patient-dashboard');
              }
            }}
          />
        )}

      </main>

      {/* Footer */}
      {activePage !== 'telehealth-room' && (
        <footer style={{ width: '100%', backgroundColor: 'var(--bg-dark)', borderTop: '1px solid rgba(255, 255, 255, 0.05)', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
          <div style={{ maxWidth: '1100px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '32px', boxSizing: 'border-box' }}>

            {/* Text Links */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: '32px', rowGap: '16px', width: '100%' }}>
              <a href="#" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors duration-200">About</a>
              <a href="#" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors duration-200">Blog</a>
              <a href="#" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors duration-200">Jobs</a>
              <a href="#" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors duration-200">Press</a>
              <a href="#" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors duration-200">Accessibility</a>
              <a href="#" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors duration-200">Partners</a>
            </div>

            {/* Social Icons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', width: '100%', alignItems: 'center' }}>
              <a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors duration-200" aria-label="Facebook">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors duration-200" aria-label="Instagram">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.008 3.81.055.97.044 1.5.206 1.85.342.463.18.792.395 1.14.743.347.348.563.677.742 1.14.136.35.298.88.342 1.85.047 1.026.055 1.38.055 3.81s-.008 2.784-.055 3.81c-.044.97-.206 1.5-.342 1.85-.18.463-.395.792-.743 1.14-.348.347-.677.563-1.14.742-.35.136-.88.298-1.85.342-1.026.047-1.38.055-3.81.055s-2.784-.008-3.81-.055c-.97-.044-1.5-.206-1.85-.342-.463-.18-.792-.395-1.14-.743-.347-.348-.563-.677-.742-1.14-.136-.35-.298-.88-.342-1.85C2.008 15.018 2 14.664 2 12.315s.008-2.784.055-3.81c.044-.97.206-1.5.342-1.85.18-.463.395-.792.743-1.14.348-.347.677-.563 1.14-.742.35-.136.88-.298 1.85-.342 1.026-.047 1.38-.055 3.81-.055zM12 7.18a4.82 4.82 0 100 9.64 4.82 4.82 0 000-9.64zm0 2A2.82 2.82 0 1112 14.82 2.82 2.82 0 0112 9.18zM17.806 6.193a.96.96 0 10-1.92 0 .96.96 0 001.92 0z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors duration-200" aria-label="X (formerly Twitter)">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors duration-200" aria-label="GitHub">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors duration-200" aria-label="YouTube">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.42 4.814c-.23.861-.907 1.538-1.768 1.768C18.256 19 12 19 12 19s-6.256 0-7.812-.418c-.861-.23-1.538-.907-1.768-1.768C2 15.254 2 12 2 12s0-3.255.418-4.814c.23-.861.907-1.538 1.768-1.768C5.744 5 12 5 12 5s6.256 0 7.812.418zM9.545 15.568L15 12 9.545 8.432v7.136z" clipRule="evenodd" />
                </svg>
              </a>
            </div>

            {/* Copyright */}
            <p style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', margin: '8px 0 0 0' }}>
              &copy; {new Date().getFullYear()} AeroHealth, Inc. All rights reserved.
            </p>
          </div>
        </footer>
      )}

      {/* 🤖 Floating Action AI Assistant Trigger */}
      {activePage === 'home' && (
        <button
          onClick={() => setIsChatOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary-neon) 0%, #0891b2 100%)',
            border: 'none',
            boxShadow: '0 4px 20px rgba(6, 182, 212, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: 'pointer',
            zIndex: 999,
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.08)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Floating Chat Drawer Triage Assistant */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onSearchSpecialty={handleSearchSpecialtyFromAI}
        onBook={handleBookTrigger}
      />

      {/* Authentication and Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Logout Confirmation Modal */}
      {isLogoutConfirmOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(2, 6, 23, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
        }}>
          <div className="glass-panel" style={{
            maxWidth: '400px',
            width: '90%',
            padding: '28px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
            border: '1px solid var(--card-border)'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'Outfit' }}>
              Confirm Logout
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
              Are you sure you want to log out of your session?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '4px' }}>
              <button
                onClick={() => setIsLogoutConfirmOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--card-border)',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                style={{
                  background: 'var(--accent-alert)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(244, 63, 94, 0.3)',
                  transition: 'all 0.2s'
                }}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      <FlashMessage />
    </div>
  );
}

export default App;
