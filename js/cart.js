// ===========================
// Gen Dimension — Cart
// ===========================

const CART_KEY = "gd_cart";

// ── Persistence ───────────────────────────────────────────────
function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  updateCartBadge();
}

// ── Read ──────────────────────────────────────────────────────
function getCart()         { return loadCart(); }
function getCartCount()    { return loadCart().reduce((s, i) => s + i.qty, 0); }
function getCartSubtotal() { return loadCart().reduce((s, i) => s + i.price * i.qty, 0); }

// ── Write ─────────────────────────────────────────────────────
function addToCart(product) {
  const cart = loadCart();
  const existing = cart.find(i => i.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id:    product.id,
      name:  product.name,
      sub:   product.category || "",
      price: product.price,
      qty:   1,
    });
  }
  saveCart(cart);
}

function removeFromCart(productId) {
  saveCart(loadCart().filter(i => i.id !== productId));
}

function updateQty(productId, delta) {
  const cart = loadCart();
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty = Math.max(0, item.qty + delta);
  saveCart(item.qty === 0 ? cart.filter(i => i.id !== productId) : cart);
}

function clearCart() { saveCart([]); }

// ── Badge ─────────────────────────────────────────────────────
function updateCartBadge() {
  const count = getCartCount();
  const badge = document.getElementById("cart-badge");
  if (badge) {
    badge.textContent    = count;
    badge.style.display  = count > 0 ? "flex" : "none";
  }
}
