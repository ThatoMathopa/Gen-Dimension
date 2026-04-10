# Gen Dimension Launch Checklist

## DNS & Hosting
- [ ] Domain gendimension.co.za pointing to cPanel public_html
- [ ] SSL certificate active (https working)
- [ ] All files uploaded to public_html

## Database
- [ ] gendimen_DB created on cPanel
- [ ] gendimen_admin user created with full privileges
- [ ] All 4 tables created: orders, newsletter, contacts, products
- [ ] Run backend/setup-database.sql in phpMyAdmin
- [ ] Test connection at /backend/test-connection.php
- [ ] DELETE test-connection.php after testing

## PayFast
- [ ] Merchant ID: 34464777 in config.php and js/orders.js
- [ ] Merchant Key: dlafzyubih35x in config.php and js/orders.js
- [ ] PAYFAST_SANDBOX set to false in config.php
- [ ] sandbox set to false in js/orders.js
- [ ] notify_url set to https://gendimension.co.za/backend/payfast-notify.php
- [ ] Log in to payfast.co.za and set notify URL in dashboard settings
- [ ] Confirm backend/logs/ folder exists and is writable
- [ ] Test a real payment with a small amount
- [ ] Check backend/logs/payfast-itn.log for ITN confirmation

## Email
- [ ] info@gendimension.co.za working
- [ ] thatomathopa@gendimension.co.za working
- [ ] costachauke@gendimension.co.za working
- [ ] Order notification emails sending correctly
- [ ] Customer confirmation emails sending correctly
- [ ] Contact form auto-reply sending correctly
- [ ] Newsletter welcome email sending correctly

## Frontend
- [ ] index.html loads correctly on https://gendimension.co.za
- [ ] All products display (loaded from backend/products.php)
- [ ] Category filters work (All, TV Stand, Drawer, etc.)
- [ ] Add to Cart works
- [ ] Cart sidebar opens and shows items correctly
- [ ] Qty increase / decrease / remove works in cart
- [ ] Order modal opens on Checkout
- [ ] Customer details form validates correctly
- [ ] PayFast redirects to live checkout (not sandbox)
- [ ] Payment success banner shows on return
- [ ] Payment cancelled banner shows on cancel
- [ ] WhatsApp button opens wa.me/27798796513
- [ ] Contact form submits and shows success toast
- [ ] Newsletter signup works
- [ ] Cookie consent banner appears on first visit
- [ ] Back-to-top button appears on scroll
- [ ] Mobile responsive on phone (iPhone + Android)
- [ ] No console errors in browser DevTools

## Admin
- [ ] admin.html loads at https://gendimension.co.za/admin.html
- [ ] Password GenDim@2025 grants access
- [ ] Wrong password shakes and counts attempts
- [ ] 3 wrong attempts triggers 30-second lockout
- [ ] Stats (total orders, revenue, new, fulfilled) show correctly
- [ ] Orders table populates from backend
- [ ] Search and status filter work
- [ ] Advance status button works (New → Processing → Done)
- [ ] Delete order works
- [ ] CSV export downloads
- [ ] Newsletter tab shows subscribers
- [ ] Products tab shows all products
- [ ] Add product form saves to database
- [ ] Product image upload works (via localStorage)

## Security
- [ ] backend/config.php not accessible from browser (returns 403)
- [ ] backend/logs/ not publicly accessible (returns 403)
- [ ] Add backend/.htaccess to deny direct access to config.php and logs/
- [ ] test-connection.php deleted from server
- [ ] PAYFAST_SANDBOX is false — no test payments going through
- [ ] Admin password not visible in browser DevTools / page source

## SEO & Analytics
- [ ] og:image uploaded to images/og-image.jpg (1200×630px)
- [ ] favicon.png added to images/ (64×64px)
- [ ] icon-192.png added to images/ (192×192px)
- [ ] icon-512.png added to images/ (512×512px)
- [ ] Validate structured data: https://search.google.com/test/rich-results
- [ ] Submit sitemap to Google Search Console
- [ ] Google AdSense account verified (ca-pub-7924654120480831)
