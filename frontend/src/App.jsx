import React, { useState, useEffect } from 'react';
import './App.css';

export default function KonbiniGuardDashboard() {
  const [batches, setBatches] = useState([
    { id: 1, name: 'Cheesy Samgyupsal Set', category: 'Bento & Meals', quantity: 5, expiryDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString() },
    { id: 2, name: 'Tonkatsu Bento', category: 'Bento & Meals', quantity: 4, expiryDate: new Date(Date.now() - 3600 * 1000).toISOString() },
    { id: 3, name: 'Melon Pan', category: 'Bakery & Bread', quantity: 0, expiryDate: new Date(Date.now() - 7200 * 1000).toISOString() },
    { id: 4, name: 'Spicy Tuna Onigiri', category: 'Snacks', quantity: 3, expiryDate: new Date(Date.now() + 90 * 60 * 1000).toISOString() },
  ]);

  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Bento & Meals');
  const [quantity, setQuantity] = useState(5);
  
  const [yearsValue, setYearsValue] = useState(0);
  const [monthsValue, setMonthsValue] = useState(0);
  const [daysValue, setDaysValue] = useState(1);

  const [confirmingId, setConfirmingId] = useState(null);

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  const evaluateBatchStatus = (expiryString) => {
    const now = currentTime.getTime();
    const expiry = new Date(expiryString).getTime();
    const diffMs = expiry - now;

    if (isNaN(expiry)) {
      return { status: 'Invalid Date', timer: 'Check format', className: 'expired' };
    }

    if (diffMs <= 0) {
      return { status: 'Expired', timer: 'Expired', className: 'expired' };
    }

    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    let timerText = '';
    if (diffDays >= 1) {
      const days = Math.floor(diffDays);
      const hours = Math.floor(diffHours % 24);
      timerText = `${days}d ${hours}h remaining`;
    } else {
      const hoursLeft = Math.floor(diffHours);
      const minutesLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      timerText = hoursLeft === 0 ? `${minutesLeft}m remaining` : `${hoursLeft}h ${minutesLeft}m remaining`;
    }

    if (diffHours <= 2) {
      return { status: 'Nearly Expired', timer: timerText, className: 'nearly-expired' };
    }

    return { status: 'Fresh', timer: timerText, className: 'fresh' };
  };

  const evaluatedBatches = batches.map(b => ({
    ...b,
    ...evaluateBatchStatus(b.expiryDate)
  }));

  const totalActive = evaluatedBatches.length;
  const freshBatches = evaluatedBatches.filter(b => b.status === 'Fresh' || b.status === 'Nearly Expired').length;
  const expiredBatches = evaluatedBatches.filter(b => b.status === 'Expired').length;

  const handleRemove = (id) => {
    setBatches(batches.filter(b => b.id !== id));
    setConfirmingId(null);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!itemName) return;

    const expiryDate = new Date();
    if (yearsValue) expiryDate.setFullYear(expiryDate.getFullYear() + Number(yearsValue));
    if (monthsValue) expiryDate.setMonth(expiryDate.getMonth() + Number(monthsValue));
    if (daysValue) expiryDate.setDate(expiryDate.getDate() + Number(daysValue));

    const newBatch = {
      id: Date.now(),
      name: itemName,
      category,
      quantity: Number(quantity),
      expiryDate: expiryDate.toISOString(),
    };

    setBatches([newBatch, ...batches]);
    setItemName('');
    setYearsValue(0);
    setMonthsValue(0);
    setDaysValue(1);
  };

  return (
    <div className="dashboard-container">
      <div className="max-width-wrapper">
        
        <header className="header">
          <div className="header-left">
            <div className="logo-box">KG</div>
            <div>
              <h1 className="title">KonbiniGuard</h1>
              <p className="subtitle">Real-Time Food Freshness & Shelf-Life Management System</p>
            </div>
          </div>
          <div className="sync-badge">
            <span className="sync-dot"></span>
            Live Sync Active
          </div>
        </header>

        <div className="metrics-grid">
          <div className="metric-card">
            <p className="metric-title">Total Active Batches</p>
            <p className="metric-value">{totalActive}</p>
          </div>
          <div className="metric-card">
            <p className="metric-title">Fresh / Safe Batches</p>
            <p className="metric-value fresh">{freshBatches}</p>
          </div>
          <div className="metric-card">
            <p className="metric-title">Expired / Discarded</p>
            <p className="metric-value expired">{expiredBatches}</p>
          </div>
        </div>

        <div className="main-grid">
          
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Live Inventory Status</h2>
              <span className="card-note">Auto-updating every second</span>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Item & Category</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Shelf-Life Timer</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluatedBatches.map((batch) => (
                    <tr key={batch.id}>
                      <td>
                        <div className="item-name">{batch.name}</div>
                        <div className="item-category">{batch.category}</div>
                      </td>
                      <td style={{ fontWeight: 500, color: '#334155' }}>{batch.quantity} units</td>
                      <td>
                        <span className={`status-badge ${batch.className}`}>
                          <span className={`status-dot ${batch.className}`}></span>
                          {batch.status}
                        </span>
                      </td>
                      <td className={`timer ${batch.className}`}>
                        {batch.timer}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {confirmingId === batch.id ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Remove?</span>
                            <button 
                              onClick={() => handleRemove(batch.id)}
                              style={{ backgroundColor: '#e11d48', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              Yes
                            </button>
                            <button 
                              onClick={() => setConfirmingId(null)}
                              style={{ backgroundColor: '#e2e8f0', color: '#334155', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setConfirmingId(batch.id)}
                            className="remove-btn"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ color: '#4f46e5', fontSize: '18px' }}>➕</span>
              <h2 className="card-title" style={{ fontSize: '18px' }}>Register New Batch</h2>
            </div>
            <p className="card-note" style={{ marginBottom: '24px' }}>Add freshly prepared items with shelf-life durations.</p>

            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">Item Name</label>
                <input 
                  type="text" 
                  value={itemName} 
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g., Teriyaki Chicken Bento" 
                  className="form-input"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    className="form-select"
                  >
                    <option>Bento & Meals</option>
                    <option>Bakery & Bread</option>
                    <option>Snacks</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input 
                    type="number" 
                    value={quantity} 
                    onChange={(e) => setQuantity(e.target.value)}
                    className="form-input"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Shelf Life Duration</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Years</span>
                    <input 
                      type="number" 
                      value={yearsValue} 
                      onChange={(e) => setYearsValue(e.target.value)}
                      min="0"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Months</span>
                    <input 
                      type="number" 
                      value={monthsValue} 
                      onChange={(e) => setMonthsValue(e.target.value)}
                      min="0"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Days</span>
                    <input 
                      type="number" 
                      value={daysValue} 
                      onChange={(e) => setDaysValue(e.target.value)}
                      min="0"
                      className="form-input"
                    />
                  </div>
                </div>
                <span className="form-hint">Example: Set Years to 2 and Days to 1 for 2 years and 1 day.</span>
              </div>

              <button type="submit" className="submit-btn">
                Register & Start Timer
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}