// ===========================
// Gen Dimension — Auth & Account
// ===========================

const AUTH_API = 'backend/auth.php';
let currentUser = null;

// ── Auth Check ────────────────────────────────────────────────
async function checkAuth() {
  try {
    const token = localStorage.getItem('gd_token');
    if (!token) { updateNavForGuest(); return null; }
    const res = await fetch(AUTH_API + '?action=me', {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      updateNavForUser(data.user);
      prefillOrderForm(data.user);
      return data.user;
    } else {
      localStorage.removeItem('gd_token');
      updateNavForGuest();
      return null;
    }
  } catch (e) {
    updateNavForGuest();
    return null;
  }
}

// ── Nav rendering ─────────────────────────────────────────────
function updateNavForUser(user) {
  const authArea = document.getElementById('navAuthArea');
  if (!authArea) return;
  authArea.innerHTML = `
    <div class="nav-user-menu" id="navUserMenu">
      <button class="nav-user-btn" onclick="toggleUserMenu()">
        <div class="nav-avatar">${user.initials}</div>
        <span class="nav-user-name">${user.firstName}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
          <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
      <div class="nav-dropdown" id="navDropdown">
        <a onclick="showPage('account')">My Account</a>
        <a onclick="showPage('account');showTab('orders')">My Orders</a>
        <a onclick="showPage('account');showTab('wishlist')">Wishlist</a>
        <div class="nav-dropdown-divider"></div>
        <a onclick="logout()" class="nav-dropdown-logout">Sign Out</a>
      </div>
    </div>`;
}

function updateNavForGuest() {
  const authArea = document.getElementById('navAuthArea');
  if (!authArea) return;
  authArea.innerHTML = `
    <button class="nav-auth-btn" onclick="openAuthModal('login')">Sign In</button>
    <button class="btn nav-register-btn" onclick="openAuthModal('register')">Create Account</button>`;
}

function toggleUserMenu() {
  document.getElementById('navDropdown')?.classList.toggle('open');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('#navUserMenu')) {
    document.getElementById('navDropdown')?.classList.remove('open');
  }
});

// ── Order form prefill ────────────────────────────────────────
function prefillOrderForm(user) {
  if (!user) return;
  const fields = {
    'o-name':    (user.firstName || '') + ' ' + (user.lastName || ''),
    'o-email':   user.email || '',
    'o-phone':   user.phone || '',
    'o-address': user.address || '',
  };
  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && val.trim()) el.value = val.trim();
  });
  const prov = document.querySelector('[name="order-province"]');
  if (prov && user.province) {
    prov.value = user.province;
    onProvinceChange(prov);
  }
}

// ── Auth Modal ────────────────────────────────────────────────
function openAuthModal(tab = 'login') {
  document.getElementById('authModal')?.classList.add('open');
  switchAuthTab(tab);
}

function closeAuthModal() {
  document.getElementById('authModal')?.classList.remove('open');
  clearAuthForms();
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.auth-tab-pane').forEach(p =>
    p.classList.toggle('active', p.id === 'auth-' + tab));
  clearAuthMessages();
}

function clearAuthForms() {
  document.querySelectorAll('#authModal input').forEach(i => (i.value = ''));
  clearAuthMessages();
}

function clearAuthMessages() {
  document.querySelectorAll('.auth-msg').forEach(m => {
    m.textContent = '';
    m.className   = 'auth-msg';
  });
}

function showAuthMsg(paneId, msg, type = 'error') {
  const el = document.querySelector('#auth-' + paneId + ' .auth-msg');
  if (el) { el.textContent = msg; el.className = 'auth-msg ' + type; }
}

// ── Login ─────────────────────────────────────────────────────
async function submitLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const remember = document.getElementById('login-remember')?.checked;

  if (!email || !password) {
    showAuthMsg('login', 'Please enter your email and password.');
    return;
  }
  const btn = document.getElementById('loginBtn');
  btn.textContent = 'Signing in…'; btn.disabled = true;
  try {
    const res = await fetch(AUTH_API + '?action=login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password, remember }),
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('gd_token', data.token);
      currentUser = data.user;
      updateNavForUser(data.user);
      prefillOrderForm(data.user);
      closeAuthModal();
      showToast('Welcome back, ' + data.user.firstName + '!');
    } else {
      showAuthMsg('login', data.error || 'Login failed');
    }
  } catch (e) {
    showAuthMsg('login', 'Connection error. Please try again.');
  } finally {
    btn.textContent = 'Sign In'; btn.disabled = false;
  }
}

// ── Register ──────────────────────────────────────────────────
async function submitRegister() {
  const firstName = document.getElementById('reg-firstname').value.trim();
  const lastName  = document.getElementById('reg-lastname').value.trim();
  const email     = document.getElementById('reg-email').value.trim();
  const phone     = document.getElementById('reg-phone').value.trim();
  const password  = document.getElementById('reg-password').value;
  const confirm   = document.getElementById('reg-confirm').value;

  if (!firstName || !lastName || !email || !password) {
    showAuthMsg('register', 'Please fill in all required fields.');
    return;
  }
  if (password !== confirm) {
    showAuthMsg('register', 'Passwords do not match.');
    return;
  }
  if (password.length < 8) {
    showAuthMsg('register', 'Password must be at least 8 characters.');
    return;
  }
  const btn = document.getElementById('registerBtn');
  btn.textContent = 'Creating account…'; btn.disabled = true;
  try {
    const res = await fetch(AUTH_API + '?action=register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ firstName, lastName, email, phone, password }),
    });
    const data = await res.json();
    if (data.success) {
      showAuthMsg('register', 'Account created! Check your email to verify.', 'success');
      setTimeout(() => switchAuthTab('login'), 3000);
    } else {
      showAuthMsg('register', data.error || 'Registration failed');
    }
  } catch (e) {
    showAuthMsg('register', 'Connection error. Please try again.');
  } finally {
    btn.textContent = 'Create Account'; btn.disabled = false;
  }
}

// ── Forgot Password ───────────────────────────────────────────
async function submitForgotPassword() {
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) {
    showAuthMsg('forgot', 'Please enter your email address.');
    return;
  }
  const res = await fetch(AUTH_API + '?action=forgot-password', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email }),
  });
  const data = await res.json();
  showAuthMsg('forgot', data.message || 'Reset link sent!', 'success');
}

// ── Logout ────────────────────────────────────────────────────
async function logout() {
  const token = localStorage.getItem('gd_token');
  try {
    await fetch(AUTH_API + '?action=logout', {
      method:  'POST',
      headers: { 'Authorization': 'Bearer ' + token },
    });
  } catch (_) {}
  localStorage.removeItem('gd_token');
  currentUser = null;
  updateNavForGuest();
  showToast('You have been signed out.');
  if (typeof showPage === 'function') showPage('home');
}

// ── Wishlist ──────────────────────────────────────────────────
async function toggleWishlist(productId, productName, productPrice) {
  const token = localStorage.getItem('gd_token');
  if (!token) {
    openAuthModal('login');
    showToast('Please sign in to save to wishlist.');
    return;
  }
  const res = await fetch(AUTH_API + '?action=wishlist', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + token,
    },
    body: JSON.stringify({ productId, productName, productPrice }),
  });
  const data = await res.json();
  if (data.success) {
    showToast(productName + ' added to wishlist!');
    updateWishlistIcon(productId, true);
  } else {
    showToast(data.error || 'Could not add to wishlist.');
  }
}

function updateWishlistIcon(productId, saved) {
  const btn = document.querySelector(`[data-wishlist="${productId}"]`);
  if (btn) btn.classList.toggle('wishlisted', saved);
}

// ══════════════════════════════════════════════════════════════
// Account Page
// ══════════════════════════════════════════════════════════════

function showTab(tab) {
  document.querySelectorAll('.acct-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.acct-pane').forEach(p =>
    p.classList.toggle('active', p.id === 'acct-' + tab));
  if (tab === 'orders')   loadUserOrders();
  if (tab === 'wishlist') loadUserWishlist();
  if (tab === 'profile')  loadProfileForm();
  if (tab === 'overview') loadOverview();
}

async function loadAccountPage() {
  const user = await checkAuth();
  if (!user) {
    if (typeof showPage === 'function') showPage('home');
    openAuthModal('login');
    return;
  }
  const avatarEl = document.getElementById('accountAvatar');
  const nameEl   = document.getElementById('accountName');
  const emailEl  = document.getElementById('accountEmail');
  const sinceEl  = document.getElementById('accountSince');
  if (avatarEl) avatarEl.textContent = user.initials;
  if (nameEl)   nameEl.textContent   = user.firstName + ' ' + user.lastName;
  if (emailEl)  emailEl.textContent  = user.email;
  if (sinceEl)  sinceEl.textContent  = 'Member since ' + (user.memberSince || '');
  loadOverview();
}

async function loadOverview() {
  const token = localStorage.getItem('gd_token');
  if (!token) return;
  try {
    const [oRes, wRes] = await Promise.all([
      fetch(AUTH_API + '?action=orders',   { headers: { 'Authorization': 'Bearer ' + token } }),
      fetch(AUTH_API + '?action=wishlist', { headers: { 'Authorization': 'Bearer ' + token } }),
    ]);
    const orders   = await oRes.json();
    const wishlist = await wRes.json();
    const count = Array.isArray(orders) ? orders.length : 0;
    const spend = Array.isArray(orders)
      ? orders.reduce((s, o) => s + parseFloat(o.total || 0), 0)
      : 0;
    const wCount = Array.isArray(wishlist) ? wishlist.length : 0;

    const ocEl = document.getElementById('acctOrderCount');
    const spEl = document.getElementById('acctSpend');
    const wcEl = document.getElementById('acctWishCount');
    if (ocEl) ocEl.textContent = count;
    if (spEl) spEl.textContent = 'R\u00a0' + Math.round(spend).toLocaleString('en-ZA');
    if (wcEl) wcEl.textContent = wCount;
  } catch (_) {}
}

async function loadUserOrders() {
  const token = localStorage.getItem('gd_token');
  const el    = document.getElementById('userOrdersList');
  if (!el || !token) return;

  try {
    const res    = await fetch(AUTH_API + '?action=orders', {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    const orders = await res.json();

    if (!Array.isArray(orders) || !orders.length) {
      el.innerHTML = `<div style="text-align:center;color:var(--muted);padding:3rem;font-size:13px;">
        No orders yet. <a onclick="if(typeof showPage==='function')showPage('home')"
        style="color:var(--accent);cursor:pointer;">Shop now →</a></div>`;
      return;
    }

    el.innerHTML = orders.map(o => `
      <div class="user-order-card">
        <div class="uoc-top">
          <div>
            <div class="uoc-id">${o.id}</div>
            <div style="font-size:11px;color:var(--muted);">
              ${new Date(o.created_at).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
          <div>
            <span class="status-badge status-${o.status}">${o.status}</span>
            <span class="status-badge" style="margin-left:4px;
              background:${o.payment_status === 'paid' ? '#dcfce7' : '#fef9c3'};
              color:${o.payment_status === 'paid' ? '#166534' : '#854d0e'}">
              ${o.payment_status}
            </span>
          </div>
          <div class="uoc-total">R\u00a0${parseFloat(o.total).toLocaleString('en-ZA')}</div>
        </div>
        <div class="uoc-items">
          ${(o.items || []).map(i => `<span class="uoc-item">${i.name} &times;${i.qty}</span>`).join('')}
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:.5rem;">
          Delivery: ${o.delivery_province || 'Gauteng'} — R${parseFloat(o.delivery_fee || 150).toLocaleString('en-ZA')}
        </div>
      </div>`).join('');
  } catch (_) {
    el.innerHTML = '<div style="text-align:center;color:var(--muted);padding:2rem;">Could not load orders.</div>';
  }
}

async function loadUserWishlist() {
  const token = localStorage.getItem('gd_token');
  const el    = document.getElementById('userWishlist');
  if (!el || !token) return;

  try {
    const res   = await fetch(AUTH_API + '?action=wishlist', {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    const items = await res.json();

    if (!Array.isArray(items) || !items.length) {
      el.innerHTML = '<div style="text-align:center;color:var(--muted);padding:3rem;font-size:13px;">Your wishlist is empty.</div>';
      return;
    }

    el.innerHTML = '<div class="wish-grid">' + items.map(item => `
      <div class="wish-card">
        <div class="wish-name">${item.product_name}</div>
        <div class="wish-footer">
          <div class="wish-price">R\u00a0${parseFloat(item.product_price).toLocaleString('en-ZA')}</div>
          <div style="display:flex;gap:.5rem;">
            <button class="porder-btn" onclick="openOrderModal(${item.product_id})">Add to Cart</button>
            <button class="porder-btn porder-btn--remove"
              onclick="removeWishlistItem('${item.product_id}')">Remove</button>
          </div>
        </div>
      </div>`).join('') + '</div>';
  } catch (_) {
    el.innerHTML = '<div style="text-align:center;color:var(--muted);padding:2rem;">Could not load wishlist.</div>';
  }
}

async function removeWishlistItem(productId) {
  const token = localStorage.getItem('gd_token');
  if (!token) return;
  await fetch(AUTH_API + '?action=wishlist&productId=' + productId, {
    method:  'DELETE',
    headers: { 'Authorization': 'Bearer ' + token },
  });
  loadUserWishlist();
  showToast('Removed from wishlist.');
}

function loadProfileForm() {
  if (!currentUser) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('prof-firstname', currentUser.firstName);
  set('prof-lastname',  currentUser.lastName);
  set('prof-phone',     currentUser.phone);
  set('prof-address',   currentUser.address);
  set('prof-postal',    currentUser.postalCode);
  const provEl = document.getElementById('prof-province');
  if (provEl && currentUser.province) provEl.value = currentUser.province;
}

async function saveProfile() {
  const token = localStorage.getItem('gd_token');
  if (!token) return;
  const data = {
    firstName:  document.getElementById('prof-firstname')?.value.trim(),
    lastName:   document.getElementById('prof-lastname')?.value.trim(),
    phone:      document.getElementById('prof-phone')?.value.trim(),
    address:    document.getElementById('prof-address')?.value.trim(),
    province:   document.getElementById('prof-province')?.value,
    postalCode: document.getElementById('prof-postal')?.value.trim(),
  };
  const res    = await fetch(AUTH_API + '?action=profile', {
    method:  'PATCH',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + token,
    },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  const msg    = document.getElementById('profileMsg');
  if (result.success) {
    currentUser = { ...currentUser, ...data };
    if (msg) { msg.textContent = 'Profile updated successfully!'; msg.className = 'auth-msg success'; }
    updateNavForUser(currentUser);
    prefillOrderForm(currentUser);
  } else {
    if (msg) { msg.textContent = result.error || 'Update failed.'; msg.className = 'auth-msg error'; }
  }
}

// ── Initialise on load ────────────────────────────────────────
checkAuth();
