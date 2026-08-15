// ============================================================
//  shared/community-cart.js  |  Shared Community Cart Module
// ============================================================

let supabase = null;
try {
    const module = await import('./supabase.js');
    supabase = module.supabase;
} catch (err) {
    console.warn('[CommunityCart] Supabase not available:', err.message);
}

// ---------- State ----------
let activeCommunityId = null;
let sharedCartRealtimeChannel = null;
let sharedCartItems = [];

// ---------- Product Data ----------
const CC_PRODUCTS = [
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

const CC_STORES = [
    { id: 'blinkit', name: 'Blinkit', dot: 'blinkit', delivery: '10 min' },
    { id: 'zepto', name: 'Zepto', dot: 'zepto', delivery: '10 min' },
    { id: 'swiggy', name: 'Swiggy Instamart', dot: 'swiggy', delivery: '15 min' },
    { id: 'bigbasket', name: 'BigBasket', dot: 'bigbasket', delivery: '30 min' },
    { id: 'jiomart', name: 'JioMart', dot: 'jiomart', delivery: '60 min' },
    { id: 'flipkart', name: 'Flipkart Minutes', dot: 'flipkart', delivery: '20 min' },
];

function ccGetStore(id) { return CC_STORES.find(s => s.id === id); }
function ccGetProduct(id) { return CC_PRODUCTS.find(p => p.id === id); }
function ccFormatPrice(n) { return '₹' + Math.round(n); }

// ============================================================
//  PUBLIC API
// ============================================================

export async function loadSharedCart(communityId, containerId = 'sharedCartBody') {
    if (!supabase) {
        renderSharedCartUnavailable(containerId);
        return;
    }

    activeCommunityId = communityId;

    if (sharedCartRealtimeChannel) {
        sharedCartRealtimeChannel.unsubscribe();
        sharedCartRealtimeChannel = null;
    }

    await refetchAndRender(containerId);

    sharedCartRealtimeChannel = supabase
        .channel('shared-cart-' + communityId)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'shared_cart_items',
                filter: `community_id=eq.${communityId}`,
            },
            () => refetchAndRender(containerId)
        )
        .subscribe();
}

export function unloadSharedCart() {
    if (sharedCartRealtimeChannel) {
        sharedCartRealtimeChannel.unsubscribe();
        sharedCartRealtimeChannel = null;
    }
    activeCommunityId = null;
    sharedCartItems = [];
}

export async function addToSharedCart(productId, selectedStore, qty = 1) {
    if (!supabase || !activeCommunityId) return { error: 'No active community' };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not signed in' };

    const product = ccGetProduct(productId);
    if (!product) return { error: 'Product not found' };

    const price = product.prices[selectedStore];
    if (price === null || price === undefined) return { error: 'Product unavailable at store' };

    const { data, error } = await supabase
        .from('shared_cart_items')
        .insert({
            community_id: activeCommunityId,
            product_id: product.id,
            product_name: product.name,
            product_weight: product.weight || '',
            product_emoji: product.emoji || '',
            selected_store: selectedStore,
            selected_price: price,
            mrp: product.mrp || 0,
            qty: qty,
            added_by: user.id,
            added_by_name: user.email?.split('@')[0] || 'Member',
        })
        .select()
        .single();

    return { data, error };
}

export async function removeFromSharedCart(itemId) {
    if (!supabase) return { error: 'Supabase unavailable' };
    const { error } = await supabase
        .from('shared_cart_items')
        .delete()
        .eq('id', itemId);
    return { error };
}

export async function updateSharedCartQty(itemId, qty) {
    if (!supabase) return { error: 'Supabase unavailable' };
    if (qty < 1) qty = 1;
    const { error } = await supabase
        .from('shared_cart_items')
        .update({ qty })
        .eq('id', itemId);
    return { error };
}

// ============================================================
//  INTERNALS
// ============================================================

async function refetchAndRender(containerId = 'sharedCartBody') {
    if (!supabase || !activeCommunityId) return;

    const { data, error } = await supabase
        .from('shared_cart_items')
        .select('*')
        .eq('community_id', activeCommunityId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[CommunityCart] Fetch error:', error);
        return;
    }

    sharedCartItems = data || [];
    renderSharedCartItems(sharedCartItems, containerId);
}

export function renderSharedCartItems(items, containerId = 'sharedCartBody') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = `
      <div class="cart-empty">
        <span class="cart-empty-icon">🧺</span>
        <p>No shared items yet</p>
        <span class="cart-empty-hint">Items added by community members will appear here</span>
      </div>`;
        return;
    }

    const storeIds = [...new Set(items.map(i => i.selected_store))];

    container.innerHTML = storeIds.map(storeId => {
        const store = ccGetStore(storeId);
        const storeItems = items.filter(i => i.selected_store === storeId);
        const subtotal = storeItems.reduce((s, i) => s + i.selected_price * i.qty, 0);

        return `
      <div class="cart-store-group">
        <div class="cart-store-header">
          <span class="store-dot store-dot--${store?.dot || 'blinkit'}"></span>
          <span class="cart-store-name">${store?.name || storeId}</span>
          <span class="cart-store-delivery">${store?.delivery || ''}</span>
          <span class="cart-store-count">${storeItems.length} ${storeItems.length === 1 ? 'item' : 'items'}</span>
          <span class="cart-store-subtotal">${ccFormatPrice(subtotal)}</span>
        </div>
        <div class="cart-store-items">
          ${storeItems.map(item => `
            <div class="cart-item" data-shared-item-id="${item.id}">
              <span class="cart-item-emoji">${item.product_emoji || '📦'}</span>
              <div class="cart-item-info">
                <div class="cart-item-name">${item.product_name}</div>
                <div class="cart-item-store">${item.product_weight || ''} · via ${store?.name || item.selected_store}</div>
                <div class="cart-item-added-by">Added by ${item.added_by_name || 'Member'}</div>
              </div>
              <span class="cart-item-price">${ccFormatPrice(item.selected_price * item.qty)}</span>
              <button class="cart-item-remove" data-shared-remove data-id="${item.id}" title="Remove" aria-label="Remove ${item.product_name}">&times;</button>
            </div>
          `).join('')}
        </div>
      </div>`;
    }).join('');

    container.querySelectorAll('[data-shared-remove]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            await removeFromSharedCart(id);
        });
    });
}

function renderSharedCartUnavailable(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
    <div class="cart-empty">
      <span class="cart-empty-icon">🔌</span>
      <p>Shared cart unavailable</p>
      <span class="cart-empty-hint">Sign in to see your community's shared cart</span>
    </div>`;
}