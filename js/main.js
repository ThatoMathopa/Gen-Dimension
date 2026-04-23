// ===========================
// Gen Dimension — Main Script
// ===========================

let products = [];

// ── Delivery fees by province ──────────────────────────────────
const DELIVERY_FEES = {
  'Gauteng':       150,
  'Western Cape':  450,
  'Eastern Cape':  450,
  'KwaZulu-Natal': 400,
  'Limpopo':       350,
  'Mpumalanga':    350,
  'North West':    350,
  'Free State':    350,
  'Northern Cape': 500,
};

function getDeliveryFee(province) {
  return DELIVERY_FEES[province] ?? 150;
}

function onProvinceChange(select) {
  const box = document.getElementById('courier-info-box');
  if (box) box.style.display = (select.value && select.value !== 'Gauteng') ? 'flex' : 'none';
}

async function loadProducts() {
  try {
    const { ok, data } = await gdFetch("backend/products.php");
    if (ok && Array.isArray(data)) {
      products = data.map(p => ({
        id:          p.id,
        name:        p.name,
        category:    p.category || "",
        price:       parseFloat(p.price),
        description: p.description || "",
        image:       p.image || `https://via.placeholder.com/400x300/2c2c2c/c9a84c?text=${encodeURIComponent(p.name)}`,
      }));
    }
  } catch (e) {
    console.error("[Products] Failed to load from API:", e);
  }
}

// ── Product Image Storage ──────────────────────────────────────
// Images are stored on the server (images/products/) and persisted
// in the products DB. localStorage is no longer used for images.

// ── Cart helpers ───────────────────────────────────────────────
function addToCartFromCard(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  addToCart(product);
  showAddToCartToast(product.name);
}

let _toastTimer = null;
function showAddToCartToast(productName) {
  const toast = document.getElementById("cart-toast");
  if (!toast) return;
  toast.textContent = `"${productName}" added to cart`;
  toast.classList.add("visible");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove("visible"), 2200);
}

// ── Cart Sidebar ───────────────────────────────────────────────
function openCartSidebar() {
  renderCartSidebar();
  document.getElementById("cart-sidebar").classList.add("open");
  document.getElementById("cart-overlay").classList.add("visible");
  document.body.style.overflow = "hidden";
}
function closeCartSidebar() {
  document.getElementById("cart-sidebar").classList.remove("open");
  document.getElementById("cart-overlay").classList.remove("visible");
  document.body.style.overflow = "";
}
function renderCartSidebar() {
  const body   = document.getElementById("cart-sidebar-body");
  const footer = document.getElementById("cart-sidebar-footer");
  if (!body || !footer) return;

  const cart     = getCart();
  const subtotal = getCartSubtotal();

  if (cart.length === 0) {
    body.innerHTML   = `<p class="cart-empty">Your cart is empty.</p>`;
    footer.innerHTML = `<div class="cart-totals"><span>Order Total (VAT incl.)</span><strong>R 0</strong></div><button class="btn btn-full" disabled>Checkout</button>`;
    return;
  }

  body.innerHTML = cart.map(item => `
    <div class="cart-item" id="cart-item-${item.id}">
      <div class="cart-item-info">
        <span class="cart-item-name">${item.name}</span>
        <span class="cart-item-sub">${item.sub}</span>
        <span class="cart-item-price">R ${item.price.toLocaleString("en-ZA")}</span>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" onclick="cartUpdateQty(${item.id}, -1)" aria-label="Decrease">&#8722;</button>
        <span class="cart-item-qty">${item.qty}</span>
        <button class="qty-btn" onclick="cartUpdateQty(${item.id}, 1)" aria-label="Increase">+</button>
        <button class="cart-item-remove" onclick="cartRemoveItem(${item.id})" aria-label="Remove">&times;</button>
      </div>
    </div>`).join("");

  footer.innerHTML = `
    <div class="cart-totals">
      <span>Products (${getCartCount()} item${getCartCount() !== 1 ? "s" : ""})</span>
      <strong>R ${subtotal.toLocaleString("en-ZA")}</strong>
    </div>
    <div class="cart-delivery-row">
      <span>Delivery</span>
      <span>From R150 (Gauteng)</span>
    </div>
    <p class="fee-note" style="text-align:center;">Exact delivery fee selected at checkout</p>
    <div id="moretyme-cart" class="moretyme-wrap"></div>
    <button class="btn btn-full" onclick="cartCheckout()">Checkout &#8594;</button>`;

  loadMoreTyme(subtotal, "moretyme-cart");
}
function cartUpdateQty(productId, delta) { updateQty(productId, delta); renderCartSidebar(); }
function cartRemoveItem(productId)       { removeFromCart(productId);   renderCartSidebar(); }
function cartCheckout() {
  closeCartSidebar();
  if (typeof openCartCheckout === "function") openCartCheckout();
}

// ── MoreTyme Widget ────────────────────────────────────────────
function loadMoreTyme(amount, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Remove any previously injected MoreTyme scripts
  document.querySelectorAll("script[data-moretyme]").forEach(s => s.remove());

  // Clear container so the widget re-renders fresh
  container.innerHTML = "";

  const script = document.createElement("script");
  script.src = "https://content.payfast.io/widgets/moretyme/widget.min.js?amount=" + Math.round(amount);
  script.async = true;
  script.setAttribute("data-moretyme", containerId);
  container.appendChild(script);
}

// ── Quick View ─────────────────────────────────────────────────
let _qvProduct = null;
let _qvQty     = 1;

function openQuickView(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  _qvProduct = product;
  _qvQty     = 1;

  const imgSrc = product.image;
  document.getElementById("qv-image-block").innerHTML = `<img src="${imgSrc}" alt="${product.name}" />`;
  document.getElementById("qv-category").textContent  = product.category;
  document.getElementById("qv-name").textContent      = product.name;
  document.getElementById("qv-price").textContent     = `R\u00a0${product.price.toLocaleString("en-ZA")}`;
  document.getElementById("qv-qty-val").textContent   = "1";

  loadMoreTyme(product.price, "moretyme-qv");

  // Reset swatches & qty
  document.querySelectorAll(".qv-swatch").forEach((s, i) => s.classList.toggle("active", i === 0));

  document.getElementById("quick-view-modal").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeQuickView() {
  document.getElementById("quick-view-modal").classList.remove("active");
  document.body.style.overflow = "";
  _qvProduct = null;
}

function initQuickView() {
  const modal = document.getElementById("quick-view-modal");
  if (!modal) return;

  document.getElementById("qv-close")?.addEventListener("click", closeQuickView);
  modal.addEventListener("click", e => { if (e.target === modal) closeQuickView(); });

  document.getElementById("qv-qty-minus")?.addEventListener("click", () => {
    _qvQty = Math.max(1, _qvQty - 1);
    document.getElementById("qv-qty-val").textContent = _qvQty;
  });
  document.getElementById("qv-qty-plus")?.addEventListener("click", () => {
    _qvQty = Math.min(10, _qvQty + 1);
    document.getElementById("qv-qty-val").textContent = _qvQty;
  });

  document.getElementById("qv-add-to-cart")?.addEventListener("click", () => {
    if (!_qvProduct) return;
    for (let i = 0; i < _qvQty; i++) addToCart(_qvProduct);
    showAddToCartToast(_qvProduct.name);
    closeQuickView();
  });

  document.querySelectorAll(".qv-swatch").forEach(s => {
    s.addEventListener("click", () => {
      document.querySelectorAll(".qv-swatch").forEach(x => x.classList.remove("active"));
      s.classList.add("active");
    });
  });

  document.getElementById("qv-wishlist")?.addEventListener("click", () => {
    if (_qvProduct) showAddToCartToast(_qvProduct.name + " saved to wishlist");
  });
}

// ── Scroll Animation (IntersectionObserver) ────────────────────
function initAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");

      // Animated underline for the about hero phrase
      if (entry.target.classList.contains("about-hero-headline")) {
        setTimeout(() => {
          entry.target.querySelector(".about-underline-phrase")?.classList.add("underline-active");
        }, 700);
      }

      observer.unobserve(entry.target);
    });
  }, { threshold: 0.15 });

  // Stagger siblings with matching data-animate inside same parent
  const parents = new Set();
  document.querySelectorAll("[data-animate]").forEach(el => {
    parents.add(el.parentElement);
    observer.observe(el);
  });

  parents.forEach(parent => {
    const children = [...parent.querySelectorAll(":scope > [data-animate]")];
    if (children.length > 1) {
      children.forEach((child, i) => {
        child.style.transitionDelay = `${i * 0.1}s`;
      });
    }
  });
}

// ── Hero headline word-by-word ─────────────────────────────────
function initHeroAnimation() {
  document.querySelectorAll(".hero-word").forEach((word, i) => {
    word.style.animationDelay = `${0.1 + i * 0.18}s`;
  });
}

// ── Count-up counters ──────────────────────────────────────────
function initCounters() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el       = entry.target;
      const target   = parseFloat(el.dataset.count);
      const suffix   = el.dataset.suffix || "";
      const duration = 2000;
      const start    = Date.now();

      const tick = () => {
        const elapsed  = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const current  = Math.round(eased * target);
        el.textContent = current.toLocaleString("en-ZA") + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  document.querySelectorAll("[data-count]").forEach(el => observer.observe(el));
}

// ── Parallax ───────────────────────────────────────────────────
function initParallax() {
  let ticking = false;

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const scrollY = window.scrollY;

      // Hero panel
      const heroPanel = document.querySelector(".hero-panel-inner");
      if (heroPanel) {
        heroPanel.style.backgroundPositionY = `calc(50% + ${scrollY * 0.4}px)`;
      }

      // About hero
      const aboutHero = document.querySelector(".about-hero");
      if (aboutHero) {
        const top = aboutHero.getBoundingClientRect().top + scrollY;
        aboutHero.style.backgroundPositionY = `${(scrollY - top) * 0.3}px`;
      }

      // Section numbers
      document.querySelectorAll(".section-num-bg").forEach(el => {
        const top = el.closest("section")?.getBoundingClientRect().top ?? 0;
        el.style.transform = `translateY(calc(-50% + ${-top * 0.15}px))`;
      });

      ticking = false;
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
}

// ── Progress Bar ───────────────────────────────────────────────
function initProgressBar() {
  const bar = document.getElementById("progress-bar");
  if (!bar) return;
  window.addEventListener("scroll", () => {
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (docH > 0 ? (window.scrollY / docH) * 100 : 0) + "%";
  }, { passive: true });
}

// ── Back to Top ────────────────────────────────────────────────
function initBackToTop() {
  const btn = document.getElementById("back-to-top");
  if (!btn) return;
  window.addEventListener("scroll", () => {
    btn.classList.toggle("visible", window.scrollY > 400);
  }, { passive: true });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

// ── Custom Cursor ──────────────────────────────────────────────
function initCustomCursor() {
  const dot  = document.getElementById("cursor-dot");
  const ring = document.getElementById("cursor-ring");
  if (!dot || !ring) return;
  if (window.matchMedia("(hover: none)").matches) return;

  document.body.classList.add("has-cursor");

  document.addEventListener("mousemove", e => {
    const x = e.clientX, y = e.clientY;
    dot.style.cssText  += `left:${x}px;top:${y}px`;
    ring.style.cssText += `left:${x}px;top:${y}px`;
  });

  document.addEventListener("mouseover", e => {
    ring.classList.toggle("cursor-expand", !!e.target.closest("a, button, [role='button'], .product-card, .qv-swatch"));
  });
}

// ── Cookie Consent ─────────────────────────────────────────────
function initCookieConsent() {
  const banner = document.getElementById("cookie-banner");
  if (!banner || localStorage.getItem("gd_cookie")) return;

  setTimeout(() => { banner.style.display = "flex"; }, 1800);

  document.getElementById("cookie-accept")?.addEventListener("click", () => {
    localStorage.setItem("gd_cookie", "accepted");
    banner.style.display = "none";
  });
  document.getElementById("cookie-decline")?.addEventListener("click", () => {
    localStorage.setItem("gd_cookie", "declined");
    banner.style.display = "none";
  });
}

// ── Newsletter ─────────────────────────────────────────────────
function showNewsletterSuccess() {
  const form    = document.getElementById("newsletter-form");
  const success = document.getElementById("newsletter-success");
  if (form)    form.style.display    = "none";
  if (success) success.style.display = "block";
}

function showNewsletterError(msg) {
  const input = document.getElementById("newsletter-email");
  if (input) {
    input.setCustomValidity(msg);
    input.reportValidity();
  }
}

// ── Safe JSON fetch (shared helper) ───────────────────────────
async function gdFetch(url, options = {}) {
  const res  = await fetch(url, options);
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch (_) {
    console.error(`[API] Non-JSON from ${url} (HTTP ${res.status}):\n`, text);
    return {
      ok: false,
      status: res.status,
      data: { error: `Server error (HTTP ${res.status}) — open F12 console for details` },
    };
  }
}

async function submitNewsletter(email) {
  try {
    const { ok, data } = await gdFetch("backend/newsletter.php", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email }),
    });
    if (ok && data.success) {
      showNewsletterSuccess();
    } else {
      showNewsletterError(data.error || "Something went wrong. Please try again.");
    }
  } catch (e) {
    console.error("[Newsletter] Network error:", e);
    showNewsletterError("Could not connect. Check server setup or try again later.");
  }
}

function initNewsletter() {
  const form = document.getElementById("newsletter-form");
  if (!form) return;

  form.addEventListener("submit", e => {
    e.preventDefault();
    const input = document.getElementById("newsletter-email");
    const email = input?.value.trim() || "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      input.setCustomValidity("Please enter a valid email address.");
      input.reportValidity();
      return;
    }
    input.setCustomValidity("");
    submitNewsletter(email);
  });
}

// ── Product Filter Bar ─────────────────────────────────────────
let _activeFilter = "All";

function renderFilterBar() {
  const section = document.getElementById("products");
  if (!section || document.getElementById("product-filter-bar")) return;

  const categories = ["All", ...new Set(products.map(p => p.category).filter(Boolean))];

  const bar = document.createElement("div");
  bar.className = "filter-bar";
  bar.id = "product-filter-bar";
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", "Filter products by category");

  bar.innerHTML = categories.map(cat => `
    <button
      data-filter="${cat}"
      class="filter-btn${cat === _activeFilter ? " active" : ""}"
      aria-pressed="${cat === _activeFilter}"
    >${cat}</button>`
  ).join("");

  bar.addEventListener("click", e => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    _activeFilter = btn.dataset.filter;
    bar.querySelectorAll("[data-filter]").forEach(b => {
      b.classList.toggle("active", b.dataset.filter === _activeFilter);
      b.setAttribute("aria-pressed", b.dataset.filter === _activeFilter);
    });
    renderProducts();
  });

  const grid = document.getElementById("product-grid");
  if (grid) section.insertBefore(bar, grid);
}

// ── Render Products ────────────────────────────────────────────
function renderProducts() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  const filtered = _activeFilter === "All"
    ? products
    : products.filter(p => p.category === _activeFilter);

  if (filtered.length === 0) {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--muted);padding:3rem 0">No products found in this category.</p>`;
    return;
  }

  grid.innerHTML = filtered.map((p, idx) => {
    const imgSrc = p.image;

    return `
      <div class="product-card" data-animate="fade-up" style="transition-delay:${idx * 0.07}s">
        <div class="product-card-img-wrap">
          <img src="${imgSrc}" alt="${p.name}" loading="lazy" />
          <div class="product-card-overlay">
            <button class="btn-quick-view" onclick="openQuickView(${p.id})">Quick View</button>
          </div>
        </div>
        <div class="card-body">
          <h3>${p.name}</h3>
          <p class="price">R\u00a0${p.price.toLocaleString("en-ZA")}</p>
          <p class="card-moretyme">or 3&nbsp;&times;&nbsp;R${Math.ceil(p.price / 3).toLocaleString("en-ZA")} with <img src="images/moretyme/x1/PayFast&Moretyme_Logo_OnLightBackground.png" alt="MoreTyme" class="moretyme-inline-logo" /></p>
          <p class="card-delivery-note">Delivery info at checkout</p>
          <p>${p.description}</p>
          <button class="btn btn-add-cart" onclick="addToCartFromCard(${p.id})">Add to Cart</button>
        </div>
      </div>`;
  }).join("");

  // Re-observe new cards for animation
  if (typeof initAnimations === "function") {
    grid.querySelectorAll("[data-animate]").forEach(el => {
      el.classList.remove("is-visible");
    });
    setTimeout(() => {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) { entry.target.classList.add("is-visible"); obs.unobserve(entry.target); }
        });
      }, { threshold: 0.1 });
      grid.querySelectorAll("[data-animate]").forEach(el => obs.observe(el));
    }, 50);
  }
}

// ── Admin: Product Image Upload Cards ─────────────────────────
function renderProductImageCards() {
  const container = document.getElementById("product-img-grid");
  if (!container) return;

  container.innerHTML = products.map(p => {
    const hasImg = !!(p.image && !p.image.includes('placeholder.com'));
    return `
      <div class="product-img-card" id="img-card-${p.id}">
        <img id="img-preview-${p.id}" src="${p.image}" alt="${p.name}" />
        <div class="product-img-card-body">
          <strong title="${p.name}">${p.name}</strong>
          <div class="product-img-actions">
            <label class="btn-upload" id="upload-label-${p.id}" for="img-file-${p.id}">&#128247; Upload</label>
            <input type="file" id="img-file-${p.id}" accept="image/*" style="display:none" onchange="handleImageUpload(event, ${p.id})" />
            ${hasImg
              ? `<button class="btn-remove-img" id="remove-btn-${p.id}" onclick="handleRemoveImage(${p.id})">Remove</button>`
              : `<span id="remove-btn-${p.id}"></span>`
            }
          </div>
          <div class="img-size-warning" id="img-warn-${p.id}" style="display:none">File too large. Max 5MB.</div>
        </div>
      </div>`;
  }).join("");
}

async function handleImageUpload(event, productId) {
  const file = event.target.files[0];
  if (!file) return;

  const warn  = document.getElementById(`img-warn-${productId}`);
  const label = document.getElementById(`upload-label-${productId}`);

  if (file.size > 5 * 1024 * 1024) {
    if (warn) warn.style.display = "block";
    event.target.value = "";
    return;
  }
  if (warn) warn.style.display = "none";

  // Show local preview immediately while uploading
  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById(`img-preview-${productId}`);
    if (preview) preview.src = e.target.result;
  };
  reader.readAsDataURL(file);

  if (label) label.textContent = "⏳ Uploading…";

  const formData = new FormData();
  formData.append("product_id", productId);
  formData.append("image", file);

  try {
    const { ok, data } = await gdFetch("backend/upload-image.php", {
      method: "POST",
      body:   formData,
    });

    if (ok && data.url) {
      // Update in-memory product so all renders use the server URL
      const p = products.find(p => p.id === productId);
      if (p) p.image = data.url;
      if (label) label.textContent = "&#128247; Upload";
      const slot = document.getElementById(`remove-btn-${productId}`);
      if (slot) slot.outerHTML = `<button class="btn-remove-img" id="remove-btn-${productId}" onclick="handleRemoveImage(${productId})">Remove</button>`;
    } else {
      alert("Image upload failed: " + (data?.error || "Unknown error"));
      if (label) label.textContent = "&#128247; Upload";
    }
  } catch (err) {
    console.error("[Upload] Error:", err);
    alert("Upload failed. Check server connection.");
    if (label) label.textContent = "&#128247; Upload";
  }

  event.target.value = "";
}

async function handleRemoveImage(productId) {
  const product = products.find(p => p.id === productId);

  try {
    await gdFetch("backend/upload-image.php", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ product_id: productId }),
    });
  } catch (_) {}

  if (product) {
    product.image = `https://via.placeholder.com/400x300/2c2c2c/c9a84c?text=${encodeURIComponent(product.name)}`;
  }
  const preview = document.getElementById(`img-preview-${productId}`);
  if (preview && product) preview.src = product.image;
  const btn = document.getElementById(`remove-btn-${productId}`);
  if (btn) btn.outerHTML = `<span id="remove-btn-${productId}"></span>`;
}

async function handleAddProduct(e) {
  e.preventDefault();
  const form = e.target;
  const name = form["product-name"].value.trim();

  try {
    const { ok, data } = await gdFetch("backend/products.php", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        name,
        category:    form["product-category"]?.value || "",
        price:       parseFloat(form["product-price"].value),
        description: form["product-description"].value.trim(),
        image:       form["product-image"]?.value.trim() || "",
      }),
    });
    if (ok && data.success) {
      await loadProducts();
      form.reset();
      renderProductImageCards();
      showToast(`"${name}" added.`);
    } else {
      alert("Failed to add product: " + (data.error || "Unknown error"));
    }
  } catch (err) {
    console.error("[Admin] Add product error:", err);
    alert("Network error. Check server connection.");
  }
}

// ── PayFast Checkout ───────────────────────────────────────────
const PAYFAST_MERCHANT_ID  = "34464777";
const PAYFAST_MERCHANT_KEY = "dlafzyubih35x";
const PAYFAST_URL          = "https://www.payfast.co.za/eng/process";

function openCartCheckout() {
  const cart = getCart();
  if (!cart.length) return;

  // Populate cart summary in modal
  const summary = document.getElementById("modal-cart-summary");
  if (summary) {
    summary.innerHTML = `
      <div class="order-summary-box">
        <div class="order-summary-title">Order Summary</div>
        ${cart.map(i => `
          <div class="order-summary-row">
            <span>${i.name} &times; ${i.qty}</span>
            <span>R&nbsp;${(i.price * i.qty).toLocaleString("en-ZA")}</span>
          </div>`).join("")}
        <div class="order-summary-row order-delivery-row">
          <span>Delivery</span>
          <span>Selected below</span>
        </div>
        <div class="order-summary-total">
          <span>Total (incl. delivery)</span>
          <strong id="modal-summary-total">R&nbsp;${getCartSubtotal().toLocaleString("en-ZA")}</strong>
        </div>
        <p class="fee-note" style="text-align:center;">Final total shown after selecting province</p>
      </div>
      <div class="modal-moretyme-box">
        <img src="images/moretyme/x1/PayFast&Moretyme_Logo_OnLightBackground.png" alt="MoreTyme" class="modal-moretyme-logo" />
        <p class="modal-moretyme-text">Split your payment into 3 equal instalments at no extra cost. Available at checkout via PayFast.</p>
        <p class="modal-moretyme-amount">3&nbsp;&times;&nbsp;<strong>R&nbsp;${Math.ceil(getCartSubtotal() / 3).toLocaleString("en-ZA")}</strong></p>
      </div>`;
  }

  // Show step 1
  document.getElementById("modal-step-1").style.display  = "";
  document.getElementById("modal-step-2").style.display  = "none";
  document.getElementById("step-dot-1").classList.add("active");
  document.getElementById("step-dot-2").classList.remove("active");

  const modal = document.getElementById("order-modal");
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function closeOrderModal() {
  const modal = document.getElementById("order-modal");
  if (modal) { modal.classList.remove("active"); document.body.style.overflow = ""; }
}

function buildPayFastForm(orderId, amount, customer, province) {
  const returnUrl = `${location.origin}/?payment=success&order_id=${encodeURIComponent(orderId)}`;
  const cancelUrl = `${location.origin}/?payment=cancel&order_id=${encodeURIComponent(orderId)}`;
  const notifyUrl = `${location.origin}/backend/payfast-notify.php`;

  const nameParts  = customer.name.trim().split(" ");
  const firstName  = nameParts[0] || customer.name;
  const lastName   = nameParts.slice(1).join(" ") || "-";

  const cart       = getCart();
  const itemDesc   = cart.map(i => `${i.name} x${i.qty}`).join(", ").substring(0, 255);

  const fields = {
    merchant_id:    PAYFAST_MERCHANT_ID,
    merchant_key:   PAYFAST_MERCHANT_KEY,
    return_url:     returnUrl,
    cancel_url:     cancelUrl,
    notify_url:     notifyUrl,
    name_first:     firstName,
    name_last:      lastName,
    email_address:  customer.email,
    m_payment_id:   orderId,
    amount:         parseFloat(amount).toFixed(2),
    item_name:      `Gen Dimension Order + Delivery`,
    item_description: itemDesc,
  };

  const form = document.createElement("form");
  form.method  = "POST";
  form.action  = PAYFAST_URL;
  form.style.display = "none";

  Object.entries(fields).forEach(([key, val]) => {
    const input   = document.createElement("input");
    input.type    = "hidden";
    input.name    = key;
    input.value   = val;
    form.appendChild(input);
  });

  return form;
}

async function submitOrderAndPay(e) {
  e.preventDefault();
  const form        = document.getElementById("order-form");
  const btn         = form?.querySelector('[type="submit"]');
  const cart        = getCart();
  const productTotal = getCartSubtotal();

  if (!cart.length) { alert("Your cart is empty."); return; }

  const name     = form["order-name"].value.trim();
  const email    = form["order-email"].value.trim();
  const phone    = form["order-phone"].value.trim();
  const address  = form["order-address"].value.trim();
  const province = form["order-province"]?.value || "";
  const notes    = form["order-notes"].value.trim();

  if (!name || !email || !phone || !address) {
    alert("Please fill in all required fields."); return;
  }
  if (!province) {
    alert("Please select your delivery province."); return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert("Please enter a valid email address."); return;
  }

  const deliveryFee = getDeliveryFee(province);
  const grandTotal  = productTotal + deliveryFee;

  if (btn) { btn.disabled = true; btn.textContent = "Processing…"; }

  try {
    const { ok, data } = await gdFetch("backend/orders.php", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        customer: { name, email, phone, address, notes },
        items:    cart.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
        total:           grandTotal,
        productSubtotal: productTotal,
        deliveryFee:     deliveryFee,
        deliveryProvince: province,
        paymentMethod:   "payfast",
      }),
    });

    if (!ok || !data.orderId) {
      alert("Could not place order: " + (data.error || "Unknown error."));
      if (btn) { btn.disabled = false; btn.textContent = "Continue to Payment →"; }
      return;
    }

    const orderId = data.orderId;

    // Show step 2 — payment confirmation
    document.getElementById("modal-step-1").style.display = "none";
    document.getElementById("modal-step-2").style.display = "";
    document.getElementById("step-dot-1").classList.remove("active");
    document.getElementById("step-dot-2").classList.add("active");

    const isOutside = province !== "Gauteng";
    document.getElementById("modal-step-2").innerHTML = `
      <div style="text-align:center;padding:1.5rem 0;">
        <div style="font-size:2rem;margin-bottom:0.5rem;">🔒</div>
        <h3 style="margin-bottom:0.75rem;">Order ${orderId} confirmed</h3>
        <div class="confirm-breakdown">
          <div class="confirm-row"><span>Products</span><span>R&nbsp;${productTotal.toLocaleString("en-ZA")}</span></div>
          <div class="confirm-row"><span>Delivery (${province})</span><span>R&nbsp;${deliveryFee.toLocaleString("en-ZA")}</span></div>
          <div class="confirm-divider"></div>
          <div class="confirm-row confirm-total"><span>Total</span><strong>R&nbsp;${grandTotal.toLocaleString("en-ZA")}</strong></div>
          ${isOutside ? `<p class="confirm-courier">Shipped via The Courier Guy · tracking sent by email &amp; WhatsApp</p>` : ""}
        </div>
        <button id="pay-now-btn" class="btn btn-full" style="max-width:320px;margin-top:1.25rem;">
          Pay R&nbsp;${grandTotal.toLocaleString("en-ZA")} via PayFast &#8594;
        </button>
        <p style="font-size:0.75rem;color:var(--muted);margin-top:1rem;">
          Secured by <strong>PayFast</strong> — card, EFT, MoreTyme &amp; more
        </p>
      </div>`;

    clearCart();
    updateCartBadge();

    document.getElementById("pay-now-btn").addEventListener("click", () => {
      const pfForm = buildPayFastForm(orderId, grandTotal, { name, email }, province);
      document.body.appendChild(pfForm);
      pfForm.submit();
    });

  } catch (err) {
    console.error("[Checkout] Error:", err);
    alert("Network error. Please try again or WhatsApp us: +27 79 879 6513");
    if (btn) { btn.disabled = false; btn.textContent = "Continue to Payment →"; }
  }
}

// ── MoreTyme sticky banner ─────────────────────────────────────
function closeMoretymeBanner() {
  const el = document.getElementById('moretyme-sticky-banner');
  if (el) el.style.display = 'none';
  try { sessionStorage.setItem('gd_mt_banner_closed', '1'); } catch (_) {}
}

function initMoretymeStickyBanner() {
  const el = document.getElementById('moretyme-sticky-banner');
  if (!el) return;

  // Stay closed if dismissed this session
  try { if (sessionStorage.getItem('gd_mt_banner_closed')) { el.style.display = 'none'; return; } } catch (_) {}

  // Hide once user has scrolled to / past the checkout section
  const modal = document.getElementById('order-modal');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) el.style.display = 'none'; });
  }, { threshold: 0.1 });
  if (modal) observer.observe(modal);
}

function initPaymentReturnBanners() {
  const params = new URLSearchParams(location.search);
  const status = params.get("payment");
  if (!status) return;

  if (status === "success") {
    const orderId = params.get("order_id") || "";
    const el      = document.getElementById("payment-success-banner");
    const msg     = document.getElementById("payment-success-msg");
    if (el && msg) {
      msg.textContent = `Payment received! Your order ${orderId} is confirmed. Check your email for details.`;
      el.style.display = "flex";
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    history.replaceState({}, "", location.pathname);
  }

  if (status === "cancel") {
    const el = document.getElementById("payment-cancel-banner");
    if (el) {
      el.style.display = "flex";
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    history.replaceState({}, "", location.pathname);
  }
}

// ── Contact Form ───────────────────────────────────────────────
async function submitContact() {
  const form    = document.getElementById("contact-form");
  const name    = form?.querySelector('[name="name"]')?.value.trim()    || "";
  const email   = form?.querySelector('[name="email"]')?.value.trim()   || "";
  const message = form?.querySelector('[name="message"]')?.value.trim() || "";

  if (!name || !email || !message) {
    alert("Please fill in name, email and message.");
    return;
  }

  try {
    const { ok, data } = await gdFetch("backend/contact.php", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, email, message }),
    });
    if (ok && data.success) {
      form.reset();
      showToast("Message sent! We will reply within 24 hours.");
    } else {
      alert("Could not send: " + (data.error || "Unknown error"));
    }
  } catch (e) {
    console.error("[Contact] Network error:", e);
    alert("Could not connect to server.\n\nOr WhatsApp us: +27 79 879 6513");
  }
}

function initContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  form.addEventListener("submit", e => {
    e.preventDefault();
    submitContact();
  });
}

// ── Toast helper (used by contact + orders) ─────────────────────
function showToast(msg) {
  const toast = document.getElementById("cart-toast") || document.getElementById("admin-toast");
  if (!toast) { alert(msg); return; }
  toast.textContent = msg;
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), 4000);
}

// ── Footer ────────────────────────────────────────────────────
function initFooter() {
  // Category filter links — scroll to #products then activate the right filter button
  document.querySelectorAll("[data-filter-category]").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const category = link.dataset.filterCategory;
      const productsSection = document.getElementById("products");
      if (productsSection) {
        productsSection.scrollIntoView({ behavior: "smooth" });
        // After scroll settles, activate the matching filter button
        setTimeout(() => {
          const btn = [...document.querySelectorAll("#product-filter-bar [data-filter]")]
            .find(b => b.dataset.filter === category || b.textContent.trim() === category);
          if (btn) btn.click();
        }, 650);
      }
    });
  });

  // Mobile footer accordion
  document.querySelectorAll(".footer-accordion-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const content = btn.closest(".footer-col")?.querySelector(".footer-accordion-content");
      if (!content) return;
      const isOpen = content.classList.toggle("open");
      btn.classList.toggle("open", isOpen);
      btn.setAttribute("aria-expanded", isOpen);
    });
  });
}

const LEGAL_CONTENT = {
  privacy: {
    title: "Privacy Policy",
    body: `<p>Last updated: January 2025.</p>
<p>Gen Dimension ("we", "us", or "our") is committed to protecting your personal information. This policy explains what data we collect, how we use it, and your rights.</p>
<p><strong>Information we collect:</strong> When you place an order or contact us, we collect your name, email address, phone number, and delivery address. We also collect non-personal browsing data via cookies.</p>
<p><strong>How we use your data:</strong> To process and deliver your order, communicate with you about your purchase, and improve our website. We do not sell your data to third parties.</p>
<p><strong>Cookies:</strong> We use essential cookies to improve your experience. You may decline non-essential cookies via the cookie banner.</p>
<p><strong>Your rights:</strong> You may request access to, correction of, or deletion of your personal data at any time by emailing info@gendimension.co.za.</p>
<p><strong>Contact:</strong> For any privacy concerns, email us at info@gendimension.co.za.</p>`
  },
  terms: {
    title: "Terms of Service",
    body: `<p>Last updated: January 2025.</p>
<p>By using the Gen Dimension website and placing an order, you agree to the following terms.</p>
<p><strong>Orders:</strong> All orders are subject to availability. We reserve the right to cancel an order if an item becomes unavailable, in which case a full refund will be issued.</p>
<p><strong>Pricing:</strong> All prices are listed in South African Rand (ZAR) and include VAT. Prices are subject to change without notice.</p>
<p><strong>Delivery:</strong> We deliver across South Africa from Clayville, Gauteng. Delivery times and fees vary by location and will be confirmed at checkout.</p>
<p><strong>Returns:</strong> If your item arrives damaged or defective, contact us within 7 days of delivery at info@gendimension.co.za with photos. We will arrange a replacement or refund.</p>
<p><strong>Limitation of liability:</strong> Gen Dimension is not liable for indirect or consequential losses arising from use of our products beyond the purchase price paid.</p>
<p><strong>Contact:</strong> info@gendimension.co.za | +27 79 879 6513</p>`
  }
};

function openLegalModal(type) {
  const modal = document.getElementById("legal-modal");
  const content = LEGAL_CONTENT[type];
  if (!modal || !content) return;
  document.getElementById("legal-modal-title").textContent = content.title;
  document.getElementById("legal-modal-body").innerHTML = content.body;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeLegalModal() {
  const modal = document.getElementById("legal-modal");
  if (modal) modal.style.display = "none";
  document.body.style.overflow = "";
}

// ── Init ───────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();

  // Cart
  document.getElementById("cart-btn")?.addEventListener("click", openCartSidebar);
  document.getElementById("cart-overlay")?.addEventListener("click", closeCartSidebar);
  document.getElementById("cart-close")?.addEventListener("click", closeCartSidebar);

  // Global Escape key
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { closeQuickView(); closeCartSidebar(); closeLegalModal(); closeOrderModal(); }
  });

  // Hamburger
  const hamburgerBtn = document.getElementById("hamburger-btn");
  const mobileNav    = document.getElementById("mobile-nav");
  if (hamburgerBtn && mobileNav) {
    hamburgerBtn.addEventListener("click", () => {
      const open = mobileNav.classList.toggle("open");
      hamburgerBtn.classList.toggle("open", open);
      hamburgerBtn.setAttribute("aria-expanded", open);
      mobileNav.setAttribute("aria-hidden", !open);
    });
    mobileNav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        mobileNav.classList.remove("open");
        hamburgerBtn.classList.remove("open");
        hamburgerBtn.setAttribute("aria-expanded", "false");
        mobileNav.setAttribute("aria-hidden", "true");
      });
    });
  }

  initHeroAnimation();
  initCounters();
  initParallax();
  initProgressBar();
  initBackToTop();
  initCustomCursor();
  initCookieConsent();
  initQuickView();
  initNewsletter();
  initContactForm();
  initFooter();
  initPaymentReturnBanners();
  initMoretymeStickyBanner();

  // Order modal
  document.getElementById("order-form")?.addEventListener("submit", submitOrderAndPay);
  document.getElementById("modal-close")?.addEventListener("click", closeOrderModal);
  document.getElementById("order-modal")?.addEventListener("click", e => {
    if (e.target === e.currentTarget) closeOrderModal();
  });

  // Legal modal backdrop click
  document.getElementById("legal-modal")?.addEventListener("click", e => {
    if (e.target === e.currentTarget) closeLegalModal();
  });

  // Load products from API, then render anything that depends on them
  loadProducts().then(() => {
    renderFilterBar();
    renderProducts();
    renderProductImageCards();
    initAnimations(); // needs product cards in DOM first

    const addForm = document.getElementById("add-product-form");
    if (addForm) addForm.addEventListener("submit", handleAddProduct);
  });

  // Register Service Worker for PWA / offline support
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW unavailable in dev / file:// — silently ignore
    });
  }
});
