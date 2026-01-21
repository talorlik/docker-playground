import React, { useEffect } from 'react';

function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const backgroundColor = type === 'success' 
    ? '#d4edda' 
    : type === 'error' 
    ? '#f8d7da' 
    : '#d1ecf1';
  
  const color = type === 'success'
    ? '#155724'
    : type === 'error'
    ? '#721c24'
    : '#0c5460';

  const borderColor = type === 'success'
    ? '#c3e6cb'
    : type === 'error'
    ? '#f5c6cb'
    : '#bee5eb';

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 20px',
        backgroundColor,
        color,
        borderRadius: '4px',
        border: `1px solid ${borderColor}`,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: 10000,
        minWidth: '250px',
        maxWidth: '400px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        animation: 'slideIn 0.3s ease-out'
      }}
    >
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: color,
          fontSize: '20px',
          cursor: 'pointer',
          padding: '0',
          marginLeft: '15px',
          fontWeight: 'bold',
          opacity: 0.7
        }}
      >
        ×
      </button>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default Toast;
