import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, X } from 'lucide-react';

export const showFlash = (message, type = 'success') => {
  window.dispatchEvent(
    new CustomEvent('show-flash', {
      detail: { message, type }
    })
  );
};

const FlashMessage = () => {
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    const handleShowFlash = (e) => {
      const { message, type } = e.detail;
      setFlash({ message, type });
    };

    window.addEventListener('show-flash', handleShowFlash);
    return () => {
      window.removeEventListener('show-flash', handleShowFlash);
    };
  }, []);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => {
      setFlash(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [flash]);

  if (!flash) return null;

  const { message, type } = flash;

  const typeConfigs = {
    success: {
      bg: '#ecfdf5',
      border: '#10b981',
      text: '#065f46',
      icon: <CheckCircle size={18} style={{ color: '#10b981' }} />
    },
    error: {
      bg: '#fef2f2',
      border: '#ef4444',
      text: '#991b1b',
      icon: <AlertCircle size={18} style={{ color: '#ef4444' }} />
    },
    warning: {
      bg: '#fffbeb',
      border: '#f59e0b',
      text: '#92400e',
      icon: <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
    }
  };

  const config = typeConfigs[type] || typeConfigs.success;

  return (
    <div
      className="flash-message-container"
      style={{
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: '12px',
        padding: '12px 20px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '90%',
        width: '400px',
        boxSizing: 'border-box',
        pointerEvents: 'auto'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {config.icon}
      </div>
      <div style={{
        flex: 1,
        fontSize: '0.88rem',
        fontWeight: 600,
        color: config.text,
        lineHeight: '1.4'
      }}>
        {message}
      </div>
      <button
        onClick={() => setFlash(null)}
        style={{
          background: 'none',
          border: 'none',
          color: config.text,
          opacity: 0.6,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px',
          borderRadius: '50%',
          transition: 'opacity 0.2s, background 0.2s'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.6; e.currentTarget.style.background = 'none'; }}
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default FlashMessage;
