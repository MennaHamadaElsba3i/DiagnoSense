import React, { useEffect } from 'react';

const PaymentSuccess = () => {
  useEffect(() => {
    // Attempt to close the window immediately on mount
    window.close();
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <p>Payment successful! Closing window...</p>
    </div>
  );
};

export default PaymentSuccess;
