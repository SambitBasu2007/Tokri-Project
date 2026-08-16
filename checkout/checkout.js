// ============================================================
//  checkout.js  |  Tokri Checkout Logic
//  Fully self-contained. Reuses store/product data from app.js.
//  Includes: store picker (3-dot), external links, qty steppers,
//  bill calculation, coupons, address editing, payment, place order.
// ============================================================

// ---------- Store Data ----------
const STORES = [
    { id: 'blinkit', name: 'Blinkit', dot: 'blinkit', delivery: '10 min' },
    { id: 'zepto', name: 'Zepto', dot: 'zepto', delivery: '10 min' },
    { id: 'swiggy', name: 'Swiggy Instamart', dot: 'swiggy', delivery: '15 min' },
    { id: 'bigbasket', name: 'BigBasket', dot: 'bigbasket', delivery: '30 min' },
    { id: 'jiomart', name: 'JioMart', dot: 'jiomart', delivery: '60 min' },
    { id: 'flipkart', name: 'Flipkart Minutes', dot: 'flipkart', delivery: '20 min' },
];

const STORE_SEARCH_URLS = {
    blinkit: 'https://blinkit.com/s/?q=',
    zepto: 'https://www.zeptonow.com/search?query=',
    swiggy: 'https://www.swiggy.com/instamart/search?custom_back=true&query=',
    bigbasket: 'https://www.bigbasket.com/ps/?q=',
    jiomart: 'https://www.jiomart.com/search?q=',
    flipkart: 'https://www.flipkart.com/search?q=',
};

const STORE_FEES = {
    blinkit: { threshold: 199, fee: 25 },
    zepto: { threshold: 199, fee: 25 },
    swiggy: { threshold: 199, fee: 25 },
    bigbasket: { threshold: 399, fee: 35 },
    jiomart: { threshold: 399, fee: 35 },
    flipkart: { threshold: 199, fee: 25 },
};

// ---------- Product Data (needed for store picker & links) ----------
const PRODUCTS = [
    { id: 1, name: "Amul Toned Milk", weight: "1 L Pouch", emoji: "🥛", prices: { blinkit: 32, zepto: 31, swiggy: 33, bigbasket: 30, jiomart: 29, flipkart: 33 }, mrp: 34 },
    { id: 2, name: "Aashirvaad Whole Wheat Atta", weight: "5 kg", emoji: "🌾", prices: { blinkit: 265, zepto: 272, swiggy: 269, bigbasket: 259, jiomart: 255, flipkart: null }, mrp: 290 },
    { id: 3, name: "Fortune Sunflower Oil", weight: "1 L", emoji: "🫒", prices: { blinkit: 139, zepto: 142, swiggy: 135, bigbasket: 138, jiomart: 140, flipkart: 145 }, mrp: 155 },
    { id: 4, name: "Shimla Apples", weight: "1 kg (4-5 pcs)", emoji: "🍎", prices: { blinkit: 165, zepto: 159, swiggy: 170, bigbasket: 155, jiomart: 162, flipkart: 168 }, mrp: 180 },
    { id: 5, name: "Haldiram's Aloo Bhujia", weight: "200 g", emoji: "🍿", prices: { blinkit: 55, zepto: 50, swiggy: 56, bigbasket: 52, jiomart: 53, flipkart: 54 }, mrp: 60 },
    { id: 6, name: "Coca-Cola", weight: "750 ml Bottle", emoji: "🥤", prices: { blinkit: 38, zepto: 40, swiggy: 38, bigbasket: 35, jiomart: 36, flipkart: 39 }, mrp: 42 },
    { id: 7, name: "Spinach (Palak)", weight: "250 g", emoji: "🥬", prices: { blinkit: 18, zepto: 20, swiggy: 24, bigbasket: 22, jiomart: 25, flipkart: null }, mrp: 30 },
    { id: 8, name: "Amul Butter", weight: "500 g Carton", emoji: "🧈", prices: { blinkit: 270, zepto: 275, swiggy: 268, bigbasket: 265, jiomart: 262, flipkart: 278 }, mrp: 285 },
    { id: 9, name: "Maggi 2-Minute Noodles", weight: "Family Pack (8×70g)", emoji: "🍜", prices: { blinkit: 90, zepto: 99, swiggy: 95, bigbasket: 92, jiomart: 96, flipkart: 98 }, mrp: 112 },
    { id: 10, name: "Dettol Liquid Handwash", weight: "900 ml Refill", emoji: "🧴", prices: { blinkit: 95, zepto: 105, swiggy: 102, bigbasket: 99, jiomart: 97, flipkart: null }, mrp: 120 },
    { id: 11, name: "Harpic Power Plus", weight: "1 L", emoji: "🧹", prices: { blinkit: 115, zepto: 118, swiggy: 120, bigbasket: 110, jiomart: 108, flipkart: 122 }, mrp: 130 },
    { id: 12, name: "India Gate Basmati Rice", weight: "5 kg", emoji: "🍚", prices: { blinkit: 450, zepto: 465, swiggy: 435, bigbasket: 455, jiomart: 440, flipkart: 470 }, mrp: 499 },
    { id: 13, name: "Bananas", weight: "1 Dozen", emoji: "🍌", prices: { blinkit: 45, zepto: 42, swiggy: 48, bigbasket: 40, jiomart: 44, flipkart: 46 }, mrp: 55 },
    { id: 14, name: "Amul Paneer", weight: "200 g Block", emoji: "🧀", prices: { blinkit: 90, zepto: 88, swiggy: 92, bigbasket: 85, jiomart: 87, flipkart: 95 }, mrp: 100 },
    { id: 15, name: "Tropicana Orange Juice", weight: "1 L Tetra Pack", emoji: "🧃", prices: { blinkit: 99, zepto: 90, swiggy: 102, bigbasket: 95, jiomart: 92, flipkart: null }, mrp: 110 },
    { id: 16, name: "Tomatoes", weight: "1 kg", emoji: "🍅", prices: { blinkit: 28, zepto: 25, swiggy: 30, bigbasket: 22, jiomart: 26, flipkart: 32 }, mrp: 40 },
    { id: 17, name: "Lay's Classic Salted", weight: "Party Pack 190 g", emoji: "🥔", prices: { blinkit: 70, zepto: 72, swiggy: 78, bigbasket: 75, jiomart: 73, flipkart: 76 }, mrp: 85 },
    { id: 18, name: "Surf Excel Matic Liquid", weight: "1 L Front Load", emoji: "🫧", prices: { blinkit: 210, zepto: 215, swiggy: 220, bigbasket: 199, jiomart: 205, flipkart: 225 }, mrp: 240 },
];

// ---------- State ----------
let cart = [];
let address = { label: 'Home', detail: '123, Example Street, Borivali, Mumbai – 400091' };
let paymentMethod = 'upi';
let appliedCoupon = null;

// ---------- Helpers ----------
const formatPrice = (n) => '₹' + Math.round(n);
const getQty = (item) => item.qty || 1;
const getStore = (id) => STORES.find(s => s.id === id);
const getProduct = (id) => PRODUCTS.find(p => p.id === id);

function getBestPrice(prices) {
    let best = { store: null, price: Infinity };
    for (const [storeId, price] of Object.entries(prices)) {
        if (price !== null && price < best.price) {
            best = { store: storeId, price };
        }
    }
    return best;
}

function getProductStoreUrl(product, storeId) {
    const query = `${product.name} ${product.weight}`;
    return `${STORE_SEARCH_URLS[storeId]}${encodeURIComponent(query)}`;
}

function getAvailableStores(product) {
    return STORES.filter(store => product.prices[store.id] !== null);
}

// ---------- Store Picker (3-dot menu) — Same as index ----------
function renderStorePicker(product, selectedStore, context) {
    const best = getBestPrice(product.prices);
    const options = getAvailableStores(product).map(store => `
    <button class="store-picker-option${store.id === selectedStore ? ' selected' : ''}"
      type="button" data-store-option data-product-id="${product.id}" data-store-id="${store.id}" data-context="${context}">
      <span class="store-picker-option-store">
        <span class="store-dot store-dot--${store.dot}"></span>${store.name}
        ${store.id === best.store ? '<span class="store-picker-best-tag">Best</span>' : ''}
      </span>
      <span class="store-picker-option-price">₹${product.prices[store.id]}${store.id === selectedStore ? ' ✓' : ''}</span>
    </button>`).join('');

    return `
    <div class="store-picker-wrap">
      <button class="store-picker-btn" type="button" data-store-picker-toggle aria-label="Choose store" aria-expanded="false">⋯</button>
      <div class="store-picker-menu${context === 'cart' ? ' store-picker-menu--cart' : ''}" role="menu">
        ${options}
      </div>
    </div>`;
}

function closeStorePickers() {
    document.querySelectorAll('.store-picker-menu.open').forEach(menu => menu.classList.remove('open'));
    document.querySelectorAll('[data-store-picker-toggle][aria-expanded="true"]')
        .forEach(button => button.setAttribute('aria-expanded', 'false'));
}

function toggleStorePicker(button) {
    const menu = button.parentElement.querySelector('.store-picker-menu');
    const willOpen = !menu.classList.contains('open');
    closeStorePickers();
    if (willOpen) {
        menu.classList.add('open');
        button.setAttribute('aria-expanded', 'true');
    }
}

function setProductStore(productId, storeId) {
    const product = getProduct(Number(productId));
    if (!product || product.prices[storeId] === null || product.prices[storeId] === undefined) return;

    const item = cart.find(c => c.id === Number(productId));
    if (item) {
        item.selectedStore = storeId;
        item.selectedPrice = product.prices[storeId];
        saveCart();
        renderCheckout();
    }
}

// ---------- Cart Load / Save ----------
function loadCart() {
    try {
        const saved = localStorage.getItem('tokri_cart');
        if (saved) cart = JSON.parse(saved);
    } catch (e) { console.error('Failed to load cart', e); }

    if (!cart || cart.length === 0) {
        showEmptyState();
    } else {
        cart.forEach(item => { if (!item.qty) item.qty = 1; });
        renderCheckout();
    }
}

function saveCart() {
    localStorage.setItem('tokri_cart', JSON.stringify(cart));
}

// ---------- Empty State ----------
function showEmptyState() {
    const container = document.querySelector('.checkout-container');
    ['checkoutDeliveryStrip', 'checkoutAddress', 'checkoutOrderSummary',
        'checkoutBillDetails', 'checkoutPayment'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    document.getElementById('checkoutActionBar').style.display = 'none';

    const div = document.createElement('div');
    div.className = 'checkout-empty-state';
    div.innerHTML = `
    <div class="checkout-empty-icon">🛒</div>
    <div class="checkout-empty-title">Your cart is empty</div>
    <div class="checkout-empty-desc">Add items from the comparison table to start saving</div>
    <a href="../index.html" class="btn btn-primary">Start Shopping</a>
  `;
    container.appendChild(div);
}

// ---------- Calculations ----------
function calculateTotals() {
    let itemTotal = 0;
    const storeSubtotals = {};

    cart.forEach(item => {
        const q = getQty(item);
        itemTotal += item.selectedPrice * q;
        storeSubtotals[item.selectedStore] = (storeSubtotals[item.selectedStore] || 0) + item.selectedPrice * q;
    });

    let deliveryTotal = 0;
    Object.entries(storeSubtotals).forEach(([storeId, sub]) => {
        const cfg = STORE_FEES[storeId];
        if (cfg && sub < cfg.threshold) deliveryTotal += cfg.fee;
    });

    let couponDiscount = 0;
    if (appliedCoupon) {
        if (appliedCoupon.code === 'WELCOME10') couponDiscount = Math.min(itemTotal * 0.10, 50);
        else if (appliedCoupon.code === 'SAVE20') couponDiscount = Math.min(itemTotal * 0.20, 100);
        else if (appliedCoupon.code === 'FREEDEL') couponDiscount = deliveryTotal;
        else if (appliedCoupon.code === 'SCAMTOKRI') couponDiscount = Math.min(itemTotal * 1 + deliveryTotal, 500000000000000);
        else if (appliedCoupon.code === 'KRISH') couponDiscount = Math.min(itemTotal * 1 + deliveryTotal, 500000000000);
        else if (appliedCoupon.code === 'DWAYNE') couponDiscount = Math.min(itemTotal * 10 + deliveryTotal, 500000000000);
        else if (appliedCoupon.code === 'STUART') couponDiscount = Math.min(itemTotal * 10 + deliveryTotal, 500000000000);
        else if (appliedCoupon.code === 'KRISHLIKESDATASTRUCTURES') couponDiscount = Math.min(itemTotal * -10034600 + deliveryTotal, 500000000000);
    }

    const grandTotal = itemTotal + deliveryTotal - couponDiscount;
    return { itemTotal, deliveryTotal, couponDiscount, grandTotal, storeSubtotals };
}

// ---------- Renderers ----------
function renderDeliveryStrip() {
    const storeIds = [...new Set(cart.map(c => c.selectedStore))];
    const strip = document.getElementById('checkoutDeliveryStrip');
    strip.innerHTML = storeIds.map(id => {
        const s = getStore(id);
        if (!s) return '';
        return `
      <div class="delivery-strip-item">
        <span class="store-dot store-dot--${s.dot}"></span>
        <span class="delivery-strip-store">${s.name}</span>
        <span class="delivery-strip-eta">Arriving in ${s.delivery}</span>
      </div>`;
    }).join('');
}

function renderAddress() {
    document.getElementById('checkoutAddress').innerHTML = `
    <svg class="checkout-address-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
    <div class="checkout-address-text">
      <span class="checkout-address-label">Delivering to ${address.label}</span>
      <span class="checkout-address-detail">${address.detail}</span>
    </div>
    <button class="checkout-address-change" id="changeAddressBtn">Change</button>
  `;
    document.getElementById('changeAddressBtn').addEventListener('click', openAddressModal);
}

function renderOrderSummary() {
    const { storeSubtotals } = calculateTotals();
    const container = document.getElementById('checkoutOrderSummary');
    const storeIds = [...new Set(cart.map(c => c.selectedStore))];

    let html = '<h2 class="checkout-card-title">Order Summary</h2>';

    storeIds.forEach(id => {
        const cfg = getStore(id);
        if (!cfg) return;
        const items = cart.filter(c => c.selectedStore === id);
        const count = items.reduce((sum, it) => sum + getQty(it), 0);
        const sub = storeSubtotals[id] || 0;

        html += `
      <div class="checkout-store-group">
        <div class="checkout-store-header">
          <span class="store-dot store-dot--${cfg.dot}"></span>
          <span class="checkout-store-name">${cfg.name}</span>
          <span class="checkout-store-count">${count} ${count === 1 ? 'item' : 'items'}</span>
          <span class="checkout-store-subtotal">${formatPrice(sub)}</span>
        </div>
        <div class="checkout-store-items">
          ${items.map(item => {
            const product = getProduct(item.id);
            const storeUrl = product ? getProductStoreUrl(product, item.selectedStore) : '#';
            return `
            <div class="checkout-item-row" data-id="${item.id}">
              <span class="checkout-item-emoji">${item.emoji}</span>
              <div class="checkout-item-info">
                <span class="checkout-item-name">${item.name}</span>
                ${item.weight ? `<span class="checkout-item-weight">${item.weight}</span>` : ''}
              </div>
              <div class="checkout-item-qty">
                <button class="qty-btn" data-qty-change data-id="${item.id}" data-delta="-1" aria-label="Decrease quantity">−</button>
                <span class="qty-value">${getQty(item)}</span>
                <button class="qty-btn" data-qty-change data-id="${item.id}" data-delta="1" aria-label="Increase quantity">+</button>
              </div>
              <span class="checkout-item-price">${formatPrice(item.selectedPrice * getQty(item))}</span>
              <div class="checkout-item-actions">
                <a class="store-link-btn" href="${storeUrl}" target="_blank" rel="noopener noreferrer"
                   aria-label="Search ${item.name} on ${cfg.name}" title="Open ${cfg.name}">↗</a>
                ${product ? renderStorePicker(product, item.selectedStore, 'cart') : ''}
                <button class="checkout-item-remove" data-cart-remove data-id="${item.id}" title="Remove" aria-label="Remove ${item.name}">&times;</button>
              </div>
            </div>`;
        }).join('')}
        </div>
      </div>`;
    });

    container.innerHTML = html;
}

function renderBillDetails() {
    const { itemTotal, deliveryTotal, couponDiscount, grandTotal, storeSubtotals } = calculateTotals();

    let deliveryHtml = '';
    Object.entries(storeSubtotals).forEach(([storeId, sub]) => {
        const cfg = getStore(storeId);
        const feeCfg = STORE_FEES[storeId];
        if (!cfg || !feeCfg) return;
        const isFree = sub >= feeCfg.threshold;
        deliveryHtml += `
      <div class="bill-row">
        <span>${cfg.name} Delivery Fee</span>
        <span>${isFree ? '₹0' : formatPrice(feeCfg.fee)}
          ${isFree ? '<span class="bill-row-note">(Free — min. order met)</span>' : ''}
        </span>
      </div>`;
    });

    const couponLine = appliedCoupon
        ? `<span style="color:#0c831f;font-weight:700;">– ${formatPrice(couponDiscount)}</span>`
        : `<button class="bill-apply-coupon" id="applyCouponBtn">Apply Coupon</button>`;

    const couponLabel = appliedCoupon
        ? `Coupon Discount <span style="color:var(--text-muted);font-weight:500;">(${appliedCoupon.code})</span>
       <button class="bill-apply-coupon" id="removeCouponBtn" style="margin-left:6px;font-size:0.75rem;color:#ef4444;">Remove</button>`
        : 'Coupon Discount';

    document.getElementById('checkoutBillDetails').innerHTML = `
    <h2 class="checkout-card-title">Bill Details</h2>
    <div class="bill-row">
      <span>Item Total</span>
      <span>${formatPrice(itemTotal)}</span>
    </div>
    ${deliveryHtml}
    <div class="bill-row bill-row--discount">
      <span>${couponLabel}</span>
      ${couponLine}
    </div>
    <div class="bill-divider"></div>
    <div class="bill-row bill-row--total">
      <span>To Pay</span>
      <span id="checkoutGrandTotal">${formatPrice(grandTotal)}</span>
    </div>
  `;

    document.getElementById('checkoutActionAmount').textContent = formatPrice(grandTotal);

    if (appliedCoupon) {
        document.getElementById('removeCouponBtn').addEventListener('click', removeCoupon);
    } else {
        document.getElementById('applyCouponBtn').addEventListener('click', openCouponModal);
    }
}

function renderPayment() {
    const methods = [
        { id: 'upi', label: '📱 UPI' },
        { id: 'card', label: '💳 Card' },
        { id: 'cod', label: '💵 Cash on Delivery' },
    ];
    document.getElementById('checkoutPayment').innerHTML = `
    <h2 class="checkout-card-title">Payment Method</h2>
    <div class="payment-options">
      ${methods.map(m => `
        <button class="payment-pill ${paymentMethod === m.id ? 'active' : ''}"
                data-payment-method="${m.id}" type="button">${m.label}</button>
      `).join('')}
    </div>
  `;

    document.querySelectorAll('[data-payment-method]').forEach(btn => {
        btn.addEventListener('click', () => setPayment(btn.dataset.paymentMethod));
    });
}

function renderCheckout() {
    renderDeliveryStrip();
    renderAddress();
    renderOrderSummary();
    renderBillDetails();
    renderPayment();
    attachItemListeners();
}

// ---------- Event Delegation for Dynamic Elements ----------
function attachItemListeners() {
    // Quantity buttons
    document.querySelectorAll('[data-qty-change]').forEach(btn => {
        btn.addEventListener('click', () => {
            updateQty(Number(btn.dataset.id), Number(btn.dataset.delta));
        });
    });

    // Remove buttons
    document.querySelectorAll('[data-cart-remove]').forEach(btn => {
        btn.addEventListener('click', () => removeItem(Number(btn.dataset.id)));
    });

    // Store picker toggles
    document.querySelectorAll('[data-store-picker-toggle]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleStorePicker(btn);
        });
    });

    // Store option selection
    document.querySelectorAll('[data-store-option]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            setProductStore(btn.dataset.productId, btn.dataset.storeId);
        });
    });
}

// Close store pickers when clicking outside
function handleDocumentClick(e) {
    if (!e.target.closest('.store-picker-wrap')) {
        closeStorePickers();
    }
}

// ---------- Actions ----------
function updateQty(id, delta) {
    const item = cart.find(c => c.id === id);
    if (!item) return;
    item.qty = getQty(item) + delta;
    if (item.qty < 1) item.qty = 1;
    saveCart();
    renderCheckout();
}

function removeItem(id) {
    cart = cart.filter(c => c.id !== id);
    saveCart();
    if (cart.length === 0) {
        window.location.reload();
    } else {
        renderCheckout();
    }
}

function setPayment(method) {
    paymentMethod = method;
    renderPayment();
}

// ---------- Modals ----------
function openModal(contentHtml) {
    const content = document.getElementById('checkoutModalContent');
    content.innerHTML = contentHtml;
    document.getElementById('checkoutModal').classList.add('open');
}

function closeModal() {
    document.getElementById('checkoutModal').classList.remove('open');
}

function openAddressModal() {
    openModal(`
    <div class="checkout-modal-title">Change Delivery Address</div>
    <input type="text" class="checkout-input" id="addressLabelInput"
           value="${address.label}" placeholder="Label (e.g. Home, Office)">
    <input type="text" class="checkout-input" id="addressDetailInput"
           value="${address.detail}" placeholder="Full address">
    <div class="checkout-modal-actions">
      <button class="btn btn-ghost" id="cancelAddressBtn">Cancel</button>
      <button class="btn btn-primary" id="saveAddressBtn">Save Address</button>
    </div>
  `);
    document.getElementById('cancelAddressBtn').addEventListener('click', closeModal);
    document.getElementById('saveAddressBtn').addEventListener('click', saveAddress);
}

function saveAddress() {
    const label = document.getElementById('addressLabelInput').value.trim();
    const detail = document.getElementById('addressDetailInput').value.trim();
    if (label && detail) {
        address = { label, detail };
        renderAddress();
        closeModal();
    }
}

function openCouponModal() {
    openModal(`
    <div class="checkout-modal-title">Apply Coupon</div>
    <input type="text" class="checkout-input" id="couponInput" placeholder="Enter coupon code">
    <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:16px;line-height:1.5;">
      Try: <b>WELCOME10</b> (10% off up to ₹50) · <b>SAVE20</b> (20% off up to ₹100) · <b>FREEDEL</b> (Free delivery) · <b>SCAMTOKRI</b> (100% off) · <b>KRISH</b> (100% off) · <b>DWAYNE</b> (1000% off) · <b>STUART</b> (1000% off) · <b>KRISHLIKESDATASTRUCTURES</b> (-10034600% off)
    </div>
    <div class="checkout-modal-actions">
      <button class="btn btn-ghost" id="cancelCouponBtn">Cancel</button>
      <button class="btn btn-primary" id="applyCouponActionBtn">Apply</button>
    </div>
  `);
    document.getElementById('cancelCouponBtn').addEventListener('click', closeModal);
    document.getElementById('applyCouponActionBtn').addEventListener('click', applyCoupon);
    setTimeout(() => document.getElementById('couponInput')?.focus(), 50);
}

function applyCoupon() {
    const raw = document.getElementById('couponInput').value.trim().toUpperCase();
    const valid = ['WELCOME10', 'SAVE20', 'FREEDEL', 'SCAMTOKRI', 'KRISH', 'DWAYNE', 'STUART', 'KRISHLIKESDATASTRUCTURES'];
    if (valid.includes(raw)) {
        appliedCoupon = { code: raw };
        renderBillDetails();
        closeModal();
    } else {
        alert('Invalid coupon code. Try WELCOME10, SAVE20, FREEDEL, SCAMTOKRI, KRISH, DWAYNE, STUART, or KRISHLIKESDATASTRUCTURES.');
    }
}

function removeCoupon() {
    appliedCoupon = null;
    renderBillDetails();
}

// ---------- Place Order ----------
function placeOrder() {
    if (cart.length === 0) return;
    const { grandTotal } = calculateTotals();
    const storeNames = [...new Set(cart.map(c => getStore(c.selectedStore)?.name).filter(Boolean))];

    const btn = document.getElementById('placeOrderBtn');
    btn.textContent = 'Placing Order…';
    btn.disabled = true;

    setTimeout(() => {
        alert(
            `🎉 Order Placed Successfully!\n\n` +
            `Total: YOU HAVE BEEN SCAMMED ${formatPrice(grandTotal)}\n HAHAHAHAAAHH` +
            `Payment: ${paymentMethod.toUpperCase()}\n` +
            `Stores: ${storeNames.join(', ')}\n\n` +
            `Thank you for shopping with Tokri!`
        );
        cart = [];
        saveCart();
        window.location.href = '../index.html';
    }, 1400);
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    if (typeof initCheckoutMode === 'function') initCheckoutMode();
    document.getElementById('placeOrderBtn').addEventListener('click', placeOrder);
    document.getElementById('placeOrderBtn').addEventListener('click', placeOrder);
    document.getElementById('checkoutModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('checkoutModal')) closeModal();
    });
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

});



// ============================================================
//  SHARED COMMUNITY CART INTEGRATION (checkout page)
// ============================================================

let ccModule = null;
let ccUserCommunities = [];

(async function initCheckoutCommunityCart() {
    try {
        const mod = await import('../shared/community-cart.js');
        ccModule = mod;
        setupCheckoutCommunityCartUI();
        await populateCheckoutCommunityDropdown();
    } catch (err) {
        console.warn('[Checkout] Community cart module not loaded:', err.message);
    }
})();

function setupCheckoutCommunityCartUI() {
    const btn = document.getElementById('communityCartBtn');
    const closeBtn = document.getElementById('sharedCartClose');
    const overlay = document.getElementById('sharedCartOverlay');
    const panel = document.getElementById('sharedCartPanel');
    const dropdown = document.getElementById('sharedCartCommunityDropdown');

    if (!btn || !panel) return;

    btn.addEventListener('click', () => {
        panel.classList.add('open');
        overlay.classList.add('open');
    });

    if (closeBtn) closeBtn.addEventListener('click', closeCheckoutSharedCart);
    if (overlay) overlay.addEventListener('click', closeCheckoutSharedCart);

    if (dropdown) {
        dropdown.addEventListener('change', async (e) => {
            const communityId = e.target.value;
            if (communityId && ccModule) {
                ccModule.unloadSharedCart();
                ccModule.subscribeToSharedCart(communityId, 'sharedCartBody');
            }
        });
    }
}

function closeCheckoutSharedCart() {
    document.getElementById('sharedCartPanel')?.classList.remove('open');
    document.getElementById('sharedCartOverlay')?.classList.remove('open');
}

async function populateCheckoutCommunityDropdown() {
    const dropdown = document.getElementById('sharedCartCommunityDropdown');
    if (!dropdown) return;

    // Try to get supabase from window or import
    let sb = null;
    try {
        const mod = await import('../shared/supabase.js');
        sb = mod.supabase;
    } catch (e) {
        dropdown.innerHTML = '<option value="">Auth unavailable</option>';
        return;
    }

    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
        dropdown.innerHTML = '<option value="">Sign in to see communities</option>';
        return;
    }

    const { data, error } = await sb
        .from('community_members')
        .select('communities(id, display_name)')
        .eq('user_id', user.id);

    if (error || !data || data.length === 0) {
        dropdown.innerHTML = '<option value="">No communities yet</option>';
        return;
    }

    ccUserCommunities = data;
    dropdown.innerHTML = data.map(row =>
        `<option value="${row.communities.id}">${row.communities.display_name}</option>`
    ).join('');

    if (data[0]?.communities?.id) {
        await ccModule.loadSharedCart(data[0].communities.id, 'sharedCartBody');
    }
}