import { useState, type FormEvent } from 'react';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import styles from './AuthForm.module.css';

export function AuthForm() {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!email.trim() || password.length < 6) {
      setError('Enter an email and a password of at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        toast('Signed in.', 'success');
      } else {
        const result = await signUp(email, password, name);
        setMessage(result);
        toast(result, 'success');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.tabs} role="tablist" aria-label="Account access">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signin'}
          className={`${styles.tab} ${mode === 'signin' ? styles.tabActive : ''}`}
          onClick={() => setMode('signin')}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signup'}
          className={`${styles.tab} ${mode === 'signup' ? styles.tabActive : ''}`}
          onClick={() => setMode('signup')}
        >
          Create account
        </button>
      </div>

      {mode === 'signup' && (
        <div className={styles.fieldRow}>
          <label className={styles.label} htmlFor="auth-name">
            Name
          </label>
          <input
            id="auth-name"
            className="field"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            placeholder="Your name"
          />
        </div>
      )}
      <div className={styles.fieldRow}>
        <label className={styles.label} htmlFor="auth-email">
          Email
        </label>
        <input
          id="auth-email"
          className="field"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>
      <div className={styles.fieldRow}>
        <label className={styles.label} htmlFor="auth-password">
          Password
        </label>
        <input
          id="auth-password"
          className="field"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          placeholder="At least 6 characters"
        />
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {message && <p className={styles.message}>{message}</p>}

      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
        {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>
      <p className={styles.note}>
        Email and password sign-in. Google sign-in, email alerts and password reset flows are not
        part of this build.
      </p>
    </form>
  );
}
