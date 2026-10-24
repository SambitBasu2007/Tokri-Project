import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../state/CartContext';
import { useAuth } from '../state/AuthContext';
import styles from './CartSwitcher.module.css';

export function CartSwitcher() {
  const { active, activeLabel, setActive, totals } = useCart();
  const { communities, signedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {active.type === 'community' && <Users size={13} aria-hidden />}
        <span className={styles.triggerLabel}>{activeLabel}</span>
        <span className={styles.count}>{totals.itemCount}</span>
        <ChevronDown size={13} aria-hidden />
      </button>
      {open && (
        <div className={styles.menu} role="menu" aria-label="Switch cart">
          <p className={styles.menuTitle}>Cart</p>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={active.type === 'personal'}
            className={`${styles.option} ${active.type === 'personal' ? styles.optionActive : ''}`}
            onClick={() => {
              setActive({ type: 'personal' });
              setOpen(false);
            }}
          >
            <span>Personal</span>
          </button>
          {signedIn ? (
            communities.length ? (
              <>
                <p className={styles.menuTitle}>Communities</p>
                {communities.slice(0, 10).map((community) => (
                  <button
                    key={community.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active.type === 'community' && active.communityId === community.id}
                    className={`${styles.option} ${
                      active.type === 'community' && active.communityId === community.id
                        ? styles.optionActive
                        : ''
                    }`}
                    onClick={() => {
                      setActive({ type: 'community', communityId: community.id });
                      setOpen(false);
                    }}
                  >
                    <span>{community.name}</span>
                    <span className={styles.optionMeta}>{community.members.length} members</span>
                  </button>
                ))}
              </>
            ) : (
              <p className={styles.hint}>
                No communities yet. <Link to="/social">Create or join one</Link> to share a cart.
              </p>
            )
          ) : (
            <p className={styles.hint}>
              <Link to="/social">Sign in</Link> to use a shared community cart.
            </p>
          )}
          {communities.length > 0 && (
            <p className={styles.hint}>
              <Link to="/social">Manage communities</Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
