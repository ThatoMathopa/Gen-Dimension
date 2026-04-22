// ===========================
// Gen Dimension — Orders & PayFast
// ===========================

const ORDERS_API = 'backend/orders.php';

// ── PayFast Config ────────────────────────────────────────────────
const PAYFAST_CONFIG = {
  merchant_id:  '34464777',
  merchant_key: 'dlafzyubih35x',
  return_url:   'https://gendimension.co.za/index.html?payment=success',
  cancel_url:   'https://gendimension.co.za/index.html?payment=cancelled',
  notify_url:   'https://gendimension.co.za/backend/payfast-notify.php',
  sandbox:      true,
};

// ── Order Status ──────────────────────────────────────────────────
const STATUS_FLOW = ['new', 'processing', 'done'];

const STATUS_LABELS = {
  new:        'New',
  processing: 'Processing',
  done:       'Done',
};

const STATUS_COLORS = {
  new:        '#c9a84c',
  processing: '#2196f3',
  done:       '#4caf50',
};

function getNextStatus(current) {
  const idx = STATUS_FLOW.indexOf(current);
  return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
}

// ── Order Modal — state ───────────────────────────────────────────
let _cartMode              = false;
let _pendingOrderData      = null;
let _selectedPaymentMethod = null;
let currentOrderId         = null;

// ── Loading state helpers ─────────────────────────────────────────
function showLoadingState(msg) {
  const btn = document.getElementById('proceed-btn');
  if (btn) { btn.disabled = true; btn.textContent = msg || 'Processing…'; }
}

function hideLoadingState() {
  const btn = document.getElementById('proceed-btn');
  if (btn) { btn.disabled = false; btn.textContent = 'Proceed to Payment'; }
}

// ── Safe JSON fetch helper ────────────────────────────────────────
async function apiFetch(url, options = {}) {
  const res  = await fetch(url, options);
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch (_) {
    console.error(`[API] Non-JSON from ${url} (HTTP ${res.status}):\n`, text);
    return {
      ok: false,
      status: res.status,
      data: { error: `Server error (HTTP ${res.status}) — see browser console (F12)` },
    };
  }
}

// ── Submit order to backend API ───────────────────────────────────
async function submitOrder(orderData, paymentMethod) {
  showLoadingState('Placing your order\u2026');
  try {
    const { ok, data } = await apiFetch(ORDERS_API, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(orderData),
    });

    if (ok && data.success) {
      currentOrderId = data.orderId;
      sessionStorage.setItem('gd_pending_order_id', data.orderId);

      if (typeof clearCart === 'function')       clearCart();
      if (typeof updateCartBadge === 'function')  updateCartBadge();

      submitToPayFast(
        {
          id:            data.orderId,
          customerName:  orderData.customer.name,
          customerEmail: orderData.customer.email,
          productName:   orderData.items.length === 1
                           ? `${orderData.items[0].name} x${orderData.items[0].qty}`
                           : `Cart Order \u2014 ${orderData.items.length} items`,
          total:         orderData.total,
          items:         orderData.items,
        },
        paymentMethod
      );
    } else {
      alert('Order failed: ' + (data.error || 'Unknown error'));
      hideLoadingState();
    }
  } catch (e) {
    // Only reaches here on a total network failure (offline, DNS, CORS blocked)
    console.error('[Order] Network error:', e);
    alert(
      'Could not reach the server.\n\n' +
      'Check:\n' +
      '  \u2022 Files are uploaded to cPanel\n' +
      '  \u2022 PHP is enabled on the host\n' +
      '  \u2022 Database tables are created\n\n' +
      'Open browser console (F12) for the exact error.\n\n' +
      'Or WhatsApp: +27 79 879 6513'
    );
    hideLoadingState();
  }
}

// ── Open modal in cart-checkout mode ─────────────────────────────
function openCartCheckout() {
  const cart = (typeof getCart === 'function') ? getCart() : [];
  if (cart.length === 0) return;

  _cartMode              = true;
  _pendingOrderData      = null;
  _selectedPaymentMethod = null;

  document.getElementById('order-form').reset();
  renderModalCartSummary();
  showModalStep(1);
  document.getElementById('order-modal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function renderModalCartSummary() {
  const container = document.getElementById('modal-cart-summary');
  if (!container) return;

  const cart     = (typeof getCart === 'function') ? getCart() : [];
  const subtotal = (typeof getCartSubtotal === 'function') ? getCartSubtotal() : 0;

  container.innerHTML = `
    <div class="modal-cart-summary">
      ${cart.map((item) => `
        <div class="summary-row">
          <span>${item.name} &times; ${item.qty}</span>
          <span>R ${(item.price * item.qty).toLocaleString('en-ZA')}</span>
        </div>`).join('')}
      <div class="summary-divider"></div>
      <div class="summary-row summary-total-row">
        <span>Order Total (VAT incl.)</span>
        <strong>R ${subtotal.toLocaleString('en-ZA')}</strong>
      </div>
      <p class="fee-note">Price includes all fees. No hidden charges.</p>
    </div>`;
}

function closeOrderModal() {
  document.getElementById('order-modal').classList.remove('active');
  document.body.style.overflow = '';
  _cartMode              = false;
  _pendingOrderData      = null;
  _selectedPaymentMethod = null;
}

function showModalStep(step) {
  document.getElementById('modal-step-1').style.display = step === 1 ? '' : 'none';
  document.getElementById('modal-step-2').style.display = step === 2 ? '' : 'none';
  document.getElementById('step-dot-1').classList.toggle('active', step === 1);
  document.getElementById('step-dot-2').classList.toggle('active', step === 2);
}

// Step 1 submit → advance to step 2
function handleOrderSubmit(e) {
  e.preventDefault();

  const form     = e.target;
  const cart     = (typeof getCart === 'function') ? getCart() : [];
  const subtotal = (typeof getCartSubtotal === 'function') ? getCartSubtotal() : 0;

  if (!_cartMode || cart.length === 0) return;

  _pendingOrderData = {
    items:           cart.map((i) => ({ id: i.id, name: i.name, sub: i.sub, price: i.price, qty: i.qty })),
    productName:     cart.length === 1
                       ? `${cart[0].name} x${cart[0].qty}`
                       : `Cart Order — ${cart.length} items`,
    qty:             cart.reduce((s, i) => s + i.qty, 0),
    subtotal,
    customerName:    form['order-name'].value.trim(),
    customerEmail:   form['order-email'].value.trim(),
    customerPhone:   form['order-phone'].value.trim(),
    deliveryAddress: form['order-address'].value.trim(),
    notes:           form['order-notes'].value.trim(),
  };

  renderPaymentStep(_pendingOrderData);
  showModalStep(2);
}

// Step 2 — render payment options + order summary
function renderPaymentStep(data) {
  const step2 = document.getElementById('modal-step-2');

  const itemsHTML = data.items
    ? data.items.map((i) => `
        <div class="summary-row">
          <span>${i.name} &times; ${i.qty}</span>
          <span>R ${(i.price * i.qty).toLocaleString('en-ZA')}</span>
        </div>`).join('')
    : `<div class="summary-row"><span>${data.productName}</span><span>R ${data.subtotal.toLocaleString('en-ZA')}</span></div>`;

  step2.innerHTML = `
    <h3 class="step-heading">Order Summary</h3>
    <div class="order-summary">
      ${itemsHTML}
      <div class="summary-divider"></div>
      <div class="summary-row summary-total-row">
        <span>Order Total (VAT incl.)</span>
        <strong id="summary-total">R ${data.subtotal.toLocaleString('en-ZA')}</strong>
      </div>
      <p class="fee-note">Price includes all fees. No hidden charges.</p>
    </div>

    <h3 class="step-heading">Payment Method</h3>
    <div class="payment-methods">

      <div class="payment-card" data-method="card" onclick="selectPaymentMethod('card')">
        <div class="pm-left">
          <div class="pm-icons">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          </div>
          <div class="pm-info">
            <strong>Card / SnapScan</strong>
            <span>Secured by PayFast</span>
          </div>
        </div>
        <span class="pm-check">&#10003;</span>
      </div>

      <div class="payment-card" data-method="eft" onclick="selectPaymentMethod('eft')">
        <div class="pm-badge">Recommended for large orders</div>
        <div class="pm-left">
          <div class="pm-icons">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
          </div>
          <div class="pm-info">
            <strong>EFT / Instant EFT</strong>
            <span>Secured by PayFast</span>
          </div>
        </div>
        <span class="pm-check">&#10003;</span>
      </div>

    </div>

    <div class="terms-agree">
      <label class="terms-agree-label">
        <input type="checkbox" id="terms-checkbox" onchange="toggleProceedBtn()" />
        I agree to the <a href="terms.html" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</a>
      </label>
    </div>

    <div class="payment-actions">
      <button type="button" class="btn btn-outline" onclick="goToStep1()">&#8592; Back</button>
      <button type="button" class="btn btn-full" id="proceed-btn" onclick="proceedToPayment()" disabled>
        Proceed to Payment
      </button>
    </div>
  `;
}

function selectPaymentMethod(method) {
  _selectedPaymentMethod = method;

  document.querySelectorAll('.payment-card').forEach((c) =>
    c.classList.toggle('selected', c.dataset.method === method)
  );

  toggleProceedBtn();
}

function toggleProceedBtn() {
  const checked = document.getElementById('terms-checkbox')?.checked;
  const btn = document.getElementById('proceed-btn');
  if (btn) btn.disabled = !(_selectedPaymentMethod && checked);
}

function goToStep1() {
  showModalStep(1);
}

function proceedToPayment() {
  if (!_selectedPaymentMethod || !_pendingOrderData) return;

  const total = _pendingOrderData.subtotal;

  const orderData = {
    customer: {
      name:    _pendingOrderData.customerName,
      email:   _pendingOrderData.customerEmail,
      phone:   _pendingOrderData.customerPhone,
      address: _pendingOrderData.deliveryAddress,
      notes:   _pendingOrderData.notes,
    },
    items:         _pendingOrderData.items,
    total,
    paymentMethod: _selectedPaymentMethod,
  };

  submitOrder(orderData, _selectedPaymentMethod);
}

// ── PayFast Form Submission ───────────────────────────────────────
function submitToPayFast(order, paymentMethod) {
  const form  = document.createElement('form');
  form.method = 'POST';
  form.action = PAYFAST_CONFIG.sandbox
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process';

  const nameParts = (order.customerName || '').split(' ');

  const fields = {
    merchant_id:      PAYFAST_CONFIG.merchant_id,
    merchant_key:     PAYFAST_CONFIG.merchant_key,
    return_url:       PAYFAST_CONFIG.return_url,
    cancel_url:       PAYFAST_CONFIG.cancel_url,
    notify_url:       PAYFAST_CONFIG.notify_url,
    name_first:       nameParts[0] || '',
    name_last:        nameParts.slice(1).join(' ') || '-',
    email_address:    order.customerEmail,
    m_payment_id:     order.id,
    amount:           order.total.toFixed(2),
    item_name:        order.productName,
    item_description: 'Gen Dimension furniture order ' + order.id,
    payment_method:   paymentMethod === 'eft' ? 'eft' : '',
  };

  Object.entries(fields).forEach(([key, val]) => {
    const input = document.createElement('input');
    input.type  = 'hidden';
    input.name  = key;
    input.value = val;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

// ── Payment Return Handling ───────────────────────────────────────
function checkPaymentReturn() {
  const params  = new URLSearchParams(window.location.search);
  const payment = params.get('payment');
  if (!payment) return;

  window.history.replaceState({}, document.title, window.location.pathname);

  const orderId = sessionStorage.getItem('gd_pending_order_id');

  if (payment === 'success') {
    sessionStorage.removeItem('gd_pending_order_id');
    showPaymentBanner('success', orderId);
  } else if (payment === 'cancelled') {
    showPaymentBanner('cancelled', null);
  }
}

function showPaymentBanner(type, orderId) {
  if (type === 'success') {
    const banner = document.getElementById('payment-success-banner');
    const msg    = document.getElementById('payment-success-msg');
    if (!banner) return;
    if (msg) msg.textContent = `Payment received! Order ID: ${orderId}. We'll contact you within 24 hours.`;
    banner.style.display = 'flex';
    banner.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    const banner = document.getElementById('payment-cancel-banner');
    if (banner) {
      banner.style.display = 'flex';
      banner.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

// ── Order Success Toast ───────────────────────────────────────────
function showOrderSuccess(orderId) {
  const banner = document.getElementById('order-success-banner');
  if (!banner) return;
  banner.textContent = `Order ${orderId} placed! We'll be in touch.`;
  banner.classList.add('visible');
  setTimeout(() => banner.classList.remove('visible'), 5000);
}

// ── Init ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkPaymentReturn();

  const form = document.getElementById('order-form');
  if (form) form.addEventListener('submit', handleOrderSubmit);

  const closeBtn = document.getElementById('modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeOrderModal);

  const overlay = document.getElementById('order-modal');
  if (overlay) overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOrderModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeOrderModal();
  });
});
