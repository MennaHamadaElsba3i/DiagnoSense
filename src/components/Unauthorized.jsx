import React from 'react';
import { useNavigate } from 'react-router-dom';
import diagnobotCryingImg from '../assets/Diagnobot_Crying.png';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      textAlign: 'center',
      padding: '20px'
    }}>
      <img 
        src={diagnobotCryingImg} 
        alt="Access Denied" 
        style={{ width: '350px', height: 'auto', marginBottom: '24px' }} 
      />
      <h1 style={{ 
        color: '#0A1C40', 
        fontSize: '28px', 
        fontWeight: 'bold', 
        marginBottom: '12px', 
        fontFamily: 'Inter, sans-serif' 
      }}>
        Access Denied
      </h1>
      <p style={{ 
        color: '#4E5A73', 
        fontSize: '16px', 
        marginBottom: '32px', 
        maxWidth: '400px', 
        lineHeight: '1.5', 
        fontFamily: 'Inter, sans-serif' 
      }}>
        You don't have permission to view this page or your session has expired.
      </p>
      <button 
        style={{ 
          backgroundColor: '#2A66FF', 
          color: '#fff', 
          border: 'none', 
          borderRadius: '8px', 
          padding: '12px 24px', 
          fontSize: '15px', 
          fontWeight: '600', 
          cursor: 'pointer', 
          transition: 'background-color 0.2s, transform 0.2s', 
          fontFamily: 'Inter, sans-serif' 
        }}
        onMouseOver={(e) => { e.target.style.backgroundColor = '#1C4ED8'; e.target.style.transform = 'translateY(-1px)'; }}
        onMouseOut={(e) => { e.target.style.backgroundColor = '#2A66FF'; e.target.style.transform = 'translateY(0)'; }}
        onClick={() => navigate('/')}
      >
        Go to Landing Page
      </button>
    </div>
  );
};

export default Unauthorized;
