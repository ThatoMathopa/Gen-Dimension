# Gen Dimension — Furniture E-Commerce Website

A static frontend e-commerce site for premium furniture based in Clayville, Gauteng, South Africa, with a customer-facing storefront and an admin dashboard.

## Project Structure

```
GenDimension/
├── index.html        # Customer storefront
├── admin.html        # Admin dashboard (orders + add products)
├── css/
│   └── style.css     # All styles
├── js/
│   ├── main.js       # Product rendering, cart logic (localStorage)
│   ├── orders.js     # Order management and admin table
│   └── emailjs.js    # Contact form and order confirmation emails
└── README.md
```

## Features

- Product catalogue with add-to-cart (persisted in `localStorage`)
- Contact form powered by [EmailJS](https://www.emailjs.com)
- Admin dashboard: view/update order statuses, add new products
- Fully responsive layout

## Getting Started

1. Open `index.html` in a browser — no build step required.
2. For email functionality, set up EmailJS:
   - Create a free account at https://www.emailjs.com
   - Replace `YOUR_SERVICE_ID`, `YOUR_TEMPLATE_ID`, and `YOUR_PUBLIC_KEY` in `js/emailjs.js`
   - Add the EmailJS CDN script to `index.html` before `js/emailjs.js`:
     ```html
     <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
     ```

## Tech Stack

- HTML5 / CSS3 / Vanilla JavaScript
- EmailJS (transactional email)
- localStorage (cart and orders persistence)

## Contact

| Address | Person |
|---|---|
| info@gendimension.co.za | General enquiries |
| thatomathopa@gendimension.co.za | Thato Mathopa |
| costachauke@gendimension.co.za | Vongani Costa Chauke |
