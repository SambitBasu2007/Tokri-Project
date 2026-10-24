import { lazy, Suspense, useState } from 'react';
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  ScrollRestoration,
  useLocation,
} from 'react-router-dom';
import { HeaderBar } from './components/HeaderBar';
import { Footer } from './components/Footer';
import { CartPanel } from './components/CartPanel';
import { BottomNav } from './components/BottomNav';
import { ViewCartPill } from './components/ViewCartPill';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './state/AuthContext';
import { CatalogProvider } from './state/CatalogContext';
import { ToastProvider } from './state/ToastContext';
import { CartProvider } from './state/CartContext';
import { WatchesProvider } from './state/WatchesContext';
import { ThemeProvider } from './state/ThemeContext';
import Home from './pages/Home';
import NotFoundPage from './pages/NotFound';
import { Skeleton } from './components/Skeleton';

const ProductPage = lazy(() => import('./pages/Product'));
const ListingPage = lazy(() => import('./pages/Listing'));
const CategoriesPage = lazy(() => import('./pages/Categories'));
const CheckoutPage = lazy(() => import('./pages/Checkout'));
const OrdersPage = lazy(() => import('./pages/Orders'));
const WatchlistPage = lazy(() => import('./pages/Watchlist'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const SocialPage = lazy(() => import('./pages/Social'));
const LegalPage = lazy(() => import('./pages/Legal'));
const LabsPage = lazy(() => import('./pages/Labs'));

function ShopRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/search${search}`} replace />;
}

function Shell() {
  const [cartOpen, setCartOpen] = useState(false);
  const location = useLocation();
  const hidePill = location.pathname === '/checkout';

  return (
    <div className="app-shell">
      {/*
        Data-router scroll restoration. Keying by pathname (not the full URL)
        means changing a filter keeps the reader's place, while Back from a
        product page still returns to the saved offset.
      */}
      <ScrollRestoration getKey={(location) => location.pathname} />
      <a href="#main" className="visually-hidden">
        Skip to content
      </a>
      <HeaderBar onOpenCart={() => setCartOpen(true)} />
      <main id="main">
        <Suspense
          fallback={
            <div className="page container" aria-busy="true" aria-label="Loading page">
              <Skeleton height="28px" width="40%" />
              <div style={{ height: '16px' }} />
              <Skeleton height="180px" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      {!hidePill && <ViewCartPill onOpenCart={() => setCartOpen(true)} />}
      <BottomNav />
      <CartPanel open={cartOpen} onClose={() => setCartOpen(false)} />
      <Footer />
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <Home /> },
      { path: 'c/:category', element: <ListingPage /> },
      { path: 'search', element: <ListingPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'shop', element: <ShopRedirect /> },
      { path: 'product/:id', element: <ProductPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'watchlist', element: <WatchlistPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'social', element: <SocialPage /> },
      { path: 'legal', element: <LegalPage /> },
      { path: 'labs', element: <LabsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <CatalogProvider>
            <ToastProvider>
              <WatchesProvider>
                <CartProvider>
                  <RouterProvider router={router} />
                </CartProvider>
              </WatchesProvider>
            </ToastProvider>
          </CatalogProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
