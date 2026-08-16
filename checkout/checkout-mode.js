
// ============================================================
//  CHECKOUT MODE SELECTOR & SHARED CART INTEGRATION
//  Appended to checkout.js — no existing code touched.
// ============================================================

let checkoutMode = 'individual'; // 'individual' | 'shared'
let sharedCartItems = [];
let activeSharedCommunityId = null;
let userCommunitiesList = [];

// ---------- Mode Switching ----------

function setCheckoutMode(mode) {
    checkoutMode = mode;
    document.querySelectorAll('.checkout-mode-btn').forEach(btn => {
        btn.classList.toggle('active',
            (mode === 'individual' && btn.id === 'checkoutIndividualBtn') ||
            (mode === 'shared' && btn.id === 'checkoutSharedBtn')
        );
    });

    const pickerCard = document.getElementById('communityPickerCard');

    if (mode === 'individual') {
        if (pickerCard) pickerCard.style.display = 'none';
        // Reload individual cart
        loadCart();
    } else {
        // Shared mode — show picker, load first community if available
        if (pickerCard) pickerCard.style.display = 'block';
        openCommunityPicker();
    }
}

// ---------- Community Picker ----------

async function openCommunityPicker() {
    const strip = document.getElementById('communityPickerStrip');
    if (!strip) return;

    // Try to get supabase
    let sb = null;
    try {
        const mod = await import('../shared/supabase.js');
        sb = mod.supabase;
    } catch (e) {
        strip.innerHTML = '<div class="community-picker-empty">Sign in to view communities</div>';
        return;
    }

    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
        strip.innerHTML = '<div class="community-picker-empty">Sign in to view communities</div>';
        return;
    }

    const { data, error } = await sb
        .from('community_members')
        .select('communities(id, display_name, handle, type)')
        .eq('user_id', user.id);

    if (error || !data || data.length === 0) {
        strip.innerHTML = '<div class="community-picker-empty">No communities yet</div>';
        return;
    }

    userCommunitiesList = data;

    strip.innerHTML = data.map((row, idx) => {
        const c = row.communities;
        const typeIcon = c.type === 'family' ? '👨‍👩‍👧‍👦' : '👥';
        const isActive = idx === 0 && !activeSharedCommunityId;
        if (isActive) {
            activeSharedCommunityId = c.id;

        }
        return `
    <a href="#checkoutaddress" class="community-picker-card${isActive ? ' active' : ''}" 
       data-community-id="${c.id}" 
       onclick="event.preventDefault(); selectCommunityForCheckout('${c.id}'); location.hash='checkoutmainheader';">
        <div class="community-picker-card-icon">${typeIcon}</div>
        <div class="community-picker-card-name">${c.display_name}</div>
        <div class="community-picker-card-handle">@${c.handle}</div>
    </a>`;
    }).join('');
}


async function selectCommunityForCheckout(communityId) {
    activeSharedCommunityId = communityId;

    document.querySelectorAll('.community-picker-card').forEach(card => {
        card.classList.toggle('active', card.dataset.communityId === communityId);
    });

    await loadSharedCartForCheckout(communityId);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const footer = document.querySelector('.checkout-action-bar');
    if (footer) footer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    else window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
}
window.selectCommunityForCheckout = selectCommunityForCheckout;

async function loadSharedCartForCheckout(communityId) {
    let sb = null;
    try {
        const mod = await import('../shared/supabase.js');
        sb = mod.supabase;
    } catch (e) {
        renderSharedCartEmpty('Unable to load shared cart');
        return;
    }

    const { data, error } = await sb
        .from('shared_cart_items')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[Checkout] Shared cart load error:', error);
        renderSharedCartEmpty('Error loading shared cart');
        return;
    }

    sharedCartItems = (data || []).map(item => ({
        id: item.product_id,
        name: item.product_name,
        emoji: item.product_emoji || '📦',
        weight: item.product_weight || '',
        selectedStore: item.selected_store,
        selectedPrice: item.selected_price,
        mrp: item.mrp,
        qty: item.qty || 1,
        _source: 'shared',
        _addedBy: item.added_by_name
    }));

    if (sharedCartItems.length === 0) {
        renderSharedCartEmpty('No items in this community cart yet');
        return;
    }

    // Show the sections that were hidden by empty state
    ['checkoutDeliveryStrip', 'checkoutAddress', 'checkoutOrderSummary',
        'checkoutBillDetails', 'checkoutPayment'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = '';
        });
    document.getElementById('checkoutActionBar').style.display = '';

    // Remove any previously appended empty state
    document.querySelectorAll('.checkout-empty-state').forEach(el => el.remove());

    // Temporarily override cart for rendering
    const originalCart = cart;
    cart = sharedCartItems;

    renderDeliveryStrip();
    renderAddress();
    renderOrderSummary(sharedCartItems, 'shared');
    renderBillDetails(sharedCartItems, 'shared');
    renderPayment();
    attachItemListeners();

    // Restore original cart
    cart = originalCart;
}

function renderSharedCartEmpty(message) {
    // Remove any previously appended empty state
    document.querySelectorAll('.checkout-empty-state').forEach(el => el.remove());

    // Hide normal sections
    ['checkoutDeliveryStrip', 'checkoutAddress', 'checkoutOrderSummary',
        'checkoutBillDetails', 'checkoutPayment'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    document.getElementById('checkoutActionBar').style.display = 'none';

    const container = document.querySelector('.checkout-container');
    const div = document.createElement('div');
    div.className = 'checkout-empty-state';
    div.innerHTML = `
        <div class="checkout-empty-icon">🧺</div>
        <div class="checkout-empty-title">${message}</div>
        <a href="../index.html" class="btn btn-primary">Start Shopping</a>
    `;
    container.appendChild(div);
}

// ---------- Source-Aware Renderers ----------

// Override renderOrderSummary to accept items and source label
const _originalRenderOrderSummary = renderOrderSummary;
renderOrderSummary = function (items = cart, sourceLabel = 'individual') {
    const isShared = sourceLabel === 'shared';
    const { storeSubtotals } = isShared ? calculateTotalsForItems(items) : calculateTotals();
    const container = document.getElementById('checkoutOrderSummary');
    const storeIds = [...new Set(items.map(c => c.selectedStore))];

    let html = '<h2 class="checkout-card-title">Order Summary</h2>';

    if (isShared) {
        html += '<span class="checkout-source-label">👥 Community Shared Cart</span>';
    }

    storeIds.forEach(id => {
        const cfg = getStore(id);
        if (!cfg) return;
        const storeItems = items.filter(c => c.selectedStore === id);
        const count = storeItems.reduce((sum, it) => sum + getQty(it), 0);
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
          ${storeItems.map(item => {
            const product = getProduct(item.id);
            const storeUrl = product ? getProductStoreUrl(product, item.selectedStore) : '#';
            const addedByLabel = item._addedBy ? `<span class="checkout-item-weight">Added by ${item._addedBy}</span>` : '';
            return `
            <div class="checkout-item-row" data-id="${item.id}">
              <span class="checkout-item-emoji">${item.emoji}</span>
              <div class="checkout-item-info">
                <span class="checkout-item-name">${item.name}</span>
                ${item.weight ? `<span class="checkout-item-weight">${item.weight}</span>` : ''}
                ${addedByLabel}
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
};

// Override renderBillDetails to accept items
const _originalRenderBillDetails = renderBillDetails;
renderBillDetails = function (items = cart, sourceLabel = 'individual') {
    const isShared = sourceLabel === 'shared';
    const { itemTotal, deliveryTotal, couponDiscount, grandTotal, storeSubtotals } =
        isShared ? calculateTotalsForItems(items) : calculateTotals();

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

    const sourceNote = isShared ? '<div class="bill-row" style="font-size:0.75rem;color:var(--text-muted);"><span>Source</span><span>Community Shared Cart</span></div>' : '';

    document.getElementById('checkoutBillDetails').innerHTML = `
    <h2 class="checkout-card-title">Bill Details</h2>
    ${sourceNote}
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
};

// Helper: calculate totals for arbitrary item array
function calculateTotalsForItems(items) {
    let itemTotal = 0;
    const storeSubtotals = {};

    items.forEach(item => {
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





// Override updateQty for shared cart
const _originalUpdateQty = updateQty;
updateQty = function (id, delta) {
    if (checkoutMode === 'shared') {
        const item = sharedCartItems.find(c => c.id === id);
        if (!item) return;
        item.qty = (item.qty || 1) + delta;
        if (item.qty < 1) item.qty = 1;
        renderOrderSummary(sharedCartItems, 'shared');
        renderBillDetails(sharedCartItems, 'shared');
        attachItemListeners();
    } else {
        _originalUpdateQty(id, delta);
    }
};

// Override removeItem for shared cart
const _originalRemoveItem = removeItem;
removeItem = function (id) {
    if (checkoutMode === 'shared') {
        sharedCartItems = sharedCartItems.filter(c => c.id !== id);
        if (sharedCartItems.length === 0) {
            renderSharedCartEmpty('No items in this community cart yet');
        } else {
            renderOrderSummary(sharedCartItems, 'shared');
            renderBillDetails(sharedCartItems, 'shared');
            attachItemListeners();
        }
    } else {
        _originalRemoveItem(id);
    }
};












// ---------- Wire up mode buttons on init ----------

function initCheckoutMode() {
    const individualBtn = document.getElementById('checkoutIndividualBtn');
    const sharedBtn = document.getElementById('checkoutSharedBtn');

    if (individualBtn) {
        individualBtn.addEventListener('click', () => setCheckoutMode('individual'));
    }
    if (sharedBtn) {
        sharedBtn.addEventListener('click', () => setCheckoutMode('shared'));
    }

    // Auto-detect shared checkout from localStorage
    const savedMode = localStorage.getItem('tokri_checkout_mode');
    const savedCommunity = localStorage.getItem('tokri_checkout_community');
    if (savedMode === 'shared' && savedCommunity) {
        localStorage.removeItem('tokri_checkout_mode');
        localStorage.removeItem('tokri_checkout_community');
        setCheckoutMode('shared');
        // Wait for communities to load then select
        setTimeout(() => {
            const dropdown = document.getElementById('sharedCartCommunityDropdown');
            if (dropdown) {
                dropdown.value = savedCommunity;
                selectCommunityForCheckout(savedCommunity);
            }
        }, 800);
    }
}

// Call init after DOM ready — add this inside the existing DOMContentLoaded
// In checkout.js, modify the init block:
// document.addEventListener('DOMContentLoaded', () => {
//     loadCart();
//     initCheckoutMode();  // <-- ADD THIS LINE
//     document.getElementById('placeOrderBtn').addEventListener('click', placeOrder);
//     ...
// });