import { lazy, Suspense, useState } from 'react';
import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartPanel } from './components/CartPanel';
import { BottomDock } from './components/BottomDock';
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
const ShopPage = lazy(() => import('./pages/Shop'));
const CheckoutPage = lazy(() => import('./pages/Checkout'));
const OrdersPage = lazy(() => import('./pages/Orders'));
const WatchlistPage = lazy(() => import('./pages/Watchlist'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const SocialPage = lazy(() => import('./pages/Social'));
const LegalPage = lazy(() => import('./pages/Legal'));
const LabsPage = lazy(() => import('./pages/Labs'));

function Shell() {
  const [cartOpen, setCartOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

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
      <Header onOpenCart={() => setCartOpen(true)} />
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
      <CartPanel open={cartOpen} onClose={() => setCartOpen(false)} />
      <Footer />
      {isHome && <BottomDock onOpenCart={() => setCartOpen(true)} />}
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <Home /> },
      { path: 'shop', element: <ShopPage /> },
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
