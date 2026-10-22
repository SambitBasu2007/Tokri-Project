import { Link } from 'react-router-dom';
import styles from './Legal.module.css';
import common from './common.module.css';

export default function LegalPage() {
  return (
    <div className="page">
      <div className="container">
        <div className={common.pageHead}>
          <div>
            <h1>Privacy, terms &amp; data honesty</h1>
            <p className={common.lede}>
              Tokri is a student field project and a demonstration. The most important disclosure is
              at the top: the prices, price history and delivery tracking are simulated.
            </p>
          </div>
        </div>

        <div className={common.prose}>
          <div className={styles.callout}>
            <strong>Simulated data.</strong> Every shelf price, price snapshot, delivery ETA, rider
            position and payment confirmation in Tokri is generated for the demo. No order is sent to
            Blinkit, Zepto, Swiggy Instamart, BigBasket, JioMart or Flipkart. No money is charged.
          </div>
          <p>
            Each product page has an external-link button beside every store. It opens that store&apos;s
            own search for the product, where the live price for your pincode is shown. Tokri does not
            scrape or proxy those live prices.
          </p>

          <h2>Privacy policy</h2>
          <p>
            This policy describes what the Tokri demo stores. It is written to be read, not to hide
            behind legal language.
          </p>

          <h3>What we store</h3>
          <ul>
            <li><strong>Account:</strong> email address, optional display name and profile id, through Supabase Auth.</li>
            <li><strong>Personal cart:</strong> product, store and quantity. Rows are readable and writable only by the signed-in owner.</li>
            <li><strong>Orders:</strong> items, amount, store shipments, order time and the delivery address you chose. Owner-only by row-level security.</li>
            <li><strong>Addresses:</strong> label, address line, pincode and, if you press “Use my location”, latitude and longitude. Owner-only.</li>
            <li><strong>Price watches:</strong> product, optional store and target price. Owner-only.</li>
            <li><strong>Communities:</strong> membership, join requests, shared cart rows and community orders. Community members can read the shared cart; the activity view deliberately excludes amount, address and coordinates.</li>
            <li><strong>Local storage:</strong> guest cart, active cart choice, cached addresses, local price watches and cached reverse-geocoding results stay in your browser.</li>
          </ul>

          <h3>Location</h3>
          <p>
            Browser geolocation is requested only after you click “Use my location”. It is never
            requested on page load, never required to check out, and denial falls back to manual
            address entry. Coordinates are stored only on your own address and order rows, and never
            appear in a community-visible view.
          </p>
          <p>
            Reverse geocoding sends the rounded coordinates to OpenStreetMap Nominatim. Results are
            cached in local storage, requests are click-triggered and limited to roughly one per
            second. See <a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noreferrer noopener">the OSMF privacy policy</a>.
          </p>

          <h3>Security model</h3>
          <p>
            Supabase row-level security protects personal carts, addresses, watches, orders and
            shipments. The catalog is public read-only. There are no client write policies for
            prices. Community membership checks gate shared carts. The public anon key is the only
            Supabase credential shipped to the browser; the service-role key is never used in the
            client.
          </p>

          <h3>Deletion and retention</h3>
          <p>
            You can delete your account and profile data from <Link to="/profile">your profile</Link>.
            That removes your profile, cart, addresses, watches and memberships. Community order
            history remains as a record for other members, without your address or coordinates.
            Guest carts and demo orders are removed when you clear this site&apos;s browser storage.
          </p>

          <h3>What we do not do</h3>
          <ul>
            <li>No analytics, advertising trackers or third-party scripts beyond Supabase, Google Fonts and OpenStreetMap tiles/geocoding.</li>
            <li>No selling of personal data.</li>
            <li>No email or push notifications. Price alerts are checked in the browser only.</li>
          </ul>

          <h2>Terms of use</h2>
          <ul>
            <li>Tokri is a demonstration project. Do not rely on it for real purchasing decisions or delivery promises.</li>
            <li>Prices, discounts, coupons, delivery fees and tracking are simulated and may be wrong or stale.</li>
            <li>Store names and trademarks belong to their owners. Tokri is not affiliated with any store.</li>
            <li>Do not use the demo to store sensitive personal information. Location and addresses are collected only to demonstrate a checkout flow.</li>
            <li>The service is provided as-is, without warranties. Accounts and data may be removed as the project evolves.</li>
          </ul>

          <h2>Third-party attribution</h2>
          <ul>
            <li>
              Product images come from <a href="https://world.openfoodfacts.org/" target="_blank" rel="noreferrer noopener">Open Food Facts</a>{' '}
              contributors under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer noopener">CC BY-SA</a>{' '}
              and from <a href="https://commons.wikimedia.org/" target="_blank" rel="noreferrer noopener">Wikimedia Commons</a>{' '}
              under the licence shown on each file page. The local copies and exact source links are
              listed in <code>public/images/CREDITS.md</code>; each product page also links to its
              source. Packaging and brand marks may carry additional third-party rights.
            </li>
            <li>
              Reverse geocoding and map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer noopener">OpenStreetMap contributors</a>.
            </li>
            <li>Auth, Postgres and realtime: Supabase. UI: React, Vite, lucide-react icons. Font: Plus Jakarta Sans.</li>
          </ul>

          <h2>How the demo is put together</h2>
          <p>
            A Vite + React + TypeScript single-page app. Supabase stores the catalog, carts, orders,
            addresses, watches and communities. Cash and card screens never leave the browser. When
            the catalog tables are not reachable, the app falls back to a bundled catalog and keeps
            the cart on the device, showing an offline notice instead of pretending the data is live.
          </p>

          <p className={styles.footnote}>
            Questions about this policy: replace this line with a real contact address before
            publishing. Last updated {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.
          </p>
        </div>
      </div>
    </div>
  );
}
