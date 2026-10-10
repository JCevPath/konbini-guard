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

    const batchInterval = setInterval(() => {
      fetchBatches();
    }, 3000);

    const timerInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
       clearInterval(timerInterval);
       clearInterval(batchInterval);
    };
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

    let expiryString = batch.expires_at || batch.expiry_date || batch.expiryDate;
    if (!expiryString) {
      return { status: 'Fresh', className: 'fresh' };
    }

    
    if (typeof expiryString === 'string' && !expiryString.endsWith('Z') && !expiryString.includes('+')) {
      expiryString += 'Z';
    }

    const now = currentTime.getTime();
    const expiry = new Date(expiryString).getTime();
    const diffMs = expiry - now;

  

    if (isNaN(expiry)) {
      return { status: 'Invalid Date', className: 'expired' };
    }

    const diffSeconds = diffMs / 1000;
    if (diffSeconds <= 30) {
      return { status: 'Near Expiration', className: 'nearly-expired' };
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
      <div className="mainContainer">
        <div className="contentBox">

          <header className="topHeader">
            <div className="headerText">
              <h1 className="mainTitle">KonbiniGuard</h1>
              <p className="subTitle">Real-Time Food Freshness & Shelf-Life Management System</p>
            </div>
          </header>

          <div className="card greenCard">
            <div className="cardHeaderGroup">
              <h2 className="cardTitle">Register New Batch</h2>
            </div>
            <p className="cardNote">Add freshly prepared items to the live inventory.</p>

            <form onSubmit={handleRegister} className="registerForm">
              <div className="formGroup categoryGroup">
                <label className="inputLabel">Category</label>
                <select
                  value={category}
                  onChange={handleCategoryChange}
                  className="selectInput"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="formGroup itemGroup">
                <label className="inputLabel">Item Name</label>
                <select
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="selectInput"
                  required
                >
                  {CATEGORY_ITEMS[category].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div className="formGroup quantityGroup">
                <label className="inputLabel">Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="numberInput"
                  min="1"
                  required
                />
              </div>

              <button type="submit" className="submitBTN">
                Register Batch
              </button>
            </form>
          </div>

          <div className="bottomSection">

            <div className="card blueCard tableCard">
              <div className="cardHeader">
                <h2 className="cardTitle">Live Inventory Status</h2>
              </div>

              <div className="tableWrapper">
                <table className="inventoryTable">
                  <thead>
                    <tr>
                      <th>Item & Category</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      <th className="alignRight">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluatedBatches.map((batch) => (
                      <tr key={batch.id}>
                        <td>
                          <div className="itemName">{batch.name || batch.item_name}</div>
                          <div className="itemCategory">{batch.category}</div>
                        </td>
                        <td className="quantityCell">{batch.quantity}</td>
                        <td>
                          <span className={`statusText ${batch.className}`}>
                            {batch.status}
                          </span>
                        </td>
                        <td className="alignRight">
                          {confirmingId === batch.id ? (
                            <div className="confirmBox">
                              <span className="confirmQuestion">Remove?</span>
                              <button
                                type="button"
                                onClick={() => handleRemove(batch.id)}
                                className="yesBTN"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingId(null)}
                                className="noBTN"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmingId(batch.id)}
                              className="removeBTN"
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

            <div className="card summaryCard">
              <div className="metricRow">
                <p className="metricLabel">Total Active Batches</p>
                <p className="metricValue">{totalActive}</p>
              </div>

              <hr className="dividerLine" />

              <div className="metricRow">
                <p className="metricLabel">Fresh Batches</p>
                <p className="metricValue freshText">{freshBatches}</p>
              </div>
              <div className="metricRow">
                <p className="metricLabel">Near Expiration</p>
                <p className="metricValue warningText">{nearBatches}</p>
              </div>
              <div className="metricRow">
                <p className="metricLabel">Expired</p>
                <p className="metricValue expiredText">{expiredBatches}</p>
              </div>
            </div>

          </div>

        </div>
      </div>
    );
  }