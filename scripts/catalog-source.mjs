// Curated product catalog source.
//
// One entry per product. `query` is the image search used to find a retailer
// packshot. Existing rows (1-18) keep their hand-checked demo prices; new rows
// get deterministic demo prices from build-catalog.mjs.
//
// Names, pack sizes and MRPs are indicative Indian retail values. Prices are
// deliberately labelled as simulated in the UI; the store links let a shopper
// verify the live price for their pincode.

export const stores = [
  { id: 'blinkit', name: 'Blinkit', deliveryMinutes: 10, deliveryFee: 25, freeAbove: 199 },
  { id: 'zepto', name: 'Zepto', deliveryMinutes: 10, deliveryFee: 25, freeAbove: 199 },
  { id: 'swiggy', name: 'Swiggy Instamart', deliveryMinutes: 15, deliveryFee: 25, freeAbove: 199 },
  { id: 'bigbasket', name: 'BigBasket', deliveryMinutes: 30, deliveryFee: 35, freeAbove: 399 },
  { id: 'jiomart', name: 'JioMart', deliveryMinutes: 60, deliveryFee: 35, freeAbove: 399 },
  { id: 'flipkart', name: 'Flipkart Minutes', deliveryMinutes: 20, deliveryFee: 25, freeAbove: 199 },
];

const item = (name, category, weight, mrp, unitQty, unit, query) => ({
  name,
  category,
  weight,
  mrp,
  unitQty,
  unit,
  query,
});

export const sourceProducts = [
  // ---------------------------------------------------------------------------
  // Existing catalog rows. IDs 1-18 are deliberately kept stable.
  // ---------------------------------------------------------------------------
  item('Amul Toned Milk', 'dairy', '1 L Pouch', 34, 1000, 'ml', 'Amul Taaza Toned Milk 1L pouch'),
  item('Aashirvaad Whole Wheat Atta', 'atta', '5 kg', 290, 5000, 'g', 'Aashirvaad Whole Wheat Atta 5kg pack'),
  item('Fortune Sunflower Oil', 'oil', '1 L', 155, 1000, 'ml', 'Fortune Sunlite Refined Sunflower Oil 1L pouch'),
  item('Shimla Apples', 'fruits', '1 kg (4-5 pcs)', 180, 1000, 'g', 'Shimla apples 1kg'),
  item("Haldiram's Aloo Bhujia", 'snacks', '200 g', 60, 200, 'g', "Haldiram Aloo Bhujia 200g single pack"),
  item('Coca-Cola', 'beverages', '750 ml Bottle', 42, 750, 'ml', 'Coca-Cola 750ml bottle India'),
  item('Spinach (Palak)', 'vegetables', '250 g', 30, 250, 'g', 'fresh spinach leaves palak 250g'),
  item('Amul Butter', 'dairy', '500 g Carton', 285, 500, 'g', 'Amul Butter 500g carton'),
  item('Maggi 2-Minute Noodles', 'snacks', 'Family Pack (8×70 g)', 112, 560, 'g', 'Maggi Masala Noodles 560g family pack'),
  item('Dettol Liquid Handwash', 'personal', '900 ml Refill', 120, 900, 'ml', 'Dettol Liquid Handwash refill 900ml single pack'),
  item('Harpic Power Plus', 'cleaning', '1 L', 130, 1000, 'ml', 'Harpic Power Plus toilet cleaner 1L'),
  item('India Gate Basmati Rice', 'atta', '5 kg', 499, 5000, 'g', 'India Gate Basmati Rice 5kg'),
  item('Bananas', 'fruits', '1 Dozen', 55, 12, 'pc', 'bananas 1 dozen'),
  item('Amul Paneer', 'dairy', '200 g Block', 100, 200, 'g', 'Amul Paneer 200g block'),
  item('Tropicana Orange Juice', 'beverages', '1 L Tetra Pack', 110, 1000, 'ml', 'Tropicana Orange Juice 1L tetra pack'),
  item('Tomatoes', 'vegetables', '1 kg', 40, 1000, 'g', 'fresh tomatoes 1kg'),
  item("Lay's Classic Salted", 'snacks', 'Party Pack 190 g', 85, 190, 'g', "Lay's Classic Salted 190g India single pack"),
  item('Surf Excel Matic Liquid', 'cleaning', '1 L', 240, 1000, 'ml', 'Surf Excel Matic Liquid Detergent 1L'),

  // ---------------------------------------------------------------------------
  // Dairy — more brands, curd, cheese, cream, ghee, lassi.
  // ---------------------------------------------------------------------------
  item('Amul Gold Full Cream Milk', 'dairy', '1 L Pouch', 38, 1000, 'ml', 'Amul Gold Full Cream Milk 1L pouch'),
  item('Mother Dairy Toned Milk', 'dairy', '1 L Pouch', 36, 1000, 'ml', 'Mother Dairy Toned Milk 1L pouch'),
  item('Nestlé A+ Toned Milk', 'dairy', '1 L Tetra Pack', 75, 1000, 'ml', 'Nestle A+ Toned Milk 1L tetra pack'),
  item('Amul Masti Dahi', 'dairy', '400 g Cup', 45, 400, 'g', 'Amul Masti Dahi 400g cup'),
  item('Mother Dairy Classic Curd', 'dairy', '400 g Cup', 40, 400, 'g', 'Mother Dairy Classic Curd 400g cup'),
  item('Amul Cheese Slices', 'dairy', '200 g Pack', 150, 200, 'g', 'Amul Cheese Slices 200g pack'),
  item('Amul Cheese Spread', 'dairy', '200 g Jar', 135, 200, 'g', 'Amul Cheese Spread 200g jar'),
  item('Britannia Cheese Slices', 'dairy', '200 g Pack', 145, 200, 'g', 'Britannia Cheese Slices 200g pack'),
  item('Epigamia Greek Yogurt Blueberry', 'dairy', '90 g Cup', 45, 90, 'g', 'Epigamia Greek Yogurt Blueberry 90g'),
  item('Amul Lassi', 'dairy', '200 ml Tetra', 25, 200, 'ml', 'Amul Lassi 200ml tetra pack'),
  item('Amul Fresh Cream', 'dairy', '250 ml', 95, 250, 'ml', 'Amul Fresh Cream 250ml single pack'),
  item('Amul Ghee', 'dairy', '500 ml Jar', 350, 500, 'ml', 'Amul Ghee 500ml jar'),
  item('Mother Dairy Ghee', 'dairy', '500 ml Jar', 340, 500, 'ml', 'Mother Dairy Ghee 500ml jar'),

  // ---------------------------------------------------------------------------
  // Bakery and eggs.
  // ---------------------------------------------------------------------------
  item('Farm Fresh Eggs', 'bakery', '6 pcs', 54, 6, 'pc', 'farm fresh eggs 6 pack'),
  item('Britannia Brown Bread', 'bakery', '400 g', 55, 400, 'g', 'Britannia Brown Bread 400g'),
  item('English Oven Multigrain Bread', 'bakery', '400 g', 60, 400, 'g', 'English Oven Multigrain Bread 400g'),

  // ---------------------------------------------------------------------------
  // Staples, dals and spices.
  // ---------------------------------------------------------------------------
  item('Pillsbury Whole Wheat Atta', 'atta', '5 kg', 300, 5000, 'g', 'Pillsbury Whole Wheat Atta 5kg single pack'),
  item('Aashirvaad Select Atta', 'atta', '5 kg', 360, 5000, 'g', 'Aashirvaad Select Atta 5kg'),
  item('Tata Sampann Toor Dal', 'atta', '1 kg', 190, 1000, 'g', 'Tata Sampann Toor Dal 1kg'),
  item('Tata Sampann Moong Dal', 'atta', '1 kg', 190, 1000, 'g', 'Tata Sampann Moong Dal 1kg'),
  item('Tata Sampann Chana Dal', 'atta', '1 kg', 120, 1000, 'g', 'Tata Sampann Chana Dal 1kg'),
  item('Tata Salt', 'atta', '1 kg', 28, 1000, 'g', 'Tata Salt 1kg'),
  item('Madhur Sugar', 'atta', '1 kg', 55, 1000, 'g', 'Madhur Sugar 1kg'),
  item('India Gate Poha', 'atta', '1 kg', 60, 1000, 'g', 'India Gate Poha 1kg single pack'),
  item('Bombay Sooji', 'atta', '500 g', 35, 500, 'g', 'Bombay Sooji 500g'),
  item('Tata Sampann Besan', 'atta', '500 g', 65, 500, 'g', 'Tata Sampann Besan 500g single pack'),
  item('MDH Turmeric Powder', 'atta', '100 g', 45, 100, 'g', 'MDH Turmeric Powder 100g'),
  item('Everest Red Chilli Powder', 'atta', '100 g', 60, 100, 'g', 'Everest Red Chilli Powder 100g'),
  item('MDH Garam Masala', 'atta', '100 g', 75, 100, 'g', 'MDH Garam Masala 100g'),

  // ---------------------------------------------------------------------------
  // Cooking oil.
  // ---------------------------------------------------------------------------
  item('Saffola Gold Blended Oil', 'oil', '1 L', 190, 1000, 'ml', 'Saffola Gold Blended Oil 1L'),
  item('Fortune Kachi Ghani Mustard Oil', 'oil', '1 L', 180, 1000, 'ml', 'Fortune Kachi Ghani Mustard Oil 1L'),
  item('Dhara Groundnut Oil', 'oil', '1 L', 220, 1000, 'ml', 'Dhara Groundnut Oil 1L'),
  item('Sundrop Refined Sunflower Oil', 'oil', '1 L', 160, 1000, 'ml', 'Sundrop Sunflower Oil 1L pouch'),

  // ---------------------------------------------------------------------------
  // Fruit.
  // ---------------------------------------------------------------------------
  item('Nagpur Oranges', 'fruits', '1 kg', 100, 1000, 'g', 'Nagpur oranges 1kg'),
  item('Green Grapes', 'fruits', '500 g', 70, 500, 'g', 'fresh green grapes 500g'),
  item('Pomegranate', 'fruits', '1 kg', 180, 1000, 'g', 'pomegranate 1kg'),
  item('Alphonso Mangoes', 'fruits', '1 kg', 350, 1000, 'g', 'Alphonso mangoes 1kg'),
  item('Watermelon', 'fruits', '1 kg', 35, 1000, 'g', 'fresh watermelon whole 1kg'),
  item('Kiwi', 'fruits', '3 pcs', 150, 3, 'pc', 'fresh kiwi fruit 3 pcs'),
  item('Dragon Fruit', 'fruits', '1 pc', 90, 1, 'pc', 'fresh dragon fruit whole'),

  // ---------------------------------------------------------------------------
  // Vegetables.
  // ---------------------------------------------------------------------------
  item('Onions', 'vegetables', '1 kg', 40, 1000, 'g', 'onions 1kg'),
  item('Potatoes', 'vegetables', '1 kg', 35, 1000, 'g', 'potatoes 1kg'),
  item('Coriander', 'vegetables', '100 g', 20, 100, 'g', 'fresh coriander leaves 100g'),
  item('Green Chillies', 'vegetables', '100 g', 15, 100, 'g', 'fresh green chillies 100g'),
  item('Ginger', 'vegetables', '250 g', 60, 250, 'g', 'fresh ginger 250g'),
  item('Garlic', 'vegetables', '250 g', 50, 250, 'g', 'garlic 250g'),
  item('Lemons', 'vegetables', '4 pcs', 30, 4, 'pc', 'lemons 4 pack'),
  item('Cucumber', 'vegetables', '500 g', 25, 500, 'g', 'fresh cucumber whole 500g'),
  item('Carrots', 'vegetables', '500 g', 40, 500, 'g', 'carrots 500g'),
  item('Capsicum', 'vegetables', '500 g', 45, 500, 'g', 'capsicum 500g'),
  item('Cauliflower', 'vegetables', '1 pc', 40, 1, 'pc', 'cauliflower 1 piece'),
  item('Broccoli', 'vegetables', '1 pc', 80, 1, 'pc', 'fresh broccoli 1 piece white background'),
  item('Pebbles Frozen Green Peas', 'vegetables', '500 g', 70, 500, 'g', 'Pebbles frozen green peas 500g pack'),

  // ---------------------------------------------------------------------------
  // Snacks, biscuits, chocolate and breakfast.
  // ---------------------------------------------------------------------------
  item("Lay's Magic Masala", 'snacks', '190 g', 85, 190, 'g', "Lay's Magic Masala 190g"),
  item("Lay's Cream & Onion", 'snacks', '190 g', 85, 190, 'g', "Lay's Cream and Onion 190g"),
  item('Kurkure Masala Munch', 'snacks', '180 g', 80, 180, 'g', 'Kurkure Masala Munch 180g single pack'),
  item("Haldiram's Moong Dal", 'snacks', '200 g', 60, 200, 'g', "Haldiram's Moong Dal 200g"),
  item('Parle-G Original', 'snacks', '800 g', 90, 800, 'g', 'Parle-G Original 800g'),
  item('Britannia Good Day Cashew', 'snacks', '600 g', 120, 600, 'g', 'Britannia Good Day Cashew 600g'),
  item('Oreo Original', 'snacks', '300 g', 60, 300, 'g', 'Oreo Original 300g'),
  item('Cadbury Dairy Milk', 'snacks', '110 g', 100, 110, 'g', 'Cadbury Dairy Milk 110g'),
  item('Nestlé KitKat 4 Finger', 'snacks', '37.3 g', 30, 37.3, 'g', 'Nestle KitKat 4 Finger 37.3g'),
  item('Act II Butter Popcorn', 'snacks', '150 g', 60, 150, 'g', 'Act II Butter Popcorn 150g'),
  item('Too Yumm Multigrain Chips', 'snacks', '70 g', 30, 70, 'g', 'Too Yumm Multigrain Chips 70g single pack'),
  item('Pintola All Natural Peanut Butter', 'snacks', '1 kg', 550, 1000, 'g', 'Pintola All Natural Peanut Butter 1kg'),
  item('Nutella Hazelnut Spread', 'snacks', '290 g', 450, 290, 'g', 'Nutella Hazelnut Spread 290g'),
  item("Kellogg's Corn Flakes", 'snacks', '475 g', 220, 475, 'g', "Kellogg's Corn Flakes 475g"),

  // ---------------------------------------------------------------------------
  // Beverages, including five Monster variants.
  // ---------------------------------------------------------------------------
  item('Thums Up', 'beverages', '750 ml Bottle', 42, 750, 'ml', 'Thums Up 750ml bottle single'),
  item('Sprite', 'beverages', '750 ml Bottle', 42, 750, 'ml', 'Sprite 750ml bottle'),
  item('Pepsi', 'beverages', '750 ml Bottle', 42, 750, 'ml', 'Pepsi 750ml bottle'),
  item('Mountain Dew', 'beverages', '750 ml Bottle', 42, 750, 'ml', 'Mountain Dew 750ml bottle'),
  item('Real Mixed Fruit Juice', 'beverages', '1 L', 120, 1000, 'ml', 'Real Mixed Fruit Juice 1L'),
  item('Frooti Mango', 'beverages', '600 ml', 45, 600, 'ml', 'Frooti Mango 600ml bottle'),
  item('Red Bull Energy Drink', 'beverages', '250 ml', 125, 250, 'ml', 'Red Bull Energy Drink 250ml'),
  item('Monster Energy Original', 'beverages', '500 ml', 140, 500, 'ml', 'Monster Energy Original 500ml single can'),
  item('Monster Energy Ultra White', 'beverages', '500 ml', 140, 500, 'ml', 'Monster Energy Ultra White 500ml single can'),
  item('Monster Energy Ultra Paradise', 'beverages', '500 ml', 140, 500, 'ml', 'Monster Energy Ultra Paradise 500ml single can'),
  item('Monster Energy Mango Loco', 'beverages', '500 ml', 140, 500, 'ml', 'Monster Energy Mango Loco 500ml single can'),
  item('Monster Energy Pipeline Punch', 'beverages', '500 ml', 140, 500, 'ml', 'Monster Energy Pipeline Punch 500ml single can'),
  item('Sting Energy Drink', 'beverages', '250 ml', 25, 250, 'ml', 'Sting Energy Drink 250ml'),
  item('Gatorade Blue Bolt', 'beverages', '500 ml', 60, 500, 'ml', 'Gatorade Blue Bolt 500ml'),
  item('Bisleri Mineral Water', 'beverages', '1 L', 20, 1000, 'ml', 'Bisleri Mineral Water 1L'),
  item('Nescafé Cold Coffee', 'beverages', '180 ml', 45, 180, 'ml', 'Nescafe Cold Coffee 180ml'),
  item('Amul Kool Kesar', 'beverages', '180 ml', 25, 180, 'ml', 'Amul Kool Kesar 180ml'),

  // ---------------------------------------------------------------------------
  // Instant food and sauces.
  // ---------------------------------------------------------------------------
  item('Sunfeast Yippee Magic Masala', 'instant', '4-pack (280 g)', 60, 280, 'g', 'Sunfeast Yippee Magic Masala 4 pack 280g'),
  item('Knorr Classic Thick Tomato Soup', 'instant', '53 g', 60, 53, 'g', 'Knorr Classic Thick Tomato Soup 53g'),
  item('MTR Rava Idli Mix', 'instant', '500 g', 120, 500, 'g', 'MTR Rava Idli Mix 500g'),
  item('Kissan Tomato Ketchup', 'instant', '950 g', 215, 950, 'g', 'Kissan Tomato Ketchup 950g'),

  // ---------------------------------------------------------------------------
  // Personal care.
  // ---------------------------------------------------------------------------
  item('Lifebuoy Total 10 Handwash', 'personal', '750 ml', 150, 750, 'ml', 'Lifebuoy Total 10 Handwash 750ml single pack'),
  item('Dove Beauty Bar', 'personal', '100 g', 65, 100, 'g', 'Dove Beauty Bar 100g'),
  item('Colgate Strong Teeth Toothpaste', 'personal', '200 g', 120, 200, 'g', 'Colgate Strong Teeth Toothpaste 200g'),
  item('Pepsodent Germicheck Toothpaste', 'personal', '200 g', 110, 200, 'g', 'Pepsodent Germicheck 200g single pack'),
  item('Head & Shoulders Anti-Dandruff Shampoo', 'personal', '340 ml', 375, 340, 'ml', 'Head and Shoulders Anti Dandruff Shampoo 340ml'),
  item('Dove Intense Repair Shampoo', 'personal', '340 ml', 360, 340, 'ml', 'Dove Intense Repair Shampoo 340ml'),
  item('Clinic Plus Strong & Long Shampoo', 'personal', '340 ml', 180, 340, 'ml', 'Clinic Plus Strong and Long Shampoo 340ml'),
  item('Nivea Soft Moisturising Cream', 'personal', '100 ml', 200, 100, 'ml', 'Nivea Soft Moisturising Cream 100ml'),
  item('Vaseline Intensive Care Body Lotion', 'personal', '400 ml', 350, 400, 'ml', 'Vaseline Intensive Care Body Lotion 400ml'),
  item('Gillette Mach3 Razor', 'personal', '1 pc', 320, 1, 'pc', 'Gillette Mach3 Razor'),
  item('Whisper Ultra Clean Sanitary Pads', 'personal', '15 pcs', 180, 15, 'pc', 'Whisper Ultra Clean Sanitary Pads 15 pcs single pack'),
  item('Himalaya Purifying Neem Face Wash', 'personal', '150 ml', 200, 150, 'ml', 'Himalaya Purifying Neem Face Wash 150ml'),

  // ---------------------------------------------------------------------------
  // Cleaning and household.
  // ---------------------------------------------------------------------------
  item('Ariel Matic Liquid Detergent', 'cleaning', '1 L', 230, 1000, 'ml', 'Ariel Matic Liquid Detergent 1L'),
  item('Tide Plus Detergent Powder', 'cleaning', '1 kg', 120, 1000, 'g', 'Tide Plus Detergent Powder 1kg'),
  item('Vim Dishwash Liquid', 'cleaning', '750 ml', 110, 750, 'ml', 'Vim Dishwash Liquid 750ml'),
  item('Lizol Disinfectant Surface Cleaner', 'cleaning', '1 L', 190, 1000, 'ml', 'Lizol Disinfectant Surface Cleaner 1L'),
  item('Colin Glass Cleaner', 'cleaning', '500 ml', 100, 500, 'ml', 'Colin Glass Cleaner 500ml single bottle'),
  item('Scotch-Brite Scrub Pad', 'cleaning', '3 pcs', 60, 3, 'pc', 'Scotch Brite Scrub Pad 3 pieces'),
  item('Comfort Fabric Conditioner', 'cleaning', '1 L', 220, 1000, 'ml', 'Comfort Fabric Conditioner 1L'),
  item('Good Knight Gold Flash Refill', 'cleaning', '45 ml', 90, 45, 'ml', 'Good Knight Gold Flash Refill 45ml'),
  item('Garbage Bags Medium', 'household', '90 pcs', 180, 90, 'pc', 'garbage bags medium 90 pcs single pack'),
  item('Tissue Box', 'household', '100 pulls', 70, 100, 'pc', 'tissue box 100 pulls'),
  item('Toilet Paper', 'household', '4 rolls', 120, 4, 'pc', 'toilet paper 4 rolls'),
  item('Aluminum Foil', 'household', '72 m', 300, 72, 'm', 'aluminium foil 72m'),

  // ---------------------------------------------------------------------------
  // Health and modern pantry.
  // ---------------------------------------------------------------------------
  item('India Gate Quinoa', 'health', '500 g', 250, 500, 'g', 'India Gate Quinoa 500g'),
  item('True Elements Chia Seeds', 'health', '250 g', 150, 250, 'g', 'True Elements Chia Seeds 250g'),
  item('Almonds', 'health', '500 g', 450, 500, 'g', 'almonds 500g'),
  item('Lipton Green Tea', 'health', '25 bags', 180, 25, 'pc', 'Lipton Green Tea 25 bags'),
  item('Nescafé Classic Instant Coffee', 'health', '100 g', 320, 100, 'g', 'Nescafe Classic Instant Coffee 100g'),
  item('So Good Oat Milk', 'health', '1 L', 250, 1000, 'ml', 'So Good Oat Milk 1L'),
];
