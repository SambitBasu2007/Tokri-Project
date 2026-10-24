import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Search, X } from 'lucide-react';
import styles from './SearchBar.module.css';

interface SpeechResultLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechResultLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechConstructor = new () => SpeechRecognitionLike;

function speechConstructor(): SpeechConstructor | null {
  if (typeof window === 'undefined') return null;
  const candidate = window as unknown as {
    SpeechRecognition?: SpeechConstructor;
    webkitSpeechRecognition?: SpeechConstructor;
  };
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

interface SearchBarProps {
  initialValue?: string;
  onSubmit?: (query: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  initialValue = '',
  onSubmit,
  placeholder = 'Search milk, atta, tomatoes…',
  className = '',
  autoFocus = false,
}: SearchBarProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [query, setQuery] = useState(initialValue);
  const [listening, setListening] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(false);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    setSpeechAvailable(Boolean(speechConstructor()));
    return () => recognitionRef.current?.stop();
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (onSubmit) {
      onSubmit(trimmed);
      return;
    }
    navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search');
  };

  const listen = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Constructor = speechConstructor();
    if (!Constructor) return;
    const recognition = new Constructor();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) setQuery(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  return (
    <form
      className={`${styles.form} ${className}`.trim()}
      role="search"
      onSubmit={submit}
    >
      <Search className={styles.searchIcon} size={19} strokeWidth={1.5} aria-hidden />
      <input
        ref={inputRef}
        type="search"
        className={styles.input}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        aria-label="Search products"
        autoFocus={autoFocus}
        autoComplete="off"
        enterKeyHint="search"
      />
      {query ? (
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => {
            setQuery('');
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
        >
          <X size={17} strokeWidth={1.5} aria-hidden />
        </button>
      ) : null}
      {speechAvailable ? (
        <button
          type="button"
          className={`${styles.iconButton} ${listening ? styles.listening : ''}`.trim()}
          onClick={listen}
          aria-label={listening ? 'Stop voice search' : 'Search by voice'}
          aria-pressed={listening}
        >
          <Mic size={18} strokeWidth={1.5} aria-hidden />
        </button>
      ) : null}
      <button type="submit" className="visually-hidden">
        Search
      </button>
    </form>
  );
}
