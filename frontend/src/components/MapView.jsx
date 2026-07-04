import React, { useEffect, useRef, useState } from 'react';
import { Compass } from 'lucide-react';

const MapView = ({
  providers = [],
  activeProviderId,
  onSelectProvider,
  centerCoords = [77.641151, 12.971891]
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const searchCenterMarkerRef = useRef(null);


  const getCenterCoords = () => {
    const validCoords = providers
      .filter(p => p.coordinates && p.coordinates.length === 2)
      .map(p => p.coordinates);

    if (validCoords.length === 0) {
      return centerCoords || [77.641151, 12.971891];
    }

    const sumLng = validCoords.reduce((sum, c) => sum + c[0], 0);
    const sumLat = validCoords.reduce((sum, c) => sum + c[1], 0);
    return [sumLng / validCoords.length, sumLat / validCoords.length];
  };

  useEffect(() => {
    const scriptId = 'mapbox-gl-js';
    const cssId = 'mapbox-gl-css';

    let link = document.getElementById(cssId);
    if (!link) {
      link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.css';
      document.head.appendChild(link);
    }

    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.js';
      script.async = true;
      script.onload = () => setMapLoaded(true);
      document.head.appendChild(script);
    } else {
      if (window.mapboxgl) {
        setMapLoaded(true);
      } else {
        script.addEventListener('load', () => setMapLoaded(true));
      }
    }
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || mapRef.current) return;

    const mapboxgl = window.mapboxgl;

    const token = import.meta.env.VITE_MAPBOX_TOKEN ||
      window.MAPBOX_TOKEN ||
      '';

    if (!token) {
      setMapError(true);
      return;
    }

    mapboxgl.accessToken = token;

    const [centerLng, centerLat] = getCenterCoords();

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [centerLng, centerLat],
      zoom: 10,
      attributionControl: false
    });

    map.on('error', (e) => {
      setMapError(true);
    });

    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapLoaded]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const mapboxgl = window.mapboxgl;
    const map = mapRef.current;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const center = getCenterCoords();

    const validProviders = providers.filter(p => p.coordinates && p.coordinates.length === 2);
    if (validProviders.length === 0) {
      map.flyTo({ center, zoom: 12 });
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();

    validProviders.forEach((p, index) => {
      const [lng, lat] = p.coordinates;
      bounds.extend([lng, lat]);

      const el = document.createElement('div');
      el.style.width = '14px';
      el.style.height = '14px';
      el.style.cursor = 'pointer';

      const pin = document.createElement('div');
      pin.className = 'provider-marker';
      pin.style.width = '100%';
      pin.style.height = '100%';
      pin.style.borderRadius = '50%';
      pin.style.backgroundColor = '#10b981';
      pin.style.border = '2px solid #ffffff';
      pin.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.8), 0 0 4px rgba(0,0,0,0.5)';
      pin.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';

      el.appendChild(pin);

      el.addEventListener('mouseenter', () => {
        pin.style.transform = 'scale(1.25)';
        pin.style.boxShadow = '0 0 12px rgba(16, 185, 129, 1), 0 0 6px rgba(0,0,0,0.6)';
      });
      el.addEventListener('mouseleave', () => {
        pin.style.transform = 'scale(1.0)';
        pin.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.8), 0 0 4px rgba(0,0,0,0.5)';
      });

      const name = p.name || p.labName || 'Healthcare Provider';
      const detail = p.specialty || 'Bengaluru';
      const feeText = p.fee
        ? `<br/><strong style="color:#059669;">Consultation: ₹${p.fee}</strong>`
        : (p.price ? `<br/><strong style="color:#06b6d4;">Price: ₹${p.price}</strong>` : '');

      const popup = new mapboxgl.Popup({ offset: 12, closeButton: true, closeOnClick: true, focusAfterOpen: false })
        .setHTML(`
          <div style="color:#1e293b; font-family:sans-serif; font-size:12px; line-height:1.4; padding:4px;">
            <strong style="font-size:13px; color:#0f172a;">${name}</strong>
            <div style="color:#64748b; font-size:11px; margin-top:2px;">${detail}</div>
            ${feeText}
          </div>
        `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onSelectProvider) {
          onSelectProvider(p.labId || p.doctorId);
        }
      });

      markersRef.current.push(marker);
    });

    if (validProviders.length > 0) {
      map.fitBounds(bounds, {
        padding: { top: 40, bottom: 40, left: 40, right: 40 },
        maxZoom: 12,
        duration: 1200
      });
    }
  }, [providers, mapLoaded]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !activeProviderId) return;

    const activeProvider = providers.find(p => p.labId === activeProviderId || p.doctorId === activeProviderId);
    if (activeProvider && activeProvider.coordinates) {
      mapRef.current.flyTo({
        center: activeProvider.coordinates,
        zoom: 14,
        speed: 1.2,
        curve: 1.42,
        essential: true
      });

      const validProviders = providers.filter(p => p.coordinates && p.coordinates.length === 2);

      markersRef.current.forEach((m, idx) => {
        const p = validProviders[idx];
        if (p && (p.labId === activeProviderId || p.doctorId === activeProviderId)) {
          if (!m.getPopup().isOpen()) {
            m.togglePopup();
          }
        } else {
          if (m.getPopup().isOpen()) {
            m.getPopup().remove();
          }
        }
      });
    }
  }, [activeProviderId, mapLoaded]);

  return (
    <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '380px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: '#fff', fontWeight: 600 }}>
          <Compass size={18} style={{ color: 'var(--primary-neon)' }} />
          Bengaluru Interactive Map
        </h4>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Mapbox Live
        </span>
      </div>

      {/* Map Element Container Wrapper */}
      <div style={{ flex: 1, position: 'relative', minHeight: '320px' }}>
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            background: '#090d16',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            overflow: 'hidden'
          }}
        />

        {mapError && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(13, 17, 29, 0.96)',
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            color: '#fff',
            backdropFilter: 'blur(8px)'
          }}>
            <Compass size={40} style={{ color: '#ef4444', marginBottom: '16px', animation: 'spin 4s linear infinite' }} />
            <h5 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.02em' }}>Mapbox Token Required</h5>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '16px', maxWidth: '280px' }}>
              To display doctor listings on the geolocation map, please add your Mapbox Access Token in your environment file.
            </p>
            <div style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid var(--card-border)',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontFamily: 'monospace',
              color: 'var(--primary-neon)',
              marginBottom: '16px'
            }}>
              VITE_MAPBOX_TOKEN=your_token_here
            </div>
            <a
              href="https://mapbox.com"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '0.74rem', color: '#fff', textDecoration: 'underline', opacity: 0.8 }}
            >
              Get a free token on mapbox.com
            </a>
          </div>
        )}
      </div>

      {/* Map Legend */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '12px', justifyContent: 'center', fontSize: '0.7rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--secondary-neon, #10b981)' }} />
          <span style={{ color: 'var(--text-muted)' }}>Providers</span>
        </div>
      </div>

      {/* Mapbox Popup override overrides to match dark/glass styles if desired, standard Mapbox popups can be styled */}
      <style dangerouslySetInnerHTML={{__html: `
        .mapboxgl-popup-content {
          border-radius: 8px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
          border: 1px solid rgba(0,0,0,0.1) !important;
          background: #ffffff !important;
          padding: 12px 28px 12px 14px !important;
        }
        .mapboxgl-popup-close-button {
          color: #64748b !important;
          font-size: 16px !important;
          padding: 4px 8px !important;
          background: none !important;
          border: none !important;
          cursor: pointer !important;
          line-height: 1 !important;
          font-weight: 700 !important;
          transition: color 0.2s, background-color 0.2s !important;
          border-top-right-radius: 8px !important;
          outline: none !important;
          position: absolute !important;
          right: 4px !important;
          top: 4px !important;
        }
        .mapboxgl-popup-close-button:hover {
          background-color: #f1f5f9 !important;
          color: #ef4444 !important;
        }
        .mapboxgl-popup-anchor-top .mapboxgl-popup-tip { border-bottom-color: #ffffff !important; }
        .mapboxgl-popup-anchor-bottom .mapboxgl-popup-tip { border-top-color: #ffffff !important; }
        .mapboxgl-popup-anchor-left .mapboxgl-popup-tip { border-right-color: #ffffff !important; }
        .mapboxgl-popup-anchor-right .mapboxgl-popup-tip { border-left-color: #ffffff !important; }

        @keyframes pulse-user {
          0% { transform: scale(0.95); opacity: 1; }
          50% { transform: scale(1.25); opacity: 0.7; }
          100% { transform: scale(0.95); opacity: 1; }
        }
      `}} />
    </div>
  );
};

export default MapView;
