import React, { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  updateDoc,
  doc
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { shintoDB } from '../firebase/firebase';
import { auth } from '../firebase/auth';
import { verifyTransaction } from '../services/paystack';
import './Dashboard.css';

const Dashboard = () => {
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('items');
  const [now, setNow] = useState(Date.now());
  const navigate = useNavigate();

  // ⏱️ Timer ticks every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 🔁 Real-time listener for items + orders
  useEffect(() => {
    const unsubscribeItems = onSnapshot(collection(shintoDB, 'items'), (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(itemsData);
    });

    const unsubscribeOrders = onSnapshot(collection(shintoDB, 'transactions'), (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ordersData);
      setLoading(false);
    });

    return () => {
      unsubscribeItems();
      unsubscribeOrders();
    };
  }, []);
  const handleLogout = () => {
    signOut(auth)
      .then(() => navigate('/login'))
      .catch((error) => console.error('Logout error:', error));
  };

  // ITEM APPROVAL
  const updateItemStatus = async (id, status) => {
    try {
      const itemRef = doc(shintoDB, 'items', id);
      const selectedItem = items.find(item => item.id === id);

      await updateDoc(itemRef, { status });

      setItems(prev =>
        prev.map(item => (item.id === id ? { ...item, status } : item))
      );

      if (selectedItem && selectedItem.authorEmail) {
        const response = await fetch('http://localhost:5000/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedItem.authorEmail,
            status,
            type: 'item_approval'
          }),
        });

        if (!response.ok) throw new Error('Email failed');
        alert(`✅ Item status updated to "${status.toUpperCase()}" and email sent to ${selectedItem.authorEmail}`);
      } else {
        alert(`⚠️ Item status updated but no authorEmail found.`);
      }
    } catch (error) {
      console.error('Error updating item status:', error);
      alert('❌ Failed to update item status.');
    }
  };

  // ORDER STAGES
  const handleProcessingStarted = async (id) => {
    try {
      const orderRef = doc(shintoDB, 'transactions', id);
      const selectedOrder = orders.find(order => order.id === id);

      const updateData = {
        status: 'processing',
        processingAt: new Date(),
        waitingPeriodStart: new Date(),
        // admin stage used for the live stage timer
        adminStage: 'started',
        adminStageStartedAt: new Date(),
      };

      await updateDoc(orderRef, updateData);

      setOrders(prev =>
        prev.map(order => (order.id === id ? { ...order, ...updateData } : order))
      );

      // Email notification
      if (selectedOrder && selectedOrder.buyerEmail) {
        const response = await fetch('http://localhost:5000/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedOrder.buyerEmail,
            status: 'processing',
            type: 'order_update',
            orderNumber: selectedOrder.orderNumber,
            productTitle: selectedOrder.productTitle,
          }),
        });

        if (!response.ok) throw new Error('Email failed');
        alert(`✅ Order #${selectedOrder.orderNumber} processing started and email sent to ${selectedOrder.buyerEmail}`);
      } else {
        alert(`⚠️ Order processing started but no buyer email found.`);
      }
    } catch (error) {
      console.error('Error starting processing:', error);
      alert('❌ Failed to start processing.');
    }
  };

  const handleDeliveryStage = async (id) => {
    try {
      const orderRef = doc(shintoDB, 'transactions', id);
      const updateData = {
        status: 'processing', // still processing during delivery
        deliveryStartedAt: new Date(),
        adminStage: 'delivery',
        adminStageStartedAt: new Date(),
      };

      await updateDoc(orderRef, updateData);

      setOrders(prev =>
        prev.map(order => (order.id === id ? { ...order, ...updateData } : order))
      );
    } catch (error) {
      console.error('Error marking delivery stage:', error);
      alert('❌ Failed to set delivery stage.');
    }
  };

  const handleItemDelivered = async (id) => {
    try {
      const orderRef = doc(shintoDB, 'transactions', id);
      const selectedOrder = orders.find(order => order.id === id);

      const updateData = {
        status: 'delivered',
        deliveredAt: new Date(),
        deliveryConfirmed: true,
        // stop live timer by moving stage out of "timed" stages
        adminStage: 'done',
        adminStageStartedAt: new Date(),
      };

      await updateDoc(orderRef, updateData);

      setOrders(prev =>
        prev.map(order => (order.id === id ? { ...order, ...updateData } : order))
      );

      // Success email
      if (selectedOrder && selectedOrder.buyerEmail) {
        const response = await fetch('http://localhost:5000/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedOrder.buyerEmail,
            status: 'delivered',
            type: 'delivery_confirmation',
            orderNumber: selectedOrder.orderNumber,
            productTitle: selectedOrder.productTitle,
          }),
        });
        if (!response.ok) throw new Error('Email failed');
      }

      alert(`✅ Order #${selectedOrder.orderNumber} marked as delivered!`);
    } catch (error) {
      console.error('Error marking as delivered:', error);
      alert('❌ Failed to mark as delivered.');
    }
  };

  const handleOrderRejected = async (id) => {
    if (!window.confirm('Are you sure? This will reject the order and initiate a refund process.')) {
      return;
    }

    try {
      const orderRef = doc(shintoDB, 'transactions', id);
      const selectedOrder = orders.find(order => order.id === id);

      const updateData = {
        status: 'rejected',
        rejectedAt: new Date(),
        refundInitiated: true,
        // stop live timer by moving stage out of "timed" stages
        adminStage: 'rejected',
        adminStageStartedAt: new Date(),
      };

      await updateDoc(orderRef, updateData);

      setOrders(prev =>
        prev.map(order => (order.id === id ? { ...order, ...updateData } : order))
      );

      // Rejection email
      if (selectedOrder && selectedOrder.buyerEmail) {
        const response = await fetch('http://localhost:5000/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedOrder.buyerEmail,
            status: 'rejected',
            type: 'order_rejection',
            orderNumber: selectedOrder.orderNumber,
            productTitle: selectedOrder.productTitle,
            amount: selectedOrder.amount,
            currency: selectedOrder.currency,
          }),
        });

        if (!response.ok) throw new Error('Email failed');
      }

      alert(`⚠️ Order #${selectedOrder.orderNumber} has been rejected. Customer will be refunded within 24 hours.`);
    } catch (error) {
      console.error('Error rejecting order:', error);
      alert('❌ Failed to reject order.');
    }
  };

  const handleVerify = async (item) => {
    if (!item.transactionRef) {
      alert('No transaction reference available.');
      return;
    }

    try {
      const res = await verifyTransaction(item.transactionRef);
      alert(`Transaction status: ${res.data.status}`);
      console.log(res);
    } catch (err) {
      alert('Verification failed. Check console.');
      console.error(err);
    }
  };

  const getStatusColor = (status, type = 'item') => {
    if (type === 'order') {
      switch (status?.toLowerCase()) {
        case 'pending': return '#f59e0b';
        case 'processing': return '#3b82f6';
        case 'delivered': return '#10b981';
        case 'rejected': return '#ef4444';
        default: return '#6b7280';
      }
    } else {
      switch (status?.toLowerCase()) {
        case 'approved': return '#10b981';
        case 'rejected': return '#ef4444';
        case 'pending': return '#f59e0b';
        default: return '#6b7280';
      }
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    // handle Firestore Timestamp or JS Date/number
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000).toLocaleString();
    return new Date(timestamp).toLocaleString();
  };

  // Helpers for stage timer
  const toDate = (ts) => {
    if (!ts) return null;
    if (ts.seconds) return new Date(ts.seconds * 1000);
    return new Date(ts);
  };

  const formatElapsed = (start) => {
    if (!start) return null;
    const diff = now - start.getTime();
    if (diff < 0) return '00:00:00';
    const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
    const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  /**
   * Only return a stage label for the stages that should have a LIVE timer.
   * We exclude 'done' and 'rejected' so the timer stops/hides after completion.
   */
  const getTimerStageLabel = (order) => {
    if (order.adminStage === 'delivery' || order.adminStage === 'started') return order.adminStage;
    if (!order.adminStage) {
      if (order.status === 'processing') return 'started';
      // delivered/rejected -> no live timer
    }
    return null;
  };

  // Derive stage start time for the live timer (delivery/started only)
  const getStageStart = (order) => {
    const stage = getTimerStageLabel(order);
    if (stage === 'delivery') return toDate(order.adminStageStartedAt) || toDate(order.deliveryStartedAt) || toDate(order.processingAt);
    if (stage === 'started') return toDate(order.adminStageStartedAt) || toDate(order.waitingPeriodStart) || toDate(order.processingAt);
    return null; // no timer for done/rejected
  };

  // Check if 4 hours have passed since processing started
  const hasWaitingPeriodExpired = (order) => {
    if (!order.waitingPeriodStart && !order.processingAt) return false;
    const startTime = order.waitingPeriodStart || order.processingAt;
    const processTime = startTime?.seconds ? new Date(startTime.seconds * 1000) : new Date(startTime);
    const fourHoursInMs = 4 * 60 * 60 * 1000;
    return (now - processTime.getTime()) > fourHoursInMs;
  };

  // Get remaining wait time (4 hours)
  const getRemainingWaitTime = (order) => {
    if (!order.waitingPeriodStart && !order.processingAt) return null;
    const startTime = order.waitingPeriodStart || order.processingAt;
    const processTime = startTime?.seconds ? new Date(startTime.seconds * 1000) : new Date(startTime);
    const fourHoursInMs = 4 * 60 * 60 * 1000;
    const elapsed = now - processTime.getTime();
    const remaining = fourHoursInMs - elapsed;

    if (remaining <= 0) return null;

    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}h ${minutes}m`;
  };

  // Unified stage change dispatcher
  const handleStageChange = async (orderId, stage) => {
    switch (stage) {
      case 'delivery':
        return handleDeliveryStage(orderId);
      case 'started':
        return handleProcessingStarted(orderId);
      case 'done':
        return handleItemDelivered(orderId);
      case 'rejected':
        return handleOrderRejected(orderId);
      default:
        return;
    }
  };

  const renderItemsTab = () => (
    <div className="tab-content">
      <h2>Items Approval ({items.length})</h2>
      {items.length === 0 ? (
        <p className="no-items">No items found.</p>
      ) : (
        <div className="product-list">
          {items.map(item => (
            <div key={item.id} className="product-card">
              {item.imageURL && (
                <img
                  src={item.imageURL}
                  alt={item.title || 'Product Image'}
                  className="product-image"
                />
              )}

              <div className="product-title">{item.title || 'Untitled'}</div>
              <div className="product-description">{item.description || 'No description'}</div>
              <div className="product-price">
                {item.price ? `₵${item.price}` : 'No price'}
              </div>

              {item.transactionRef && (
                <div className="product-ref">Ref: {item.transactionRef}</div>
              )}

              <div
                className="product-status"
                style={{ backgroundColor: getStatusColor(item.status, 'item') }}
              >
                {(item.status || 'pending').toUpperCase()}
              </div>

              <div className="action-buttons">
                <button
                  className="approve-btn"
                  onClick={() => updateItemStatus(item.id, 'approved')}
                  disabled={item.status === 'approved'}
                >
                  Approve
                </button>
                <button
                  className="reject-btn"
                  onClick={() => updateItemStatus(item.id, 'rejected')}
                  disabled={item.status === 'rejected'}
                >
                  Reject
                </button>
                <button className="verify-btn" onClick={() => handleVerify(item)}>
                  Verify
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderOrdersTab = () => (
    <div className="tab-content">
      <h2>Order Fulfillment ({orders.length})</h2>
      {orders.length === 0 ? (
        <p className="no-items">No orders found.</p>
      ) : (
        <div className="orders-list">
          {orders.map(order => {
            const timerStage = getTimerStageLabel(order); // 'delivery' | 'started' | null
            const stageStart = getStageStart(order);
            const elapsed = formatElapsed(stageStart);

            return (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <div className="order-number">#{order.orderNumber}</div>
                  <div
                    className="order-status"
                    style={{ backgroundColor: getStatusColor(order.status, 'order') }}
                  >
                    {(order.status || 'pending').toUpperCase()}
                  </div>
                </div>

                <div className="order-details">
                  <div className="order-product"><strong>{order.productTitle}</strong></div>
                  <div className="order-amount">{order.currency} {order.amount}</div>
                  <div className="order-customer">Customer: {order.shippingAddress?.fullName || 'N/A'}</div>
                  <div className="order-email">Email: {order.buyerEmail}</div>
                  <div className="order-contact">Support: georgeannann461@gmail.com</div>
                  <div className="order-date">Ordered: {formatDate(order.createdAt)}</div>

                  {/* Show the 4-hr waiting box only while processing */}
                  {order.status === 'processing' && (order.waitingPeriodStart || order.processingAt) && (
                    <div className="waiting-period">
                      <div className="waiting-info">
                        Processing Started: {formatDate(order.waitingPeriodStart || order.processingAt)}
                        <br />
                        {hasWaitingPeriodExpired(order) ? (
                          <span className="expired-notice">
                            ⚠️ 4hr processing period expired - Please update order status
                          </span>
                        ) : (
                          <span className="time-remaining">
                            ⏱️ Time remaining: {getRemainingWaitTime(order) || 'Calculating...'}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {order.shippingAddress && (
                  <div className="shipping-address">
                    <strong>Shipping Address:</strong><br/>
                    {order.shippingAddress.streetAddress}, {order.shippingAddress.city}<br/>
                    {order.shippingAddress.stateProvince}, {order.shippingAddress.country}<br/>
                    Phone: {order.shippingAddress.phone}
                  </div>
                )}

                {/* Quick Actions row (always visible) */}
                <div className="stage-controls" style={{marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                  <button
                    onClick={() => handleStageChange(order.id, 'delivery')}
                    disabled={order.status === 'delivered' || order.status === 'rejected'}
                    className="stage-btn"
                    title="Mark as out for delivery (keeps status: processing)"
                  >
                    Delivery
                  </button>
                  <button
                    onClick={() => handleStageChange(order.id, 'started')}
                    disabled={order.status === 'delivered' || order.status === 'rejected'}
                    className="stage-btn"
                    title="Mark processing started"
                  >
                    Started
                  </button>
                  <button
                    onClick={() => handleStageChange(order.id, 'done')}
                    disabled={order.status === 'delivered' || order.status === 'rejected'}
                    className="stage-btn"
                    title="Mark delivered (complete)"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => handleStageChange(order.id, 'rejected')}
                    disabled={order.status === 'delivered' || order.status === 'rejected'}
                    className="stage-btn"
                    title="Reject & refund"
                  >
                    Rejected
                  </button>

                  {/* Live stage timer (only for 'started' or 'delivery') */}
                  <div className="stage-timer" style={{marginLeft: 12}}>
                    {timerStage ? (
                      <strong>🕒 {timerStage.toUpperCase()} TIME: {elapsed || '00:00:00'}</strong>
                    ) : (
                      <span style={{opacity: 0.7}}>—</span>
                    )}
                  </div>
                </div>

                {/* Existing action blocks (kept) */}
                <div className="order-actions">
                  {order.status === 'pending' && (
                    <button
                      className="processing-btn"
                      onClick={() => handleProcessingStarted(order.id)}
                    >
                      Item Processing Started
                    </button>
                  )}

                  {order.status === 'processing' && (
                    <div className="processing-stage">
                      <div className="processing-notice">
                        📦 Item is being processed...
                        {hasWaitingPeriodExpired(order) && (
                          <div className="auto-refund-warning">
                            ⚠️ Processing time of 4 hours has expired
                          </div>
                        )}
                      </div>
                      <div className="processing-actions">
                        <button
                          className="delivery-success-btn"
                          onClick={() => handleItemDelivered(order.id)}
                        >
                          Item Has Been Delivered
                        </button>
                        <button
                          className="delivery-declined-btn"
                          onClick={() => handleOrderRejected(order.id)}
                        >
                          Rejected
                        </button>
                      </div>
                    </div>
                  )}

                  {order.status === 'delivered' && (
                    <div className="delivered-status">
                      ✅ Order Complete - Item Successfully Delivered
                    </div>
                  )}

                  {order.status === 'rejected' && (
                    <div className="rejected-status">
                      ❌ Order Rejected - Customer will receive refund within 24 hours
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-left">
          <img
            src="/slawn_shinto_logo.svg"
            alt="Slawn Shinto Logo"
            className="dashboard-logo"
          />
          <h1 className="dashboard-title">Slawn Shinto 神道 Admin</h1>
        </div>
        <button className="logout-button" onClick={handleLogout}>Logout</button>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          Items Approval ({items.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Order Fulfillment ({orders.length})
        </button>
      </div>

      {loading ? (
        <p className="loading">Loading data...</p>
      ) : (
        <>
          {activeTab === 'items' && renderItemsTab()}
          {activeTab === 'orders' && renderOrdersTab()}
        </>
      )}
    </div>
  );
};

export default Dashboard;