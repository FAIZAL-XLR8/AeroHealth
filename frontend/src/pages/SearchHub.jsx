import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowDownUp, RefreshCw, Sparkles, Navigation, Briefcase } from 'lucide-react';
import MapView from '../components/MapView';
import '../styles/SearchHub.css';
import { apiUrl } from '../utils/api';

const SearchHub = ({ searchParams, onBook }) => {
  const [providers, setProviders] = useState([]);
  const [sortTab, setSortTab] = useState('best');
  const [activeProviderId, setActiveProviderId] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);

  const getAreaName = (coords) => {
    if (!coords || coords.length !== 2) return 'Bengaluru';
    const [lng, lat] = coords;
    if (lng > 77.630 && lng < 77.650 && lat > 12.965 && lat < 12.980) return 'Indiranagar';
    if (lng > 77.610 && lng < 77.630 && lat > 12.925 && lat < 12.945) return 'Koramangala';
    if (lng > 77.625 && lng < 77.645 && lat > 12.900 && lat < 12.920) return 'HSR Layout';
    if (lng > 77.630 && lng < 77.645 && lat > 12.950 && lat < 12.965) return 'Domlur';
    if (lng > 77.700) return 'Whitefield';
    return 'Bengaluru';
  };

  const { query } = searchParams;

  const fetchInitialResults = async (force = false) => {
    setIsVerifying(true);
    setProgressWidth(20);
    try {
      const endpoint = apiUrl(`/api/doctors/search?specialty=${query}&forceRefresh=${force}`);
      const res = await fetch(endpoint);
      const data = await res.json();

      setProviders(data.doctors || []);
      setProgressWidth(100);
      setTimeout(() => setIsVerifying(false), 500);
    } catch (err) {
      setProgressWidth(100);
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    fetchInitialResults();
  }, [searchParams]);

  const getSortedProviders = () => {
    if (!providers || providers.length === 0) return [];

    const fees = providers.map(p => p.fee || p.consultationFee || 500);
    const exps = providers.map(p => p.experience || 0);
    const minFee = Math.min(...fees);
    const maxFee = Math.max(...fees);
    const minExp = Math.min(...exps);
    const maxExp = Math.max(...exps);

    const getScore = (doctor) => {
      const fee =  doctor.consultationFee || 500;
      const exp = doctor.experience || 0;

      const experienceScore =
        maxExp === minExp
          ? 100
          : ((exp - minExp) / (maxExp - minExp)) * 100;

      const priceScore =
        maxFee === minFee
          ? 100
          : ((maxFee - fee) / (maxFee - minFee)) * 100;

      return (
        experienceScore * 0.7 +
        priceScore * 0.3
      );
    };

    return [...providers].sort((a, b) => {
      if (sortTab === 'cheapest') {
        const priceA = a.fee || a.consultationFee || 0;
        const priceB = b.fee || b.consultationFee || 0;
        return priceA - priceB;
      }

      if (sortTab === 'fastest') {
        return b.experience - a.experience;
      }

      return getScore(b) - getScore(a);
    });
  };

  const sortedList = getSortedProviders();

  return (
    <div className="sh-container">


      {isVerifying && (
        <div className="sh-loading-container">
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progressWidth}%` }} />
          </div>
          <span className="sh-loading-label">
            <RefreshCw size={12} className="glow-indicator" style={{ animation: 'spin 2s linear infinite' }} />
            Searching active clinic partners... fetching doctor profiles matching "{query}"
          </span>
        </div>
      )}


      <div className="skyscanner-layout" style={{ marginTop: '24px' }}>

        {/* Left Side: Sorting Tabs & Listings */}
        <div className="sh-left-column">

          {/* Header Dashboard Info */}
          <div className="sh-listings-header">
            <div>
              <h2 className="sh-listings-title">
                Clinics matching: {query}
              </h2>
              <span className="sh-listings-subtitle">
                Showing all active doctors in Bengaluru • {providers.length} found
              </span>
            </div>

            {/* Force Refresh Manual Hook */}
            <button onClick={() => fetchInitialResults(true)} className="sh-resync-btn">
              <RefreshCw size={12} />
              Re-sync List
            </button>
          </div>

          <div className="sh-sorting-tabs">
            <button
              onClick={() => setSortTab('best')}
              className="sh-sorting-tab"
              style={{
                background: sortTab === 'best' ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-obsidian)',
                color: sortTab === 'best' ? 'var(--primary-neon)' : 'var(--text-muted)'
              }}
            >
              <Sparkles size={14} />
              Best Match
            </button>
            <button
              onClick={() => setSortTab('cheapest')}
              className="sh-sorting-tab"
              style={{
                background: sortTab === 'cheapest' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-obsidian)',
                color: sortTab === 'cheapest' ? 'var(--secondary-neon)' : 'var(--text-muted)'
              }}
            >
              <ArrowDownUp size={14} />
              Cheapest
            </button>
            <button
              onClick={() => setSortTab('fastest')}
              className="sh-sorting-tab"
              style={{
                background: sortTab === 'fastest' ? 'rgba(244, 63, 94, 0.08)' : 'var(--bg-obsidian)',
                color: sortTab === 'fastest' ? 'var(--accent-alert)' : 'var(--text-muted)'
              }}
            >
              <Navigation size={14} />
              Highest Experience
            </button>
          </div>

          {/*  Listings Stack */}
          <div className="sh-listings-stack">
            {sortedList.length === 0 ? (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active specialist clinics found matching this query in Bengaluru.
              </div>
            ) : (
              sortedList.map((p) => {
                const isActive = activeProviderId === p.doctorId;

                return (
                  <div
                    key={p.doctorId}
                    className="glass-panel sh-listing-card"
                    onClick={() => setActiveProviderId(p.doctorId)}
                    style={{
                      borderColor: isActive ? 'var(--primary-neon)' : 'var(--card-border)',
                      boxShadow: isActive ? '0 0 15px rgba(6, 182, 212, 0.08)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {/* Top Row: Provider Name & Credentials */}
                    <div className="sh-listing-header">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 className="sh-listing-header-title">
                            {p.name.startsWith('Dr.') || p.name.startsWith('Dr ') ? p.name : `Dr. ${p.name}`}
                          </h3>
                        </div>
                        <span className="sh-listing-specialty">{p.specialty}</span>
                        {p.address && <span className="sh-listing-address">{p.address}</span>}
                      </div>

                      {/* Experience Badge instead of rating */}
                      <div className="sh-experience-badge">
                        <Briefcase size={12} style={{ color: 'var(--secondary-neon)' }} />
                        <span style={{ fontSize: '0.74rem', fontWeight: 'bold', color: 'var(--secondary-neon)' }}>
                          {p.experience || p.experienceYears || 10} Yrs Exp
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Timings and Pricing */}
                    <div className="sh-listing-details-grid">
                      <div>
                        <span className="sh-details-col-label">TIMINGS</span>
                        <span className="sh-details-col-val" title={p.activeHours}>
                          {p.activeHours}
                        </span>
                      </div>
                      <div className="sh-details-charges-wrapper">
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>CHARGES</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="sh-details-charges-val">
                            ₹{p.fee || p.consultationFee || 500}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Booking Action CTA */}
                    <div className="sh-booking-row">
                      <span className="sh-consultation-type">
                        Clinic Visit Consultation
                      </span>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => onBook(p)} className="sh-book-btn">
                          Book Appointment
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Right Side: Geolocation Interactive Map */}
        <div className="sh-map-container">
          <MapView
            providers={providers}
            activeProviderId={activeProviderId}
            onSelectProvider={setActiveProviderId}
          />
        </div>

      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
};

export default SearchHub;
