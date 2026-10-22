import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Trash2 } from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { useAddresses } from '../hooks/useAddresses';
import { supabase } from '../lib/supabase';
import { AuthForm } from '../components/AuthForm';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import styles from './Profile.module.css';
import common from './common.module.css';

export default function ProfilePage() {
  const { user, profile, communities, signedIn, updateName, signOut, refreshProfile } = useAuth();
  const { addresses, save, remove } = useAddresses();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(profile?.fullName ?? '');
  const [savingName, setSavingName] = useState(false);
  const [label, setLabel] = useState('Home');
  const [line, setLine] = useState('');
  const [pincode, setPincode] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile?.fullName) setName(profile.fullName);
  }, [profile?.fullName]);

  if (!signedIn) {
    return (
      <div className="page">
        <div className="container">
          <div className={common.pageHead}>
            <div>
              <h1>Account</h1>
              <p className={common.lede}>Sign in to sync carts, orders, addresses and price watches.</p>
            </div>
          </div>
          <div className={common.split}>
            <div className={common.panel}>
              <AuthForm />
            </div>
            <div className={common.panel}>
              <h2 className={common.panelTitle}>What needs an account</h2>
              <ul className={common.prose} style={{ marginTop: '8px' }}>
                <li>Community shared carts and join requests.</li>
                <li>Cross-device personal cart sync.</li>
                <li>Saved addresses and order history.</li>
                <li>Price watches stored on your profile.</li>
              </ul>
              <p className={common.smallNote} style={{ marginTop: '12px' }}>
                You can still compare prices and check out as a guest. Guest orders stay in this
                browser.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const saveName = async () => {
    if (!name.trim()) {
      toast('Enter a name.', 'error');
      return;
    }
    setSavingName(true);
    try {
      await updateName(name.trim());
      toast('Name updated.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save your name.', 'error');
    } finally {
      setSavingName(false);
    }
  };

  const addAddress = async () => {
    if (!line.trim()) {
      toast('Enter an address line.', 'error');
      return;
    }
    await save({
      label: label || 'Home',
      line,
      pincode: pincode.trim() || null,
      lat: null,
      lng: null,
      isDefault: addresses.length === 0,
    });
    setLine('');
    setPincode('');
    setLabel('Home');
  };

  const doSignOut = async () => {
    try {
      await signOut();
      toast('Signed out.');
      navigate('/');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not sign out.', 'error');
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_my_account');
      if (error) throw new Error(error.message);
      toast('Account and profile data deleted.', 'success');
      await signOut();
      navigate('/');
    } catch (err) {
      toast(
        err instanceof Error
          ? `${err.message} — run the V2 migration to add delete_my_account().`
          : 'Could not delete the account.',
        'error',
      );
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div className={common.pageHead}>
          <div>
            <h1>Account</h1>
            <p className={common.lede}>{user?.email}</p>
          </div>
          <button type="button" className="btn btn-sm" onClick={() => void doSignOut()}>
            <LogOut size={14} aria-hidden />
            Sign out
          </button>
        </div>

        <div className={common.split}>
          <div>
            <section className={common.panel}>
              <div className={common.panelHead}>
                <h2 className={common.panelTitle}>Profile</h2>
                <span className={common.panelMeta}>{communities.length} communities</span>
              </div>
              <div className={common.formGrid}>
                <div className={common.formRow}>
                  <label className={common.label} htmlFor="profile-name">
                    Display name
                  </label>
                  <input
                    id="profile-name"
                    className="field"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={profile?.email?.split('@')[0] ?? 'Your name'}
                  />
                </div>
                <div className={common.formRow}>
                  <span className={common.label}>Email</span>
                  <p className={styles.readonly}>{user?.email}</p>
                </div>
                <div className={common.actions}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => void saveName()}
                    disabled={savingName}
                  >
                    {savingName ? 'Saving…' : 'Save name'}
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => void refreshProfile()}>
                    Refresh
                  </button>
                </div>
              </div>
            </section>

            <section className={common.panel}>
              <div className={common.panelHead}>
                <h2 className={common.panelTitle}>Addresses</h2>
                <span className={common.panelMeta}>Stored on your profile only</span>
              </div>
              {addresses.length === 0 ? (
                <EmptyState title="No saved addresses">Add one below or at checkout.</EmptyState>
              ) : (
                <div className={common.rows}>
                  {addresses.map((address) => (
                    <div key={address.id} className={common.row}>
                      <div className={common.rowMain}>
                        <p className={common.rowTitle}>
                          {address.label}
                          {address.isDefault ? ' · default' : ''}
                        </p>
                        <p className={common.rowMeta}>
                          {address.line}
                          {address.pincode ? ` · PIN ${address.pincode}` : ''}
                        </p>
                      </div>
                      <button type="button" className="btn btn-sm" onClick={() => void remove(address.id)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className={common.formGrid} style={{ marginTop: '12px' }}>
                <div className={styles.addressGrid}>
                  <div className={common.formRow}>
                    <label className={common.label} htmlFor="addr-label">
                      Label
                    </label>
                    <input
                      id="addr-label"
                      className="field"
                      value={label}
                      onChange={(event) => setLabel(event.target.value)}
                    />
                  </div>
                  <div className={common.formRow}>
                    <label className={common.label} htmlFor="addr-pin">
                      Pincode
                    </label>
                    <input
                      id="addr-pin"
                      className="field"
                      value={pincode}
                      onChange={(event) => setPincode(event.target.value)}
                      inputMode="numeric"
                    />
                  </div>
                </div>
                <div className={common.formRow}>
                  <label className={common.label} htmlFor="addr-line">
                    Address line
                  </label>
                  <input
                    id="addr-line"
                    className="field"
                    value={line}
                    onChange={(event) => setLine(event.target.value)}
                    placeholder="Flat, street, area, city"
                  />
                </div>
                <div>
                  <button type="button" className="btn btn-sm" onClick={() => void addAddress()}>
                    Add address
                  </button>
                </div>
              </div>
            </section>
          </div>

          <aside>
            <section className={common.panel}>
              <h2 className={common.panelTitle}>Shortcuts</h2>
              <div className={common.rows} style={{ marginTop: '8px' }}>
                <div className={common.row}>
                  <Link to="/orders">Orders</Link>
                  <span className={common.rowMeta}>Tracking</span>
                </div>
                <div className={common.row}>
                  <Link to="/watchlist">Watchlist</Link>
                  <span className={common.rowMeta}>Price targets</span>
                </div>
                <div className={common.row}>
                  <Link to="/social">Communities</Link>
                  <span className={common.rowMeta}>{communities.length}</span>
                </div>
              </div>
            </section>

            <section className={common.panel}>
              <h2 className={common.panelTitle}>Delete account</h2>
              <p className={common.note} style={{ margin: '8px 0' }}>
                Removes your profile, cart, addresses, watches and community memberships. Orders
                belonging to communities remain in the shared activity record without your address.
              </p>
              <button type="button" className="btn btn-sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={14} aria-hidden />
                Delete my account and data
              </button>
            </section>
          </aside>
        </div>
      </div>

      <Modal open={confirmDelete} title="Delete this account?" onClose={() => setConfirmDelete(false)}>
        <p className={common.note}>
          This cannot be undone. Your profile, cart, addresses, watches and memberships are deleted.
          Community order history remains without your address or coordinates.
        </p>
        <div className={common.actions} style={{ marginTop: '16px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void deleteAccount()}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Yes, delete everything'}
          </button>
          <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}
