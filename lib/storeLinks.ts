import type { Product, StoreId } from '../types';

/**
 * Deep links into each store's own search. Tokri's demo prices are a snapshot;
 * the only reliable "current price at my pincode" is the store itself.
 */
export function storeSearchUrl(
  storeId: StoreId,
  product: Pick<Product, 'name' | 'weight'>,
): string {
  const query = `${product.name} ${product.weight}`.trim();
  const q = encodeURIComponent(query);

  switch (storeId) {
    case 'blinkit':
      return `https://blinkit.com/s/?q=${q}`;
    case 'zepto':
      return `https://www.zepto.com/search?query=${q}`;
    case 'swiggy':
      return `https://www.swiggy.com/instamart/search?query=${q}`;
    case 'bigbasket':
      return `https://www.bigbasket.com/ps/?q=${q}`;
    case 'jiomart':
      return `https://www.jiomart.com/search/${q}`;
    case 'flipkart':
      return `https://www.flipkart.com/search?q=${q}`;
    default:
      return `https://www.google.com/search?q=${q}`;
  }
}
