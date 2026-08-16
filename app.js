// Dynamic import with fallback — if Supabase CDN fails, app still works
let supabase = null;

try {
  const module = await import('./shared/supabase.js');
  supabase = module.supabase;
} catch (err) {
  console.warn('[Tokri] Supabase not available — community features disabled:', err.message);
}

// ============================================================
//  Tokri – Compare  |  Demo App Logic
//  All data is mock / hardcoded for concept demonstration.
//
//  This JavaScript file handles ALL the interactivity for the
//  Tokri Compare webapp. It includes:
//    - Mock product & store data (no real APIs)
//    - Product card rendering (dynamically building HTML)
//    - Search, filter, and sort functionality
//    - Shopping cart (add/remove/calculate totals)
//    - Theme toggle (dark/light mode)
//    - Keyboard shortcut (Ctrl+K to focus search)
//
//  CONCEPTS USED IN THIS FILE:
//    - const / let          → block-scoped variable declarations
//    - Arrow functions      → concise function syntax: (x) => x * 2
//    - Template literals    → backtick strings with ${expression} interpolation
//    - Destructuring        → extracting values: const [a, b] = array
//    - Optional chaining    → obj?.prop (returns undefined instead of error)
//    - Nullish coalescing   → value ?? fallback (uses fallback if null/undefined)
//    - Array methods        → .map(), .filter(), .find(), .some(), .reduce(), .sort()
//    - Object.entries()     → converts {key: val} into [[key, val], ...] array
//    - Spread operator      → [...array] creates a shallow copy
//    - Set                  → collection of unique values (used to deduplicate)
//    - classList             → DOM API to add/remove/toggle CSS classes
//    - innerHTML            → sets the HTML content of an element
//    - addEventListener     → attaches an event handler to a DOM element
//    - document.getElementById / querySelectorAll → DOM selection methods
// ============================================================




// ============================================================
//  SECTION 1: MOCK STORE DATA
// ============================================================
//
//  "const" declares a variable that cannot be reassigned later.
//  Unlike "let", you cannot do: STORES = somethingElse;
//
//  Each store object has:
//    - id:       unique identifier used as a key in product price objects
//    - name:     human-readable display name
//    - dot:      CSS class suffix for the colored dot indicator (e.g., store-dot--blinkit)
//    - delivery: estimated delivery time string shown to the user
//
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




// ============================================================
//  SECTION 2: MOCK PRODUCT DATA
// ============================================================
//
//  Each product object has:
//    - id:       unique numeric identifier
//    - name:     product display name
//    - weight:   quantity/size description
//    - emoji:    visual emoji used as the product thumbnail
//    - category: used for category filter pills (matches data-cat attributes in HTML)
//    - prices:   an object mapping store IDs → price in ₹ (null = unavailable at that store)
//    - mrp:      Maximum Retail Price — the "original" price before any discount
//
//  NOTE: "null" in prices means that specific store doesn't carry this product.
//        This is handled in the rendering logic to show "Unavailable" text.
//
const PRODUCTS = [
  {
    id: 1, name: 'Amul Toned Milk', weight: '1 L Pouch', emoji: '🥛', category: 'dairy',
    prices: { blinkit: 32, zepto: 31, swiggy: 33, bigbasket: 30, jiomart: 29, flipkart: 33 },
    mrp: 34,
  },

  {
    id: 2, name: 'Aashirvaad Whole Wheat Atta', weight: '5 kg', emoji: '🌾', category: 'atta',
    prices: { blinkit: 265, zepto: 272, swiggy: 269, bigbasket: 259, jiomart: 255, flipkart: null },
    mrp: 290,
  },

  {
    id: 3, name: 'Fortune Sunflower Oil', weight: '1 L', emoji: '🫒', category: 'oil',
    prices: { blinkit: 139, zepto: 142, swiggy: 135, bigbasket: 138, jiomart: 140, flipkart: 145 },
    mrp: 155,
  },

  {
    id: 4, name: 'Shimla Apples', weight: '1 kg (4-5 pcs)', emoji: '🍎', category: 'fruits',
    prices: { blinkit: 165, zepto: 159, swiggy: 170, bigbasket: 155, jiomart: 162, flipkart: 168 },
    mrp: 180,
  },

  {
    id: 5, name: 'Haldiram\'s Aloo Bhujia', weight: '200 g', emoji: '🍿', category: 'snacks',
    prices: { blinkit: 55, zepto: 50, swiggy: 56, bigbasket: 52, jiomart: 53, flipkart: 54 },
    mrp: 60,
  },

  {
    id: 6, name: 'Coca-Cola', weight: '750 ml Bottle', emoji: '🥤', category: 'beverages',
    prices: { blinkit: 38, zepto: 40, swiggy: 38, bigbasket: 35, jiomart: 36, flipkart: 39 },
    mrp: 42,
  },

  {
    id: 7, name: 'Spinach (Palak)', weight: '250 g', emoji: '🥬', category: 'vegetables',
    prices: { blinkit: 18, zepto: 20, swiggy: 24, bigbasket: 22, jiomart: 25, flipkart: null },
    mrp: 30,
  },

  {
    id: 8, name: 'Amul Butter', weight: '500 g Carton', emoji: '🧈', category: 'dairy',
    prices: { blinkit: 270, zepto: 275, swiggy: 268, bigbasket: 265, jiomart: 262, flipkart: 278 },
    mrp: 285,
  },

  {
    id: 9, name: 'Maggi 2-Minute Noodles', weight: 'Family Pack (8×70g)', emoji: '🍜', category: 'snacks',
    prices: { blinkit: 90, zepto: 99, swiggy: 95, bigbasket: 92, jiomart: 96, flipkart: 98 },
    mrp: 112,
  },

  {
    id: 10, name: 'Dettol Liquid Handwash', weight: '900 ml Refill', emoji: '🧴', category: 'personal',
    prices: { blinkit: 95, zepto: 105, swiggy: 102, bigbasket: 99, jiomart: 97, flipkart: null },
    mrp: 120,
  },

  {
    id: 11, name: 'Harpic Power Plus', weight: '1 L', emoji: '🧹', category: 'cleaning',
    prices: { blinkit: 115, zepto: 118, swiggy: 120, bigbasket: 110, jiomart: 108, flipkart: 122 },
    mrp: 130,
  },

  {
    id: 12, name: 'India Gate Basmati Rice', weight: '5 kg', emoji: '🍚', category: 'atta',
    prices: { blinkit: 450, zepto: 465, swiggy: 435, bigbasket: 455, jiomart: 440, flipkart: 470 },
    mrp: 499,
  },

  {
    id: 13, name: 'Bananas', weight: '1 Dozen', emoji: '🍌', category: 'fruits',
    prices: { blinkit: 45, zepto: 42, swiggy: 48, bigbasket: 40, jiomart: 44, flipkart: 46 },
    mrp: 55,
  },

  {
    id: 14, name: 'Amul Paneer', weight: '200 g Block', emoji: '🧀', category: 'dairy',
    prices: { blinkit: 90, zepto: 88, swiggy: 92, bigbasket: 85, jiomart: 87, flipkart: 95 },
    mrp: 100,
  },

  {
    id: 15, name: 'Tropicana Orange Juice', weight: '1 L Tetra Pack', emoji: '🧃', category: 'beverages',
    prices: { blinkit: 99, zepto: 90, swiggy: 102, bigbasket: 95, jiomart: 92, flipkart: null },
    mrp: 110,
  },

  {
    id: 16, name: 'Tomatoes', weight: '1 kg', emoji: '🍅', category: 'vegetables',
    prices: { blinkit: 28, zepto: 25, swiggy: 30, bigbasket: 22, jiomart: 26, flipkart: 32 },
    mrp: 40,
  },

  {
    id: 17, name: 'Lay\'s Classic Salted', weight: 'Party Pack 190 g', emoji: '🥔', category: 'snacks',
    prices: { blinkit: 70, zepto: 72, swiggy: 78, bigbasket: 75, jiomart: 73, flipkart: 76 },
    mrp: 85,
  },

  {
    id: 18, name: 'Surf Excel Matic Liquid', weight: '1 L Front Load', emoji: '🫧', category: 'cleaning',
    prices: { blinkit: 210, zepto: 215, swiggy: 220, bigbasket: 199, jiomart: 205, flipkart: 225 },
    mrp: 240,
  },
];




// ============================================================
//  SECTION 3: APPLICATION STATE
// ============================================================
//
//  "let" declares a variable that CAN be reassigned later.
//  We use "let" here because the cart array will be modified
//  (items added/removed) and activeCategory will change when
//  the user clicks different category pills.
//
//  cart:           An array holding objects for each item added to the smart cart.
//  activeCategory: A string tracking which category pill is currently selected.
//                  Defaults to 'all' which shows every product.
//
let cart = [];
let activeCategory = 'all';
// Stores the chosen store for each product before it is added to the cart.
// Products default to their cheapest available store until the shopper changes it.
let productSelections = {};




// ============================================================
//  SECTION 4: UTILITY / HELPER FUNCTIONS
// ============================================================


// ----------------------------------------------------------
//  getBestPrice(prices)
// ----------------------------------------------------------
//  PURPOSE: Given a product's prices object (e.g., { blinkit: 32, zepto: 31, ... }),
//           find which store has the LOWEST price.
//
//  HOW IT WORKS:
//    1. Start with Infinity as the "best" price (so any real price will be lower).
//    2. Object.entries(prices) converts { blinkit: 32, zepto: 31 } into:
//       [ ["blinkit", 32], ["zepto", 31], ... ]
//    3. Destructuring: const [storeId, price] extracts the key and value from each pair.
//    4. Skip null prices (product unavailable at that store).
//    5. If this price is lower than current best, update the best.
//
//  RETURNS: An object like { store: "jiomart", price: 29 }
//
function getBestPrice(prices) {
  let best = { store: null, price: Infinity };
  for (const [storeId, price] of Object.entries(prices)) {
    if (price !== null && price < best.price) {
      best = { store: storeId, price };
    }
  }
  return best;
}


// ----------------------------------------------------------
//  getStoreName(id)
// ----------------------------------------------------------
//  PURPOSE: Convert a store ID string (e.g., "blinkit") into its
//           display name (e.g., "Blinkit").
//
//  HOW IT WORKS:
//    - STORES.find(s => s.id === id) searches the STORES array for the matching store.
//    - The arrow function (s => s.id === id) is a concise callback:
//      it receives each store object "s" and returns true if s.id matches.
//    - ?. is OPTIONAL CHAINING: if .find() returns undefined (no match),
//      instead of crashing with "Cannot read property 'name' of undefined",
//      it safely returns undefined.
//    - ?? is NULLISH COALESCING: if the left side is null or undefined,
//      it falls back to the right side (the raw id string).
//
function getStoreName(id) {
  return STORES.find(s => s.id === id)?.name ?? id;
}


// ----------------------------------------------------------
//  getStoreDelivery(id)
// ----------------------------------------------------------
//  PURPOSE: Get the delivery time string for a store by its ID.
//  WORKS THE SAME WAY as getStoreName, but returns the .delivery property.
//
function getStoreDelivery(id) {
  return STORES.find(s => s.id === id)?.delivery ?? '';
}

function getProductStoreUrl(product, storeId) {
  const query = `${product.name} ${product.weight}`;
  return `${STORE_SEARCH_URLS[storeId]}${encodeURIComponent(query)}`;
}

function getAvailableStores(product) {
  return STORES.filter(store => product.prices[store.id] !== null);
}

function getSelectedStore(product) {
  return productSelections[product.id] ?? getBestPrice(product.prices).store;
}

function getSelectedPrice(product) {
  return product.prices[getSelectedStore(product)];
}

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




// ============================================================
//  SECTION 5: RENDER A SINGLE PRODUCT CARD
// ============================================================
//
//  renderProductCard(product)
//
//  PURPOSE: Takes a single product object and returns an HTML string
//           representing the full product comparison card.
//
//  KEY CONCEPTS:
//    - Template literals (backticks `...`): Allow multi-line strings and
//      embedded expressions via ${...}. Much cleaner than string concatenation.
//    - Ternary operator (condition ? valueIfTrue : valueIfFalse):
//      Used inline to conditionally add CSS classes or text.
//    - String interpolation: ${product.name} inserts the product's name
//      directly into the HTML string.
//
function renderProductCard(product) {

  // Find the cheapest store and its price for this product
  const best = getBestPrice(product.prices);
  const selectedStore = getSelectedStore(product);
  const selectedPrice = getSelectedPrice(product);

  // Calculate how much the user saves compared to MRP
  const saving = product.mrp - best.price;

  // Check if this product is already in the cart
  //  .some() returns true if ANY element in the array satisfies the condition.
  //  It's like .find() but returns a boolean instead of the element itself.
  const inCart = cart.some(c => c.id === product.id);


  // Build the price comparison rows (one per store)
  let priceRowsHTML = '';

  for (const store of STORES) {

    // Look up this store's price for the current product
    const price = product.prices[store.id];

    // Is this the store with the best (lowest) price?
    const isBest = store.id === best.store;
    const isSelected = store.id === selectedStore;

    if (price === null) {
      // Product is unavailable at this store — show "Unavailable" text
      priceRowsHTML += `
        <div class="price-row">
          <span class="price-store"><a class="price-store-link" href="${getProductStoreUrl(product, store.id)}" target="_blank" rel="noopener noreferrer" aria-label="Search ${product.name} on ${store.name}" title="Open ${store.name}">↗</a><span class="store-dot store-dot--${store.dot}"></span>${store.name}</span>
          <span class="price-unavailable">Unavailable</span>
        </div>`;
    } else {
      // Product IS available — show the price
      //  - The ternary (isBest ? ' best' : '') adds the "best" CSS class
      //    to highlight the cheapest row with a green background.
      //  - Similarly (isBest ? ' best-price' : '') colors the price text green.
      priceRowsHTML += `
        <div class="price-row${isBest ? ' best' : ''}${isSelected ? ' selected' : ''}">
          <span class="price-store"><a class="price-store-link" href="${getProductStoreUrl(product, store.id)}" target="_blank" rel="noopener noreferrer" aria-label="Search ${product.name} on ${store.name}" title="Open ${store.name}">↗</a><span class="store-dot store-dot--${store.dot}"></span>${store.name}</span>
          <span class="price-delivery">${store.delivery}</span>
          <span class="price-amount${isBest ? ' best-price' : ''}">₹${price}</span>
        </div>`;
    }
  }


  // Return the complete card HTML
  //  - data-id and data-category are HTML5 "data attributes" — custom attributes
  //    prefixed with "data-" that store extra info on elements. They can be accessed
  //    in JS via element.dataset.id and element.dataset.category.
  //  - onclick="toggleCartItem(${product.id})" is an inline event handler
  //    that calls the toggleCartItem function when the button is clicked.
  return `
    <div class="product-card" data-id="${product.id}" data-category="${product.category}">
      <div class="product-card-top">
        <div class="product-emoji">${product.emoji}</div>
        <div class="product-info">
          <div class="product-name">${product.name}</div>
          <div class="product-weight">${product.weight} · MRP ₹${product.mrp}</div>
        </div>
        <span class="product-savings-badge">Save ₹${saving}</span>
      </div>
      <div class="price-rows">${priceRowsHTML}</div>
      <div class="product-card-actions">
        <button class="btn-add-community" type="button" data-community-add-toggle="${product.id}"
          title="Add to community cart">Add · Community</button>
        <button class="btn-add-best${inCart ? ' added' : ''}" type="button" data-cart-toggle data-id="${product.id}">
          ${inCart ? '✓ Added' : `Add · ${getStoreName(selectedStore)} ₹${selectedPrice}`}
        </button>
        ${renderStorePicker(product, selectedStore, 'product')}
      </div>
    </div>`;
}




// ============================================================
//  SECTION 6: RENDER THE FULL PRODUCT GRID
// ============================================================
//
//  renderGrid(products)
//
//  PURPOSE: Takes an array of filtered/sorted products, converts each
//           to an HTML card string, and injects them into the DOM.
//
//  KEY CONCEPTS:
//    - document.getElementById('productGrid'): Selects the <div> with id="productGrid"
//      from the HTML. This is the container where all product cards go.
//    - .map(renderProductCard): Transforms each product object into its HTML string.
//      .map() creates a NEW array where each element is the return value of the callback.
//    - .join(''): Joins all the HTML strings into one big string with no separator.
//    - .innerHTML: Sets the raw HTML content of the element, replacing whatever was there before.
//
function renderGrid(products) {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = products.map(renderProductCard).join('');
}




// ============================================================
//  SECTION 7: FILTER, SEARCH & SORT PRODUCTS
// ============================================================
//
//  filterProducts()
//
//  PURPOSE: The main "refresh" function. It takes ALL products,
//           applies the active category filter, search query,
//           and sort order, then re-renders the grid.
//
//  This function is called whenever:
//    - A category pill is clicked
//    - The user types in the search bar
//    - The sort dropdown changes
//    - A cart item is added/removed (to update button states)
//
function filterProducts() {

  // Start with all products
  let filtered = PRODUCTS;


  // ----- CATEGORY FILTER -----
  //  If user selected a specific category (not "all"), keep only matching products.
  //  .filter() creates a new array containing only elements where the callback returns true.
  //  Arrow function: p => p.category === activeCategory
  //    "p" is each product, and we check if its category matches the active one.
  if (activeCategory !== 'all') {
    filtered = filtered.filter(p => p.category === activeCategory);
  }


  // ----- SEARCH FILTER -----
  //  Get the text the user typed in the search bar.
  //  .trim() removes whitespace from both ends: "  milk  " → "milk"
  //  .toLowerCase() converts to lowercase for case-insensitive matching.
  //  .includes(q) checks if the string contains the search query as a substring.
  const q = getSearchQuery();
  if (q) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.weight.toLowerCase().includes(q)
    );
  }


  // ----- SORT -----
  //  .value gets the currently selected option's value from the <select> dropdown.
  //  [...filtered] uses the SPREAD OPERATOR to create a shallow copy of the array.
  //    This is important because .sort() modifies the array IN PLACE (mutates it),
  //    and we don't want to mutate the original PRODUCTS array.
  //
  //  .sort((a, b) => ...) sorts an array using a comparator function:
  //    - If the function returns a NEGATIVE number, "a" comes first
  //    - If it returns a POSITIVE number, "b" comes first
  //    - If it returns 0, order is unchanged
  //
  //  .localeCompare() is a string comparison method that handles
  //    international characters correctly (e.g., accented letters).
  //
  //  "switch" is a control structure that matches a value against multiple cases.
  //  It's cleaner than a chain of if/else when checking one variable against many values.
  //
  const sort = document.getElementById('sortSelect').value;
  filtered = [...filtered];
  switch (sort) {
    case 'savings':
      // Sort by biggest savings first (descending: sb - sa)
      filtered.sort((a, b) => {
        const sa = a.mrp - getBestPrice(a.prices).price;
        const sb = b.mrp - getBestPrice(b.prices).price;
        return sb - sa;
      });
      break;
    case 'price-low':
      // Sort by cheapest best-price first (ascending)
      filtered.sort((a, b) => getBestPrice(a.prices).price - getBestPrice(b.prices).price);
      break;
    case 'price-high':
      // Sort by most expensive best-price first (descending)
      filtered.sort((a, b) => getBestPrice(b.prices).price - getBestPrice(a.prices).price);
      break;
    case 'name':
      // Sort alphabetically by product name
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }


  // Finally, render the filtered and sorted product cards
  renderGrid(filtered);
}




// ============================================================
//  SECTION 8: CATEGORY PILL CLICK HANDLERS
// ============================================================
//
//  document.querySelectorAll('.category-pill')
//    Selects ALL elements with class "category-pill" and returns a NodeList.
//
//  .forEach(pill => { ... })
//    Iterates over each pill element, attaching a click event listener.
//
//  addEventListener('click', callback)
//    Registers a function to run when the element is clicked.
//    This is the modern, preferred way to handle events (vs inline onclick="...").
//
//  classList.remove('active') / classList.add('active')
//    The classList API lets you add, remove, or toggle CSS classes on an element.
//    Here we remove 'active' from ALL pills first, then add it to the clicked one.
//
//  pill.dataset.cat
//    Accesses the "data-cat" HTML attribute value. For example:
//    <button data-cat="fruits"> → pill.dataset.cat returns "fruits"
//
document.querySelectorAll('.category-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    activeCategory = pill.dataset.cat;
    filterProducts();
  });
});




// ============================================================
//  SECTION 9: SEARCH INPUT EVENT LISTENER
// ============================================================
//
//  'input' event fires every time the value of the input changes
//  (on every keystroke, paste, etc.). We call filterProducts()
//  to re-render the grid with matching results in real-time.
//
function getSearchQuery() {
  return document.getElementById('searchInput').value.trim().toLowerCase();
}

document.querySelectorAll('.search-input').forEach(input => {
  input.addEventListener('input', event => {
    document.querySelectorAll('.search-input').forEach(otherInput => {
      if (otherInput !== event.target) otherInput.value = event.target.value;
    });
    filterProducts();
  });
});




// ============================================================
//  SECTION 10: SORT DROPDOWN EVENT LISTENER
// ============================================================
//
//  'change' event fires when the user selects a different option
//  in the <select> dropdown. We call filterProducts() to re-sort
//  and re-render the grid.
//
document.getElementById('sortSelect').addEventListener('change', filterProducts);




// ============================================================
//  SECTION 11: CART LOGIC — ADD / REMOVE / TOGGLE
// ============================================================


// ----------------------------------------------------------
//  toggleCartItem(id)
// ----------------------------------------------------------
//  PURPOSE: Add or remove a product from the cart.
//           Called when "⚡ Add Best Price" / "✓ Added" button is clicked.
//
//  HOW IT WORKS:
//    - .findIndex() searches the cart array and returns the INDEX of the
//      first element where the callback returns true. Returns -1 if not found.
//    - If found (idx > -1), we REMOVE it using .splice(idx, 1):
//      .splice(startIndex, deleteCount) removes elements from an array in place.
//    - If not found, we ADD a new cart item object with the best price info.
//    - Then we update the cart UI and re-render product grid (to toggle button states).
//
function toggleCartItemLegacy(id) {
  const idx = cart.findIndex(c => c.id === id);
  if (idx > -1) {
    cart.splice(idx, 1);
  } else {
    const product = PRODUCTS.find(p => p.id === id);
    const best = getBestPrice(product.prices);
    cart.push({
      id: product.id,
      name: product.name,
      emoji: product.emoji,
      selectedStore: best.store,
      selectedPrice: best.price,
      mrp: product.mrp,
    });
  }
  updateCartUI();
  filterProducts(); // re-render buttons
}


// ----------------------------------------------------------
//  removeCartItem(id)
// ----------------------------------------------------------
//  PURPOSE: Remove a specific item from the cart (called from the ✕ button
//           inside the cart panel).
//
//  .filter() creates a NEW array excluding the item with the matching id.
//  This effectively "removes" the item by replacing the cart with a filtered copy.
//
function removeCartItemLegacy(id) {
  cart = cart.filter(c => c.id !== id);
  updateCartUI();
  filterProducts();
}


// ----------------------------------------------------------
//  updateCartUI()
// ----------------------------------------------------------
//  PURPOSE: Refreshes the entire cart panel UI — the badge count,
//           the list of cart items, and the summary totals.
//
//  KEY CONCEPTS:
//    - .textContent: Sets the text content of an element (no HTML parsing).
//    - .style.display: Directly sets the CSS display property via JavaScript.
//    - .reduce((accumulator, item) => accumulator + item.value, initialValue):
//      Iterates over an array and "reduces" it to a single value.
//      Here we use it to sum up all MRP values and all best prices.
//      The second argument (0) is the starting value of the accumulator.
//    - Template literals for building cart item HTML with ${} interpolation.
//
function updateCartUILegacy() {

  // Update the badge count number on the cart icon in the header
  document.getElementById('cartCount').textContent = cart.length;


  // Get references to the cart body (scrollable area) and footer (totals area)
  const body = document.getElementById('cartBody');
  const footer = document.getElementById('cartFooter');


  // If cart is empty, show the empty state message and hide the footer
  if (cart.length === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        <span class="cart-empty-icon">🛒</span>
        <p>Your cart is empty</p>
        <span class="cart-empty-hint">Add items from the comparison table to start saving</span>
      </div>`;
    footer.style.display = 'none';
    return;   // "return" exits the function early — no need to calculate totals
  }


  // Cart has items — render each as a row in the panel
  //  .map() transforms each cart item into its HTML string.
  //  .join('') concatenates all strings without any separator.
  body.innerHTML = cart.map(item => `
    <div class="cart-item">
      <span class="cart-item-emoji">${item.emoji}</span>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-store">via ${getStoreName(item.selectedStore)} · ${getStoreDelivery(item.selectedStore)}</div>
      </div>
      <span class="cart-item-price">₹${item.selectedPrice}</span>
      <button class="cart-item-remove" onclick="removeCartItem(${item.id})" title="Remove">&times;</button>
    </div>
  `).join('');


  // Calculate totals using .reduce()
  //  (s, i) => s + i.mrp  means: for each item "i", add its mrp to the running sum "s"
  //  Starting sum is 0.
  const mrpTotal = cart.reduce((s, i) => s + i.mrp, 0);
  const bestTotal = cart.reduce((s, i) => s + i.selectedPrice, 0);
  const savings = mrpTotal - bestTotal;


  // Update the summary text in the cart footer
  document.getElementById('cartItemCount').textContent = cart.length;
  document.getElementById('cartMrpTotal').textContent = `₹${mrpTotal}`;
  document.getElementById('cartSavings').textContent = `– ₹${savings}`;
  document.getElementById('cartTotal').textContent = `₹${bestTotal}`;

  // Show the footer (it was hidden when cart was empty)
  footer.style.display = 'block';
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
  const product = PRODUCTS.find(item => item.id === Number(productId));
  if (!product || product.prices[storeId] === null || product.prices[storeId] === undefined) return;

  productSelections[product.id] = storeId;
  const cartItem = cart.find(item => item.id === product.id);
  if (cartItem) {
    cartItem.selectedStore = storeId;
    cartItem.selectedPrice = product.prices[storeId];
    updateCartUI();
  }
  filterProducts();
}

function toggleCartItem(id) {
  const idx = cart.findIndex(item => item.id === id);
  if (idx > -1) {
    cart.splice(idx, 1);
  } else {
    const product = PRODUCTS.find(item => item.id === id);
    const selectedStore = getSelectedStore(product);
    cart.push({
      id: product.id,
      name: product.name,
      emoji: product.emoji,
      mrp: product.mrp,
      selectedStore,
      selectedPrice: product.prices[selectedStore],
    });
  }
  updateCartUI();
  filterProducts();
}

function removeCartItem(id) {
  cart = cart.filter(item => item.id !== Number(id));
  updateCartUI();
  filterProducts();
}

function renderCartItem(item) {
  const product = PRODUCTS.find(productItem => productItem.id === item.id);
  return `
    <div class="cart-item">
      <span class="cart-item-emoji">${item.emoji}</span>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-store">${getStoreDelivery(item.selectedStore)} delivery</div>
      </div>
      <span class="cart-item-price">₹${item.selectedPrice}</span>
      ${renderStorePicker(product, item.selectedStore, 'cart')}
      <button class="cart-item-remove" type="button" data-cart-remove data-id="${item.id}" title="Remove" aria-label="Remove ${item.name}">&times;</button>
    </div>`;
}

function updateCartUI() {
  document.getElementById('cartCount').textContent = cart.length;
  const body = document.getElementById('cartBody');
  const footer = document.getElementById('cartFooter');

  if (!cart.length) {
    body.innerHTML = `<div class="cart-empty">
      <span class="cart-empty-icon">🛒</span>
      <p>Your cart is empty</p>
      <span class="cart-empty-hint">Add items from the comparison table to start saving</span>
    </div>`;
    footer.style.display = 'none';
    return;
  }

  body.innerHTML = STORES.map(store => {
    const items = cart.filter(item => item.selectedStore === store.id);
    if (!items.length) return '';
    const subtotal = items.reduce((sum, item) => sum + item.selectedPrice, 0);
    return `<section class="cart-store-group">
      <div class="cart-store-header">
        <span class="store-dot store-dot--${store.dot}"></span>
        <span class="cart-store-name">${store.name}</span>
        <span class="cart-store-delivery">${store.delivery}</span>
        <span class="cart-store-count">${items.length} ${items.length === 1 ? 'item' : 'items'}</span>
        <span class="cart-store-subtotal">₹${subtotal}</span>
      </div>
      <div class="cart-store-items">${items.map(renderCartItem).join('')}</div>
    </section>`;
  }).join('');

  const mrpTotal = cart.reduce((sum, item) => sum + item.mrp, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.selectedPrice, 0);
  const savings = mrpTotal - cartTotal;
  document.getElementById('cartItemCount').textContent = cart.length;
  document.getElementById('cartMrpTotal').textContent = `₹${mrpTotal}`;
  document.getElementById('cartSavings').textContent = `– ₹${savings}`;
  document.getElementById('cartTotal').textContent = `₹${cartTotal}`;
  footer.style.display = 'block';
}

document.getElementById('productGrid').addEventListener('click', event => {
  const storeOption = event.target.closest('[data-store-option]');
  if (storeOption) {
    event.stopPropagation();
    setProductStore(storeOption.dataset.productId, storeOption.dataset.storeId);
    return;
  }
  const pickerButton = event.target.closest('[data-store-picker-toggle]');
  if (pickerButton) {
    event.stopPropagation();
    toggleStorePicker(pickerButton);
    return;
  }
  const cartButton = event.target.closest('[data-cart-toggle]');




  const communityButton = event.target.closest('[data-community-add-toggle]');
  if (communityButton) {
    event.stopPropagation();
    const productId = Number(communityButton.dataset.communityAddToggle);
    openInlineCommunityPicker(productId, communityButton);
    return;
  }





  if (cartButton) toggleCartItem(Number(cartButton.dataset.id));
});

document.getElementById('cartBody').addEventListener('click', event => {
  const storeOption = event.target.closest('[data-store-option]');
  if (storeOption) {
    event.stopPropagation();
    setProductStore(storeOption.dataset.productId, storeOption.dataset.storeId);
    return;
  }
  const pickerButton = event.target.closest('[data-store-picker-toggle]');
  if (pickerButton) {
    event.stopPropagation();
    toggleStorePicker(pickerButton);
    return;
  }
  const removeButton = event.target.closest('[data-cart-remove]');
  if (removeButton) removeCartItem(removeButton.dataset.id);
});

document.addEventListener('click', event => {
  if (!event.target.closest('.store-picker-wrap')) closeStorePickers();
});

// ============================================================
//  SECTION 12: CART PANEL SLIDE-IN / SLIDE-OUT
// ============================================================
//
//  The cart panel is a fixed-position sidebar that slides in from the right.
//  It starts off-screen (right: -420px in CSS) and slides to right: 0
//  when the "open" class is added.
//
//  The overlay is a semi-transparent dark backdrop that covers the page
//  behind the cart panel. Clicking it closes the cart.
//

function openCart() {
  document.getElementById('cartPanel').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
}


function closeCart() {
  document.getElementById('cartPanel').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
}


// Attach click handlers to the cart button, close button, and overlay
document.getElementById('cartBtn').addEventListener('click', openCart);
document.getElementById('cartClose').addEventListener('click', closeCart);
document.getElementById('cartOverlay').addEventListener('click', closeCart);




// ============================================================
//  SECTION 13: THEME TOGGLE (DARK / LIGHT MODE)
// ============================================================
//
//  HOW IT WORKS:
//    1. document.documentElement refers to the <html> element.
//    2. We read the current "data-theme" attribute (set in HTML as data-theme="dark").
//    3. Toggle between "dark" and "light".
//    4. setAttribute() updates the attribute, which triggers CSS to swap
//       all the CSS custom property values (see [data-theme="light"] in style.css).
//    5. We also swap the SVG icon inside the button:
//       - Moon icon (🌙) for dark mode
//       - Sun icon (☀️) for light mode
//
const themeToggle = document.getElementById('themeToggle');

themeToggle.addEventListener('click', () => {

  // document.documentElement is the <html> element — the root of the DOM
  const html = document.documentElement;

  // getAttribute() reads an HTML attribute's value
  const current = html.getAttribute('data-theme');

  // Ternary: if current is 'light', switch to 'dark', and vice versa
  const next = current === 'light' ? 'dark' : 'light';

  // setAttribute() sets/updates an HTML attribute
  html.setAttribute('data-theme', next);

  // Swap the icon SVG inside the toggle button
  //  In light mode, show a SUN icon (user can click to go dark)
  //  In dark mode, show a MOON icon (user can click to go light)
  themeToggle.innerHTML = next === 'light'
    ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';
});




// ============================================================
//  SECTION 14: CHECKOUT BUTTON (DEMO STUB)
// ============================================================
//
//  This is a placeholder / demo alert. In a real app, this would
//  redirect to a checkout page or split the order across stores.
//
//  KEY CONCEPTS:
//    - new Set(...): Creates a Set (a collection of UNIQUE values).
//      Used here to deduplicate store names — if multiple items come
//      from the same store, it only appears once.
//    - [...new Set(...)]: The spread operator converts the Set back into an array.
//    - cart.map(c => getStoreName(c.selectedStore)): Extracts the store name for each cart item.
//    - .join('\n'): Joins array elements with newline characters for the alert message.
//
// ----------------------------------------------------------
//  MODIFIED: Checkout now redirects to checkout.html
//  Original behavior was a demo alert().
//  This handler CANNOT be moved to a separate file because it
//  depends on the `cart` array and `PRODUCTS` array defined above.
// ----------------------------------------------------------
document.getElementById('checkoutBtn').addEventListener('click', () => {
  if (cart.length === 0) {
    alert('Your cart is empty! Add some items first.');
    return;
  }
  // Save cart with full product data needed for checkout store picker
  const checkoutCart = cart.map(item => {
    const product = PRODUCTS.find(p => p.id === item.id);
    return {
      id: item.id,
      name: item.name,
      emoji: item.emoji,
      weight: product?.weight || '',
      selectedStore: item.selectedStore,
      selectedPrice: item.selectedPrice,
      mrp: item.mrp,
      qty: item.qty || 1,
      prices: product?.prices || {}  // Needed for store picker on checkout
    };
  });
  localStorage.setItem('tokri_cart', JSON.stringify(checkoutCart));
  window.location.href = './checkout/checkout.html';
});




//  SECTION 16: INITIALIZATION
// ============================================================
//
//  When the page loads and this script runs, we call filterProducts()
//  once to populate the product grid with all 18 products using
//  the default sort (Biggest Savings) and no active filters.
//
filterProducts();



// ============================================================
//  SECTION 18: PROFILE SIDEBAR
// ============================================================
//
//  Mirrors SECTION 12 (Cart Panel) open/close mechanics exactly.
//  Adds a slide-in profile sidebar with community summary box.
//

function openProfileSidebar() {
  document.getElementById('profileSidebar').classList.add('open');
  document.getElementById('profileOverlay').classList.add('open');
  renderAuthSection();
  renderCommunitySummaryBox();
}

function closeProfileSidebar() {
  document.getElementById('profileSidebar').classList.remove('open');
  document.getElementById('profileOverlay').classList.remove('open');
}

// Attach click handlers to profile button, close button, and overlay
document.getElementById('profileBtn').addEventListener('click', openProfileSidebar);
document.getElementById('profileClose').addEventListener('click', closeProfileSidebar);
document.getElementById('profileOverlay').addEventListener('click', closeProfileSidebar);

/**
 * renderCommunitySummaryBox()
 * Queries community_members joined to communities for the current user,
 * renders up to 10 mini community chips, and wires click to social.html.
 */
// ============================================================
//  SECTION 19: AUTH SECTION (Sign In / Sign Up / User Info)
// ============================================================
let authMode = 'signin';

async function renderAuthSection() {
  const section = document.getElementById('profileAuthSection');
  if (!section) return;

  if (!supabase) {
    section.innerHTML = '<div class="profile-auth-loading">Auth service unavailable</div>';
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const initial = user.email ? user.email[0].toUpperCase() : '?';
    section.innerHTML = `
      <div class="profile-auth-user">
        <div class="profile-auth-avatar">${initial}</div>
        <div class="profile-auth-info">
          <div class="profile-auth-email">${user.email}</div>
          <div class="profile-auth-status">● Signed in</div>
        </div>
      </div>
      <button class="btn-signout" id="signOutBtn" type="button">Sign Out</button>
    `;
    document.getElementById('signOutBtn').addEventListener('click', handleSignOut);
  } else {
    const isSignUp = authMode === 'signup';
    section.innerHTML = `
      <div class="profile-auth-form">
        <div class="profile-auth-title">${isSignUp ? 'Create Account' : 'Sign In'}</div>
        <input type="email" class="profile-auth-input" id="authEmail" placeholder="Email address" autocomplete="email">
        <input type="password" class="profile-auth-input" id="authPassword" placeholder="Password" autocomplete="${isSignUp ? 'new-password' : 'current-password'}">
        <div class="profile-auth-error" id="authError"></div>
        <div class="profile-auth-success" id="authSuccess"></div>
        <button class="btn btn-primary btn-block" id="authSubmitBtn" type="button">${isSignUp ? 'Create Account' : 'Sign In'}</button>
        <div class="profile-auth-toggle">
          ${isSignUp ? 'Already have an account? <button type="button" id="authToggleBtn">Sign in</button>' : 'New here? <button type="button" id="authToggleBtn">Create account</button>'}
        </div>
      </div>
    `;
    document.getElementById('authSubmitBtn').addEventListener('click', isSignUp ? handleSignUp : handleSignIn);
    document.getElementById('authToggleBtn').addEventListener('click', toggleAuthMode);
  }
}

function toggleAuthMode() {
  authMode = authMode === 'signin' ? 'signup' : 'signin';
  renderAuthSection();
}

async function handleSignIn() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const errorEl = document.getElementById('authError');
  const successEl = document.getElementById('authSuccess');
  const btn = document.getElementById('authSubmitBtn');

  errorEl.textContent = '';
  successEl.textContent = '';

  if (!email || !password) {
    errorEl.textContent = 'Please enter both email and password.';
    return;
  }

  btn.textContent = 'Signing in…';
  btn.disabled = true;

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    successEl.textContent = 'Signed in successfully!';
    setTimeout(() => { renderAuthSection(); renderCommunitySummaryBox(); }, 600);
  } catch (err) {
    errorEl.textContent = err.message || 'Sign in failed. Please try again.';
    btn.textContent = 'Sign In';
    btn.disabled = false;
  }
}

async function handleSignUp() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const errorEl = document.getElementById('authError');
  const successEl = document.getElementById('authSuccess');
  const btn = document.getElementById('authSubmitBtn');

  errorEl.textContent = '';
  successEl.textContent = '';

  if (!email || !password) {
    errorEl.textContent = 'Please enter both email and password.';
    return;
  }
  if (password.length < 6) {
    errorEl.textContent = 'Password must be at least 6 characters.';
    return;
  }

  btn.textContent = 'Creating account…';
  btn.disabled = true;

  try {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/index.html` }
    });
    if (error) throw error;
    successEl.textContent = 'Account created! You can now sign in.';
    setTimeout(() => { authMode = 'signin'; renderAuthSection(); }, 2000);
  } catch (err) {
    errorEl.textContent = err.message || 'Sign up failed. Please try again.';
    btn.textContent = 'Create Account';
    btn.disabled = false;
  }
}

async function handleSignOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    renderAuthSection();
    renderCommunitySummaryBox();
  } catch (err) {
    console.error('Sign out failed:', err);
  }
}

// ============================================================
//  SECTION 20: COMMUNITY SUMMARY BOX
// ============================================================
async function renderCommunitySummaryBox() {
  const box = document.getElementById('communitySummaryBox');
  if (!box) return;

  if (!supabase) {
    box.innerHTML = `
      <div class="community-summary-title">Your Communities</div>
      <div class="community-summary-empty">
        <a href="social/social.html" style="color:#0c831f;font-weight:700;text-decoration:none;">Sign in</a> to see your communities
      </div>
    `;
    box.onclick = () => { window.location.href = 'social/social.html'; };
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    box.innerHTML = `
      <div class="community-summary-title">Your Communities</div>
      <div class="community-summary-empty">
        <a href="#" onclick="openProfileSidebar(); return false;" style="color:#0c831f;font-weight:700;text-decoration:none;">Sign in</a> to see your communities
      </div>
    `;
    return;
  }

  box.innerHTML = '<div class="community-summary-loading">Loading communities…</div>';

  try {
    const { data, error } = await supabase
      .from('community_members')
      .select('communities(id, handle, display_name, type)')
      .eq('user_id', user.id)
      .limit(10);

    if (error) throw error;

    if (!data || data.length === 0) {
      box.innerHTML = `
        <div class="community-summary-title">Your Communities</div>
        <div class="community-summary-empty">No communities yet. <a href="social/social.html" style="color:#0c831f;font-weight:700;text-decoration:none;">Join or create one</a></div>
      `;
    } else {
      const chips = data.map(row => {
        const c = row.communities;
        const typeIcon = c.type === 'family' ? '👨👩👧👦' : '👥';
        return `<span class="community-chip">${typeIcon} ${c.display_name}</span>`;
      }).join('');

      const moreText = data.length >= 10 ? '<div class="community-chip-more">+ more on Social page</div>' : '';

      box.innerHTML = `
        <div class="community-summary-title">Your Communities</div>
        <div class="community-chips">${chips}</div>
        ${moreText}
      `;
    }
    box.onclick = () => { window.location.href = 'social/social.html'; };

  } catch (err) {
    console.error('Failed to load communities:', err);
    box.innerHTML = `
      <div class="community-summary-title">Your Communities</div>
      <div class="community-summary-empty">Unable to load. <a href="social/social.html" style="color:#0c831f;font-weight:700;text-decoration:none;">Go to Social</a></div>
    `;
    box.onclick = () => { window.location.href = 'social/social.html'; };
  }
}

// ============================================
//  SCROLL SAVINGS ANIMATION
//  (from tokrifooter.html — integrated)
// ============================================

(function () {
  'use strict';

  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const easeOutBack = t => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  const section = document.getElementById('savingsSection');
  if (!section) return; // Graceful fail if section missing

  const labelAbove = document.getElementById('savingsLabelAbove');
  const bigNumber = document.getElementById('savingsNumber');
  const labelBelow = document.getElementById('savingsLabelBelow');
  const divider = document.getElementById('savingsDivider');
  const minis = [
    document.getElementById('mini1'),
    document.getElementById('mini2'),
    document.getElementById('mini3'),
    document.getElementById('mini4'),
  ];

  const TARGET_AMOUNT = 320;

  function getSavingsProgress() {
    const rect = section.getBoundingClientRect();
    const sectionH = section.offsetHeight;
    const viewportH = window.innerHeight;
    const scrollable = sectionH - viewportH;
    if (scrollable <= 0) return 0;
    const scrolled = -rect.top;
    return clamp(scrolled / scrollable, 0, 1);
  }

  function updateSavings() {
    const p = getSavingsProgress();

    // Phase 1: Top label (0% - 15%)
    const labelPhase = clamp(p / 0.15, 0, 1);
    const labelEased = easeOutCubic(labelPhase);
    labelAbove.style.opacity = labelEased;
    labelAbove.style.transform = `translateY(${lerp(20, 0, labelEased)}px)`;

    // Phase 2: Big Number (15% - 55%)
    const numPhase = clamp((p - 0.15) / 0.40, 0, 1);
    const numEased = easeOutCubic(numPhase);
    const currentAmount = Math.round(lerp(0, TARGET_AMOUNT, numEased));
    bigNumber.textContent = `₹${currentAmount}`;

    const scalePhase = clamp((p - 0.15) / 0.50, 0, 1);
    const scaleEased = easeOutBack(clamp(scalePhase * 1.2, 0, 1));
    bigNumber.style.transform = `scale(${lerp(0.7, 1, Math.min(scaleEased, 1))})`;
    bigNumber.style.opacity = 1;

    // Phase 3: Below label + divider (55% - 70%)
    const metaPhase = clamp((p - 0.55) / 0.15, 0, 1);
    const metaEased = easeOutCubic(metaPhase);
    labelBelow.style.opacity = metaEased;
    labelBelow.style.transform = `translateY(${lerp(15, 0, metaEased)}px)`;
    divider.style.opacity = metaEased;
    divider.style.transform = `scaleX(${metaEased})`;

    // Phase 4: Mini stats stagger (70% - 100%)
    minis.forEach((mini, i) => {
      if (!mini) return;
      const miniStart = 0.70 + (i * 0.06);
      const miniPhase = clamp((p - miniStart) / 0.15, 0, 1);
      const miniEased = easeOutCubic(miniPhase);
      mini.style.opacity = miniEased;
      mini.style.transform = `translateY(${lerp(40, 0, miniEased)}px)`;
    });
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateSavings();
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateSavings();
})();







// ============================================================
//  SECTION 21: SHARED COMMUNITY CART INTEGRATION
// ============================================================

let communityCartModule = null;
let userCommunities = [];

(async function initCommunityCart() {
  try {
    const mod = await import('./shared/community-cart.js');
    communityCartModule = mod;
    setupCommunityCartUI();
    await populateCommunityDropdown();
  } catch (err) {
    console.warn('[App] Community cart module not loaded:', err.message);
  }
})();

function setupCommunityCartUI() {
  const btn = document.getElementById('communityCartBtn');
  const closeBtn = document.getElementById('sharedCartClose');
  const overlay = document.getElementById('sharedCartOverlay');
  const panel = document.getElementById('sharedCartPanel');
  const dropdown = document.getElementById('sharedCartCommunityDropdown');
  const checkoutBtn = document.getElementById('sharedCheckoutBtn');

  if (!btn || !panel) return;

  btn.addEventListener('click', () => {
    // Close smart cart if open
    document.getElementById('cartPanel')?.classList.remove('open');
    document.getElementById('cartOverlay')?.classList.remove('open');

    panel.classList.add('open');
    overlay.classList.add('open');
    const communityId = dropdown?.value;
    if (communityId && communityCartModule) {
      communityCartModule.loadSharedCart(communityId, 'sharedCartBody');
    }
  });

  if (closeBtn) closeBtn.addEventListener('click', closeSharedCart);
  if (overlay) overlay.addEventListener('click', closeSharedCart);

  if (dropdown) {
    dropdown.addEventListener('change', async (e) => {
      const communityId = e.target.value;
      if (communityId && communityCartModule) {
        communityCartModule.loadSharedCart(communityId, 'sharedCartBody');
      }
    });
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      const communityId = dropdown?.value;
      if (!communityId) {
        alert('Please select a community first');
        return;
      }
      localStorage.setItem('tokri_checkout_mode', 'shared');
      localStorage.setItem('tokri_checkout_community', communityId);
      window.location.href = './checkout/checkout.html';
    });
  }
}

function closeSharedCart() {
  document.getElementById('sharedCartPanel')?.classList.remove('open');
  document.getElementById('sharedCartOverlay')?.classList.remove('open');
}

async function populateCommunityDropdown() {
  const dropdown = document.getElementById('sharedCartCommunityDropdown');
  if (!dropdown || !supabase) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    dropdown.innerHTML = '<option value="">Sign in to see communities</option>';
    return;
  }

  const { data, error } = await supabase
    .from('community_members')
    .select('communities(id, display_name)')
    .eq('user_id', user.id);

  if (error || !data || data.length === 0) {
    dropdown.innerHTML = '<option value="">No communities yet</option>';
    return;
  }

  userCommunities = data;
  dropdown.innerHTML = data.map(row =>
    `<option value="${row.communities.id}">${row.communities.display_name}</option>`
  ).join('');

  // Auto-load first community
  if (data[0]?.communities?.id) {
    await communityCartModule.loadSharedCart(data[0].communities.id, 'sharedCartBody');
  }
}

// Add "Add to Community Cart" button on product cards
// Hook into existing renderProductCard by overriding after filterProducts
const originalRenderGrid = renderGrid;
renderGrid = function (products) {
  originalRenderGrid(products);

};



// Inline Community Picker
function openInlineCommunityPicker(productId, anchorElement) {
  renderInlinePicker(productId);
}

async function renderInlinePicker(productId) {
  const overlay = document.getElementById('inlinePickerOverlay');
  const strip = document.getElementById('inlinePickerStrip');

  if (!overlay) {
    // Create overlay if doesn't exist
    const div = document.createElement('div');
    div.id = 'inlinePickerOverlay';
    div.className = 'inline-picker-overlay';
    div.innerHTML = `
      <div class="inline-picker-box">
        <div class="inline-picker-title">Add to Community</div>
        <div class="inline-picker-strip" id="inlinePickerStrip"></div>
        <button class="btn btn-ghost inline-picker-close" onclick="closeInlinePicker()">Cancel</button>
      </div>
    `;
    document.body.appendChild(div);
  }

  const overlayEl = document.getElementById('inlinePickerOverlay');
  const stripEl = document.getElementById('inlinePickerStrip');

  stripEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">Loading…</div>';
  overlayEl.classList.add('open');

  if (!supabase) {
    stripEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">Sign in to see communities</div>';
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    stripEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">Sign in to see communities</div>';
    return;
  }

  const { data, error } = await supabase
    .from('community_members')
    .select('communities(id, display_name, handle, type)')
    .eq('user_id', user.id);

  if (error || !data || data.length === 0) {
    stripEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">No communities yet</div>';
    return;
  }

  const product = PRODUCTS.find(p => p.id === productId);
  const selectedStore = productSelections[productId] || getBestPrice(product.prices).store;
  stripEl.innerHTML = data.map(row => {
    const c = row.communities;
    const typeIcon = c.type === 'family' ? '👨‍👩‍👧‍👦' : '👥';
    return `
      <div class="inline-picker-card" onclick="window.addToSharedCart(${productId}, '${c.id}', '${selectedStore}'); window.closeInlinePicker();">
        <div class="inline-picker-card-icon">${typeIcon}</div>
        <div class="inline-picker-card-name">${c.display_name}</div>
      </div>
    `;
  }).join('');
}

function closeInlinePicker() {
  document.getElementById('inlinePickerOverlay')?.classList.remove('open');
}

async function addToSharedCart(productId, communityId, storeId) {
  if (!supabase) return;

  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const selectedStore = storeId || productSelections[productId] || getBestPrice(product.prices).store;
  const price = product.prices[selectedStore];
  if (price === null || price === undefined) {
    alert('Product unavailable at selected store');
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Check existing same product+store in this community
  const { data: existing } = await supabase
    .from('shared_cart_items')
    .select('id, qty')
    .eq('community_id', communityId)
    .eq('product_id', product.id)
    .eq('selected_store', selectedStore)
    .maybeSingle();

  let error;
  if (existing) {
    const { error: updErr } = await supabase
      .from('shared_cart_items')
      .update({ qty: existing.qty + 1 })
      .eq('id', existing.id);
    error = updErr;
  } else {
    const { error: insErr } = await supabase
      .from('shared_cart_items')
      .insert({
        community_id: communityId,
        product_id: product.id,
        product_name: product.name,
        product_weight: product.weight || '',
        product_emoji: product.emoji || '',
        selected_store: selectedStore,
        selected_price: price,
        mrp: product.mrp || 0,
        qty: 1,
        added_by: user.id,
        added_by_name: user.email?.split('@')[0] || 'Member'
      });
    error = insErr;
  }

  if (error) {
    console.error('Failed to add to shared cart:', error);
    alert('Failed to add: ' + error.message);
  } else {
    if (communityCartModule?.refreshSharedCart) {
      communityCartModule.refreshSharedCart('sharedCartBody');
    }
  }
}
window.addToSharedCart = addToSharedCart;
window.closeInlinePicker = closeInlinePicker;

// Close picker on overlay click
document.addEventListener('click', (e) => {
  if (e.target.id === 'inlinePickerOverlay') closeInlinePicker();
});