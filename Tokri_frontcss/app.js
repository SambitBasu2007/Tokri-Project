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
  { id: 'dunzo', name: 'Dunzo Daily', dot: 'dunzo', delivery: '20 min' },
];




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
    prices: { blinkit: 32, zepto: 31, swiggy: 33, bigbasket: 30, jiomart: 29, dunzo: 33 },
    mrp: 34,
  },

  {
    id: 2, name: 'Aashirvaad Whole Wheat Atta', weight: '5 kg', emoji: '🌾', category: 'atta',
    prices: { blinkit: 265, zepto: 272, swiggy: 269, bigbasket: 259, jiomart: 255, dunzo: null },
    mrp: 290,
  },

  {
    id: 3, name: 'Fortune Sunflower Oil', weight: '1 L', emoji: '🫒', category: 'oil',
    prices: { blinkit: 139, zepto: 142, swiggy: 135, bigbasket: 138, jiomart: 140, dunzo: 145 },
    mrp: 155,
  },

  {
    id: 4, name: 'Shimla Apples', weight: '1 kg (4-5 pcs)', emoji: '🍎', category: 'fruits',
    prices: { blinkit: 165, zepto: 159, swiggy: 170, bigbasket: 155, jiomart: 162, dunzo: 168 },
    mrp: 180,
  },

  {
    id: 5, name: 'Haldiram\'s Aloo Bhujia', weight: '200 g', emoji: '🍿', category: 'snacks',
    prices: { blinkit: 55, zepto: 50, swiggy: 56, bigbasket: 52, jiomart: 53, dunzo: 54 },
    mrp: 60,
  },

  {
    id: 6, name: 'Coca-Cola', weight: '750 ml Bottle', emoji: '🥤', category: 'beverages',
    prices: { blinkit: 38, zepto: 40, swiggy: 38, bigbasket: 35, jiomart: 36, dunzo: 39 },
    mrp: 42,
  },

  {
    id: 7, name: 'Fresh Spinach (Palak)', weight: '250 g', emoji: '🥬', category: 'vegetables',
    prices: { blinkit: 18, zepto: 20, swiggy: 24, bigbasket: 22, jiomart: 25, dunzo: null },
    mrp: 30,
  },

  {
    id: 8, name: 'Amul Butter', weight: '500 g Carton', emoji: '🧈', category: 'dairy',
    prices: { blinkit: 270, zepto: 275, swiggy: 268, bigbasket: 265, jiomart: 262, dunzo: 278 },
    mrp: 285,
  },

  {
    id: 9, name: 'Maggi 2-Minute Noodles', weight: 'Family Pack (8×70g)', emoji: '🍜', category: 'snacks',
    prices: { blinkit: 90, zepto: 99, swiggy: 95, bigbasket: 92, jiomart: 96, dunzo: 98 },
    mrp: 112,
  },

  {
    id: 10, name: 'Dettol Liquid Handwash', weight: '900 ml Refill', emoji: '🧴', category: 'personal',
    prices: { blinkit: 95, zepto: 105, swiggy: 102, bigbasket: 99, jiomart: 97, dunzo: null },
    mrp: 120,
  },

  {
    id: 11, name: 'Harpic Power Plus', weight: '1 L', emoji: '🧹', category: 'cleaning',
    prices: { blinkit: 115, zepto: 118, swiggy: 120, bigbasket: 110, jiomart: 108, dunzo: 122 },
    mrp: 130,
  },

  {
    id: 12, name: 'India Gate Basmati Rice', weight: '5 kg', emoji: '🍚', category: 'atta',
    prices: { blinkit: 450, zepto: 465, swiggy: 435, bigbasket: 455, jiomart: 440, dunzo: 470 },
    mrp: 499,
  },

  {
    id: 13, name: 'Fresh Bananas (Cavendish)', weight: '1 Dozen', emoji: '🍌', category: 'fruits',
    prices: { blinkit: 45, zepto: 42, swiggy: 48, bigbasket: 40, jiomart: 44, dunzo: 46 },
    mrp: 55,
  },

  {
    id: 14, name: 'Amul Paneer', weight: '200 g Block', emoji: '🧀', category: 'dairy',
    prices: { blinkit: 90, zepto: 88, swiggy: 92, bigbasket: 85, jiomart: 87, dunzo: 95 },
    mrp: 100,
  },

  {
    id: 15, name: 'Tropicana Orange Juice', weight: '1 L Tetra Pack', emoji: '🧃', category: 'beverages',
    prices: { blinkit: 99, zepto: 90, swiggy: 102, bigbasket: 95, jiomart: 92, dunzo: null },
    mrp: 110,
  },

  {
    id: 16, name: 'Fresh Tomatoes', weight: '1 kg', emoji: '🍅', category: 'vegetables',
    prices: { blinkit: 28, zepto: 25, swiggy: 30, bigbasket: 22, jiomart: 26, dunzo: 32 },
    mrp: 40,
  },

  {
    id: 17, name: 'Lay\'s Classic Salted', weight: 'Party Pack 190 g', emoji: '🥔', category: 'snacks',
    prices: { blinkit: 70, zepto: 72, swiggy: 78, bigbasket: 75, jiomart: 73, dunzo: 76 },
    mrp: 85,
  },

  {
    id: 18, name: 'Surf Excel Matic Liquid', weight: '1 L Front Load', emoji: '🫧', category: 'cleaning',
    prices: { blinkit: 210, zepto: 215, swiggy: 220, bigbasket: 199, jiomart: 205, dunzo: 225 },
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

    if (price === null) {
      // Product is unavailable at this store — show "Unavailable" text
      priceRowsHTML += `
        <div class="price-row">
          <span class="price-store"><span class="store-dot store-dot--${store.dot}"></span>${store.name}</span>
          <span class="price-unavailable">Unavailable</span>
        </div>`;
    } else {
      // Product IS available — show the price
      //  - The ternary (isBest ? ' best' : '') adds the "best" CSS class
      //    to highlight the cheapest row with a green background.
      //  - Similarly (isBest ? ' best-price' : '') colors the price text green.
      priceRowsHTML += `
        <div class="price-row${isBest ? ' best' : ''}">
          <span class="price-store"><span class="store-dot store-dot--${store.dot}"></span>${store.name}</span>
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
        <button class="btn-add-best${inCart ? ' added' : ''}" data-id="${product.id}" onclick="toggleCartItem(${product.id})">
          ${inCart ? '✓ Added' : '⚡ Add Best Price'}
        </button>
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
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
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
document.getElementById('searchInput').addEventListener('input', filterProducts);




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
function toggleCartItem(id) {
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
      bestStore: best.store,
      bestPrice: best.price,
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
function removeCartItem(id) {
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
function updateCartUI() {

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
        <div class="cart-item-store">via ${getStoreName(item.bestStore)} · ${getStoreDelivery(item.bestStore)}</div>
      </div>
      <span class="cart-item-price">₹${item.bestPrice}</span>
      <button class="cart-item-remove" onclick="removeCartItem(${item.id})" title="Remove">&times;</button>
    </div>
  `).join('');


  // Calculate totals using .reduce()
  //  (s, i) => s + i.mrp  means: for each item "i", add its mrp to the running sum "s"
  //  Starting sum is 0.
  const mrpTotal = cart.reduce((s, i) => s + i.mrp, 0);
  const bestTotal = cart.reduce((s, i) => s + i.bestPrice, 0);
  const savings = mrpTotal - bestTotal;


  // Update the summary text in the cart footer
  document.getElementById('cartItemCount').textContent = cart.length;
  document.getElementById('cartMrpTotal').textContent = `₹${mrpTotal}`;
  document.getElementById('cartSavings').textContent = `– ₹${savings}`;
  document.getElementById('cartTotal').textContent = `₹${bestTotal}`;

  // Show the footer (it was hidden when cart was empty)
  footer.style.display = 'block';
}




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
//    - cart.map(c => getStoreName(c.bestStore)): Extracts the store name for each cart item.
//    - .join('\n'): Joins array elements with newline characters for the alert message.
//
document.getElementById('checkoutBtn').addEventListener('click', () => {
  alert('🎉 This is a concept demo!\n\nIn the real app, your cart would be split across:\n' +
    [...new Set(cart.map(c => getStoreName(c.bestStore)))].map(s => '  • ' + s).join('\n') +
    '\n\nfor the best possible total price.');
});




// ============================================================
//  SECTION 15: KEYBOARD SHORTCUT (⌘K / Ctrl+K)
// ============================================================
//
//  PURPOSE: Pressing Ctrl+K (Windows/Linux) or Cmd+K (Mac) focuses
//           the search bar instantly — a common UX pattern in modern web apps.
//
//  HOW IT WORKS:
//    - 'keydown' event fires when any key is pressed.
//    - e.metaKey is true when the ⌘ (Command) key is held (Mac).
//    - e.ctrlKey is true when the Ctrl key is held (Windows/Linux).
//    - e.key === 'k' checks if the "K" key was the one pressed.
//    - e.preventDefault() stops the browser's default action for that
//      key combination (e.g., Chrome normally opens the address bar on Ctrl+K).
//    - .focus() programmatically gives keyboard focus to the search input.
//
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('searchInput').focus();
  }
});




// ============================================================
//  SECTION 16: INITIALIZATION
// ============================================================
//
//  When the page loads and this script runs, we call filterProducts()
//  once to populate the product grid with all 18 products using
//  the default sort (Biggest Savings) and no active filters.
//
filterProducts();
