import React, { useState, useEffect } from 'react';
import './App.css';

const NEAR_EXPIRATION_HOURS = 6;

const CATEGORY_ITEMS = {
  'Bento & Meals': ['FamiChiki', 'Karaage Bento', 'Pork Katsu Curry'],
  'Bakery & Bread': ['Melon Pan', 'Cream Bread', 'Roll Cakes'],
  'Snacks': ['Cucumber Chips', 'Potato Chips', 'Calbee Chips'],
};

const CATEGORIES = Object.keys(CATEGORY_ITEMS);

export default function KonbiniGuardDashboard() {
  const [batches, setBatches] = useState([]);
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [itemName, setItemName] = useState(CATEGORY_ITEMS[CATEGORIES[0]][0]);
  const [quantity, setQuantity] = useState(5);
  const [confirmingId, setConfirmingId] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());


  useEffect(() => {
    const fetchCatalogItems = async () => {
      try {
        const response = await fetch('/food/items');
        if (response.ok) {
          const data = await response.json();
          setItems(data);
        }
      } catch (err) {
        console.error('Failed to fetch catalog items:', err);
      }
    };

    fetchCatalogItems();
    fetchBatches();

    const timerInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);
  const fetchBatches = async () => {
    try {
      const response = await fetch('/food/batches');
      if (response.ok) {
        const data = await response.json();
        setBatches(data.filter((b) => b.status !== 'DISCARDED'));
      }
    } catch (err) {
      console.error('Failed to fetch food batches:', err);
    }
  };

  useEffect(() => {
    fetchBatches();

    const timerInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setCategory(newCategory);
    setItemName(CATEGORY_ITEMS[newCategory][0]);
  };

const evaluateBatchStatus = (batch) => {
    if (batch.status) {
      const s = batch.status.toUpperCase();
      if (s === 'EXPIRED') return { status: 'Expired', className: 'expired' };
      if (s === 'NEAR_EXPIRATION' || s === 'NEAR EXPIRATION') {
        return { status: 'Near Expiration', className: 'nearly-expired' };
      }
      if (s === 'FRESH') return { status: 'Fresh', className: 'fresh' };
    }

    const expiryString = batch.expires_at || batch.expiry_date || batch.expiryDate;
    if (!expiryString) {
      return { status: 'Fresh', className: 'fresh' };
    }

    const now = currentTime.getTime();
    const expiry = new Date(expiryString).getTime();
    const diffMs = expiry - now;

    if (isNaN(expiry)) {
      return { status: 'Invalid Date', className: 'expired' };
    }

    if (diffMs <= 0) {
      return { status: 'Expired', className: 'expired' };
    }

    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours <= NEAR_EXPIRATION_HOURS) {
      return { status: 'Near Expiration', className: 'nearly-expired' };
    }

    return { status: 'Fresh', className: 'fresh' };
  };

  const evaluatedBatches = batches.map((b) => ({
    ...b,
    id: b.batch_id || b.id,
    name: b.item_name || b.name || `Item #${b.item_id}`,
    ...evaluateBatchStatus(b),
  }));
  
  const totalActive = evaluatedBatches.length;
  const freshBatches = evaluatedBatches.filter((b) => b.status === 'Fresh').length;
  const nearBatches = evaluatedBatches.filter((b) => b.status === 'Near Expiration').length;
  const expiredBatches = evaluatedBatches.filter((b) => b.status === 'Expired').length;

  const handleRemove = async (id) => {
    try {
      const response = await fetch(`/food/batches/${id}/discard`, {
        method: 'PATCH',
      });

      if (response.ok) {
        setBatches((prev) => prev.filter((b) => (b.batch_id || b.id) !== id));
      }
    } catch (err) {
      console.error('Failed to discard batch:', err);
    }
    setConfirmingId(null);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!itemName) return;
    const selectedItem = items.find((i) => i.name === itemName);
    const itemId = selectedItem ? selectedItem.id : 1;
    const newBatch = {
      item_id: itemId,
      quantity: Math.max(1, parseInt(quantity, 10) || 1),
    };

    try {
      const response = await fetch('/food/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBatch),
      });

      if (response.ok) {
        const savedBatch = await response.json();
        setBatches((prev) => [savedBatch, ...prev]);
        setQuantity(5);
      } else {
        console.error('Failed to register batch, status:', response.status);
      }
    } catch (err) {
      console.error('Failed to register batch:', err);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="max-width-wrapper">

        <header className="header">
          <div className="header-left">
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

        <div className="card card-green" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: '#16a34a', fontSize: '18px' }}>➕</span>
            <h2 className="card-title" style={{ fontSize: '18px' }}>Register New Batch</h2>
          </div>
          <p className="card-note" style={{ marginBottom: '24px' }}>Add freshly prepared items to the live inventory.</p>

          <form
            onSubmit={handleRegister}
            style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '16px' }}
          >
            <div className="form-group" style={{ flex: '1 1 180px', marginBottom: 0 }}>
              <label className="form-label">Category</label>
              <select
                value={category}
                onChange={handleCategoryChange}
                className="form-select"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: '2 1 240px', marginBottom: 0 }}>
              <label className="form-label">Item Name</label>
              <select
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="form-select"
                required
              >
                {CATEGORY_ITEMS[category].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}>
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

            <button
              type="submit"
              className="submit-btn"
              style={{ flex: '0 0 auto', width: 'auto', whiteSpace: 'nowrap' }}
            >
              Register Batch
            </button>
          </form>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: '24px' }}>

          <div className="card card-blue" style={{ flex: '1 1 560px', minWidth: 0 }}>
            <div className="card-header">
              <h2 className="card-title">Live Inventory Status</h2>
              <span className="card-note">Status updates every second</span>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Item & Category</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluatedBatches.map((batch) => (
                    <tr key={batch.id}>
                      <td>
                        <div className="item-name">{batch.name || batch.item_name}</div>
                        <div className="item-category">{batch.category}</div> 
                      </td>
                      <td style={{ fontWeight: 500, color: '#334155' }}>{batch.quantity}</td>
                      <td>
                        <span className={`status-badge ${batch.className}`}>
                          <span className={`status-dot ${batch.className}`}></span>
                          {batch.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {confirmingId === batch.id ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Remove?</span>
                            <button
                              type="button"
                              onClick={() => handleRemove(batch.id)}
                              style={{ backgroundColor: '#e11d48', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 0, fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingId(null)}
                              style={{ backgroundColor: '#e2e8f0', color: '#334155', border: 'none', padding: '4px 8px', borderRadius: 0, fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
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

          <div
            className="card"
            style={{ flex: '0 1 300px', display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: '24px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className="metric-title metric-label-total">Total Active Batches</p>
              <p className="metric-value">{totalActive}</p>
            </div>

            <hr className="metric-separator" />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className="metric-title metric-label-fresh">Fresh Batches</p>
              <p className="metric-value fresh">{freshBatches}</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className="metric-title metric-label-near">Near Expiration</p>
              <p className="metric-value" style={{ color: '#d97706' }}>{nearBatches}</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className="metric-title metric-label-expired">Expired</p>
              <p className="metric-value expired">{expiredBatches}</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}