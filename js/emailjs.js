// ===========================
// Gen Dimension — EmailJS
// cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js
// ===========================

// Create a second template in EmailJS dashboard for customer confirmations.
// Subject: "Your Gen Dimension Order {{order_id}} is Confirmed"
// Variables: customer_name, order_id, product_name, product_qty,
//            order_total, delivery_address, order_date, whatsapp_link
const EMAILJS_CONFIG = {
  SERVICE_ID:           "service_ya3i8z5",
  ORDER_TEMPLATE_ID:    "template_b74fs4i",        // admin order notification
  CUSTOMER_TEMPLATE_ID: "YOUR_CUSTOMER_TEMPLATE_ID", // customer confirmation
  STATUS_TEMPLATE_ID:   "YOUR_STATUS_TEMPLATE_ID",  // status update emails
  CONTACT_TEMPLATE_ID:  "template_bjilswx",         // contact form
  PUBLIC_KEY:           "gg710V89DLfTpQCu0",
};

// Initialise once the SDK script is loaded
function initEmailJS() {
  if (typeof emailjs === "undefined") {
    console.warn("EmailJS SDK not loaded. Add the CDN script before emailjs.js.");
    return false;
  }
  emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
  return true;
}

// ── Admin notification routing ──────────────────────────────────
// Admin notifications → hello@gendimension.co.za
// Thato → thatomathopa@gendimension.co.za
// Vongani → costachauke@gendimension.co.za
const ADMIN_NOTIFY_EMAIL = "hello@gendimension.co.za";

// ── Order Confirmation ──────────────────────────────────────────
// Template variables used:
//   order_id, customer_name, customer_email, customer_phone,
//   product_name, product_qty, order_total, delivery_address,
//   order_notes, order_date, to_email
function sendOrderEmail(order) {
  if (!initEmailJS()) return Promise.reject("EmailJS not available");

  const params = {
    to_email:         ADMIN_NOTIFY_EMAIL,
    order_id:         order.id,
    customer_name:    order.customerName,
    customer_email:   order.customerEmail,
    customer_phone:   order.customerPhone   || "—",
    product_name:     order.productName,
    product_qty:      order.qty,
    order_total:      "R " + (order.total || 0).toLocaleString("en-ZA"),
    delivery_address: order.deliveryAddress || "—",
    order_notes:      order.notes           || "None",
    order_date:       order.date,
  };

  return emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.ORDER_TEMPLATE_ID, params);
}

// ── Customer Order Confirmation ─────────────────────────────────
// Sent to the customer's email address when their order is placed.
// Template variables: customer_name, order_id, product_name, product_qty,
//   order_total, delivery_address, order_date, whatsapp_link
function sendCustomerConfirmationEmail(order) {
  if (!initEmailJS()) return Promise.reject("EmailJS not available");

  const params = {
    customer_name:    order.customerName,
    order_id:         order.id,
    product_name:     order.productName,
    product_qty:      order.qty,
    order_total:      "R " + (order.total || 0).toLocaleString("en-ZA"),
    delivery_address: order.deliveryAddress || "—",
    order_date:       order.date,
    whatsapp_link:    "https://wa.me/27798796513",
  };

  return emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.CUSTOMER_TEMPLATE_ID, params);
}

// ── Status Update ───────────────────────────────────────────────
const STATUS_MESSAGES = {
  processing: "We're preparing your order and will have it ready for delivery soon.",
  done:       "Your order has been delivered. We hope you love your new furniture!",
};

function sendStatusUpdateEmail(order) {
  if (!initEmailJS()) return Promise.reject("EmailJS not available");

  const statusLabel = order.status.charAt(0).toUpperCase() + order.status.slice(1);

  const params = {
    to_email:         order.customerEmail,
    order_id:         order.id,
    customer_name:    order.customerName,
    customer_email:   order.customerEmail,
    product_name:     order.productName,
    order_total:      "R " + (order.total || 0).toLocaleString("en-ZA"),
    order_status:     statusLabel,
    status_message:   STATUS_MESSAGES[order.status] || "",
  };

  return emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.STATUS_TEMPLATE_ID, params);
}

// ── Contact Form ────────────────────────────────────────────────
function sendContactEmail(data) {
  if (!initEmailJS()) return Promise.reject("EmailJS not available");

  const params = {
    from_name:  data.name,
    from_email: data.email,
    message:    data.message,
  };

  return emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.CONTACT_TEMPLATE_ID, params);
}

// Contact form is handled by main.js → backend/contact.php
