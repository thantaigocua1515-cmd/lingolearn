import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, signUp, signIn, signOut, getCurrentUser, saveGameScore } from './supabaseClient';

// ============================================
// Types
// ============================================
interface Language {
  id: number;
  code: string;
  name: string;
  flag: string;
  is_active: boolean;
  special_chars: string[];
}

interface Vocabulary {
  id: number;
  word: string;
  translation: string;
  language_code: string;
  topic_id: number;
  attributes: {
    gender?: string;
    plural?: string;
    mnemonic?: string;
  };
  examples: Array<{
    text: string;
    translation?: string;
  }>;
}

interface GameScore {
  id: number;
  user_id: string;
  score: number;
  max_combo: number;
  played_at: string;
}

// ============================================
// Mock Data (Fallback when Supabase not configured)
// ============================================
const MOCK_LANGUAGES: Language[] = [
  {
    id: 1,
    code: 'de',
    name: 'Tiếng Đức',
    flag: '🇩🇪',
    is_active: true,
    special_chars: ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'],
  },
  {
    id: 2,
    code: 'en',
    name: 'Tiếng Anh',
    flag: '🇬🇧',
    is_active: false,
    special_chars: [],
  },
  {
    id: 3,
    code: 'ja',
    name: 'Tiếng Nhật',
    flag: '🇯🇵',
    is_active: false,
    special_chars: [],
  },
  {
    id: 4,
    code: 'zh',
    name: 'Tiếng Trung',
    flag: '🇨🇳',
    is_active: false,
    special_chars: [],
  },
];

const MOCK_VOCABULARIES: Vocabulary[] = [
  {
    id: 1,
    word: 'Hund',
    translation: 'Con chó',
    language_code: 'de',
    topic_id: 1,
    attributes: { gender: 'der', plural: 'Hunde', mnemonic: 'Con chó ĐỰC chạy nhanh như DƯƠNG (der)' },
    examples: [{ text: 'Der Hund spielt im Garten.', translation: 'Con chó chơi trong vườn.' }],
  },
  {
    id: 2,
    word: 'Katze',
    translation: 'Con mèo',
    language_code: 'de',
    topic_id: 1,
    attributes: { gender: 'die', plural: 'Katzen', mnemonic: 'Con mèo CÁI (die) rất dễ thương' },
    examples: [{ text: 'Die Katze schläft auf dem Sofa.', translation: 'Con mèo ngủ trên ghế sofa.' }],
  },
  {
    id: 3,
    word: 'Haus',
    translation: 'Ngôi nhà',
    language_code: 'de',
    topic_id: 2,
    attributes: { gender: 'das', plural: 'Häuser', mnemonic: 'Ngôi nhà ĐỨNG (das) vững chãi' },
    examples: [{ text: 'Das Haus ist sehr groß.', translation: 'Ngôi nhà rất lớn.' }],
  },
  {
    id: 4,
    word: 'Tisch',
    translation: 'Cái bàn',
    language_code: 'de',
    topic_id: 2,
    attributes: { gender: 'der', plural: 'Tische', mnemonic: 'Cái bàn ĐỂ (der) sách vở' },
    examples: [{ text: 'Der Tisch steht im Zimmer.', translation: 'Cái bàn đứng trong phòng.' }],
  },
  {
    id: 5,
    word: 'Blume',
    translation: 'Bông hoa',
    language_code: 'de',
    topic_id: 3,
    attributes: { gender: 'die', plural: 'Blumen', mnemonic: 'Bông hoa ĐẸP (die) trong vườn' },
    examples: [{ text: 'Die Blume blüht im Frühling.', translation: 'Bông hoa nở vào mùa xuân.' }],
  },
  {
    id: 6,
    word: 'Buch',
    translation: 'Quyển sách',
    language_code: 'de',
    topic_id: 3,
    attributes: { gender: 'das', plural: 'Bücher', mnemonic: 'Quyển sách ĐỌC (das) mỗi ngày' },
    examples: [{ text: 'Das Buch ist sehr interessant.', translation: 'Quyển sách rất thú vị.' }],
  },
  {
    id: 7,
    word: 'Stuhl',
    translation: 'Cái ghế',
    language_code: 'de',
    topic_id: 2,
    attributes: { gender: 'der', plural: 'Stühle', mnemonic: 'Cái ghế ĐỂ (der) ngồi' },
    examples: [{ text: 'Der Stuhl ist bequem.', translation: 'Cái ghế thoải mái.' }],
  },
  {
    id: 8,
    word: 'Schule',
    translation: 'Trường học',
    language_code: 'de',
    topic_id: 4,
    attributes: { gender: 'die', plural: 'Schulen', mnemonic: 'Trường học của các bạn nỮ (die)' },
    examples: [{ text: 'Die Schule beginnt um 8 Uhr.', translation: 'Trường bắt đầu lúc 8 giờ.' }],
  },
  {
    id: 9,
    word: 'Auto',
    translation: 'Xe hơi',
    language_code: 'de',
    topic_id: 5,
    attributes: { gender: 'das', plural: 'Autos', mnemonic: 'Xe hơi ĐẠP (das) ga chạy nhanh' },
    examples: [{ text: 'Das Auto fährt schnell.', translation: 'Xe hơi chạy nhanh.' }],
  },
  {
    id: 10,
    word: 'Baum',
    translation: 'Cái cây',
    language_code: 'de',
    topic_id: 3,
    attributes: { gender: 'der', plural: 'Bäume', mnemonic: 'Cây ĐỨNG (der) cao trong rừng' },
    examples: [{ text: 'Der Baum ist sehr alt.', translation: 'Cây rất cũ.' }],
  },
  {
    id: 11,
    word: 'Sonne',
    translation: 'Mặt trời',
    language_code: 'de',
    topic_id: 6,
    attributes: { gender: 'die', plural: 'Sonnen', mnemonic: 'Mặt trời nÓNG (die) rực rỡ' },
    examples: [{ text: 'Die Sonne scheint heute.', translation: 'Hôm nay mặt trời chiếu sáng.' }],
  },
  {
    id: 12,
    word: 'Kind',
    translation: 'Đứa trẻ',
    language_code: 'de',
    topic_id: 1,
    attributes: { gender: 'das', plural: 'Kinder', mnemonic: 'Đứa trẻ ĐÁNG (das) yêu' },
    examples: [{ text: 'Das Kind spielt im Park.', translation: 'Đứa trẻ chơi trong công viên.' }],
  },
];

// ============================================
// Main App Component
// ============================================
export default function App() {
  // Auth State
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // App State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currentLang, setCurrentLang] = useState<Language>(MOCK_LANGUAGES[0]);
  const [languages, setLanguages] = useState<Language[]>(MOCK_LANGUAGES);
  const [activeTab, setActiveTab] = useState<'flashcard' | 'game'>('flashcard');
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>(MOCK_VOCABULARIES);
  const [loading, setLoading] = useState(false);

  // Flashcard State
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Game State
  const [gameActive, setGameActive] = useState(false);
  const [gameWord, setGameWord] = useState<Vocabulary | null>(null);
  const [gameScore, setGameScore] = useState(0);
  const [gameCombo, setGameCombo] = useState(0);
  const [gameMaxCombo, setGameMaxCombo] = useState(0);
  const [gameTimeLeft, setGameTimeLeft] = useState(5000);
  const [gameResult, setGameResult] = useState<'correct' | 'wrong' | null>(null);
  const [gameHistory, setGameHistory] = useState<GameScore[]>([]);
  const [highScore, setHighScore] = useState(0);
  const gameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // ============================================
  // Theme Management
  // ============================================
  useEffect(() => {
    const savedTheme = localStorage.getItem('linguaplay-theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('linguaplay-theme', newTheme);
  };

  // ============================================
  // Auth Functions
  // ============================================
  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (e) {
      // Supabase not configured, continue without auth
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      if (authMode === 'register') {
        const { error } = await signUp(authEmail, authPassword);
        if (error) throw error;
      } else {
        const { error } = await signIn(authEmail, authPassword);
        if (error) throw error;
      }
      await checkUser();
    } catch (err: any) {
      setAuthError(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

// ============================================
// Load Data
// ============================================
  useEffect(() => {
    loadData();
  }, [currentLang]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Try loading from Supabase
      const { data: langData } = await supabase.from('languages').select('*').order('name');
      if (langData && langData.length > 0) {
        setLanguages(langData);
        const activeLang = langData.find((l: any) => l.code === currentLang.code) || langData[0];
        setCurrentLang(activeLang);
      }

      const { data: vocabData } = await supabase
        .from('vocabularies')
        .select('*')
        .eq('language_code', currentLang.code)
        .limit(50);

      if (vocabData && vocabData.length > 0) {
        setVocabularies(vocabData);
      } else {
        // Fallback: try Tatoeba API for additional sentences
        await loadFromTatoeba();
        setVocabularies(MOCK_VOCABULARIES);
      }

      // Load high scores
      if (user) {
        const { data: scores } = await supabase
          .from('game_scores')
          .select('*')
          .eq('user_id', user.id)
          .eq('language_code', currentLang.code)
          .eq('game_type', 'gender_reflex')
          .order('score', { ascending: false })
          .limit(1);

        if (scores && scores.length > 0) {
          setHighScore(scores[0].score);
        }
      }
    } catch (e) {
      // Use mock data as fallback
      setVocabularies(MOCK_VOCABULARIES);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Tatoeba API Integration
  // ============================================
  const loadFromTatoeba = async () => {
    try {
      // Tatoeba API: Search for German sentences
      const response = await fetch(
        `https://tatoeba.org/eng/api/v0/search?from=deu&to=vie&query=&has_audio=yes&sort=relevance&limit=10`
      );
      if (response.ok) {
        const data = await response.json();
        // Process Tatoeba results if needed
        if (data && data.results) {
          console.log('Tatoeba API loaded:', data.results.length, 'sentences');
        }
      }
    } catch (e) {
      console.log('Tatoeba API not available, using local data');
    }
  };

  // Fetch example sentences from Tatoeba for current word
  const fetchTatoebaSentence = async (word: string): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://tatoeba.org/eng/api/v0/search?from=deu&to=vie&query=${encodeURIComponent(word)}&sort=relevance&limit=1`
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.results && data.results.length > 0) {
          return data.results[0].text;
        }
      }
    } catch (e) {
      // Silently fail
    }
    return null;
  };
  // ============================================
  // Web Speech API
  // ============================================
  const speakWord = (word: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = `${currentLang.code}-${currentLang.code.toUpperCase()}`;
      if (currentLang.code === 'de') utterance.lang = 'de-DE';
      utterance.rate = 0.85;
      utterance.pitch = 1;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  // ============================================
  // Flashcard Functions
  // ============================================
  const filteredVocab = vocabularies.filter(
    (v) =>
      v.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.translation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentVocab = filteredVocab[currentCardIndex] || null;

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev + 1) % filteredVocab.length);
    }, 150);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev - 1 + filteredVocab.length) % filteredVocab.length);
    }, 150);
  };

  // ============================================
  // Game Functions
  // ============================================
  const getRandomVocab = useCallback((): Vocabulary => {
    const nouns = vocabularies.filter((v) => v.attributes?.gender);
    return nouns[Math.floor(Math.random() * nouns.length)];
  }, [vocabularies]);

  const startGame = () => {
    setGameActive(true);
    setGameScore(0);
    setGameCombo(0);
    setGameMaxCombo(0);
    setGameTimeLeft(5000);
    setGameWord(getRandomVocab());
    setGameResult(null);

    // Start countdown timer (5 seconds per round, total 60 seconds)
    let totalTime = 60000;
    gameTimerRef.current = setInterval(() => {
      totalTime -= 100;
      if (totalTime <= 0) {
        endGame();
      }
    }, 100);

    // Word timer (5 seconds per word)
    gameIntervalRef.current = setInterval(() => {
      setGameTimeLeft((prev) => {
        const newTime = prev - 100;
        if (newTime <= 0) {
          // Time's up for this word - reset combo
          setGameCombo(0);
          return 5000;
        }
        return newTime;
      });
    }, 100);
  };

  const endGame = async () => {
    setGameActive(false);
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);

    if (gameScore > highScore) {
      setHighScore(gameScore);
    }

    // Save score to Supabase
    if (user) {
      try {
        await saveGameScore(user.id, currentLang.code, 'gender_reflex', gameScore, gameMaxCombo);
      } catch (e) {
        // Silently fail if Supabase not configured
      }
    }
  };

  const handleGameAnswer = (answer: string) => {
    if (!gameActive || !gameWord) return;

    const correctGender = gameWord.attributes?.gender?.toLowerCase();
    const isCorrect = answer === correctGender;

    if (isCorrect) {
      const newCombo = gameCombo + 1;
      const comboBonus = Math.floor(newCombo / 3) * 5;
      const points = 10 + comboBonus;
      setGameScore((prev) => prev + points);
      setGameCombo(newCombo);
      setGameMaxCombo((prev) => Math.max(prev, newCombo));
      setGameResult('correct');
    } else {
      setGameCombo(0);
      setGameResult('wrong');
    }

    // Next word after brief delay
    setTimeout(() => {
      setGameWord(getRandomVocab());
      setGameTimeLeft(5000);
      setGameResult(null);
    }, 300);
  };

  // Keyboard controls for game
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameActive) return;

      switch (e.key) {
        case 'ArrowLeft':
          handleGameAnswer('der');
          break;
        case 'ArrowUp':
          handleGameAnswer('die');
          break;
        case 'ArrowRight':
          handleGameAnswer('das');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameActive, gameWord, gameCombo]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    };
  }, []);

  // ============================================
  // Virtual Keyboard
  // ============================================
  const insertChar = (char: string) => {
    setSearchQuery((prev) => prev + char);
  };

  // ============================================
  // Render: Auth Screen
  // ============================================
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-body)' }}>
        {/* Navbar */}
        <nav className="navbar-custom d-flex align-items-center justify-content-between px-4">
          <span className="navbar-brand-custom">
            <i className="bi bi-translate me-2"></i>LinguaPlay
          </span>
          <button className="theme-toggle" onClick={toggleTheme}>
            <i className={`bi ${theme === 'light' ? 'bi-moon-fill' : 'bi-sun-fill'}`}></i>
          </button>
        </nav>

        {/* Auth Form */}
        <div className="auth-container">
          <h2 className="auth-title">
            {authMode === 'login' ? '👋 Chào mừng trở lại!' : '🚀 Tạo tài khoản mới'}
          </h2>
          <p className="auth-subtitle">
            {authMode === 'login'
              ? 'Đăng nhập để tiếp tục hành trình học tập'
              : 'Bắt đầu học ngôn ngữ ngay hôm nay'}
          </p>

          {authError && (
            <div className="alert alert-danger" role="alert" style={{ borderRadius: 'var(--border-radius-sm)', fontSize: '0.9rem' }}>
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth}>
            <div className="mb-3">
              <label className="form-label" style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Email
              </label>
              <input
                type="email"
                className="form-control-custom"
                placeholder="your@email.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <label className="form-label" style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Mật khẩu
              </label>
              <input
                type="password"
                className="form-control-custom"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              className="btn-3d btn-3d-primary w-100"
              disabled={authLoading}
              style={{ padding: '14px', fontSize: '1rem' }}
            >
              {authLoading ? (
                <span><span className="spinner-custom" style={{ width: 20, height: 20, borderWidth: 3, display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }}></span>Đang xử lý...</span>
              ) : (
                <span><i className="bi bi-box-arrow-in-right me-2"></i>{authMode === 'login' ? 'Đăng nhập' : 'Đăng ký'}</span>
              )}
            </button>
          </form>

          <div className="text-center mt-4">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {authMode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
            </span>
            <button
              onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
            >
              {authMode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
            </button>
          </div>

          {/* Demo Mode */}
          <div className="text-center mt-3">
            <button
              onClick={() => setUser({ id: 'demo-user', email: 'demo@linguaplay.app' })}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
            >
              <i className="bi bi-eye me-1"></i>Trải nghiệm bản Demo (không cần đăng nhập)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // Render: Main Dashboard
  // ============================================
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)' }}>
      {/* ====== NAVBAR ====== */}
      <nav className="navbar-custom d-flex align-items-center justify-content-between px-3 px-md-4">
        <div className="d-flex align-items-center gap-3">
          <span className="navbar-brand-custom d-none d-md-inline">
            <i className="bi bi-translate me-2"></i>LinguaPlay
          </span>
          <span className="navbar-brand-custom d-md-none" style={{ fontSize: '1.2rem' }}>
            <i className="bi bi-translate me-1"></i>LP
          </span>

          {/* Language Dropdown */}
          <div className="dropdown">
            <button
              className="lang-badge dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              style={{ border: 'none', cursor: 'pointer' }}
            >
              {currentLang.flag} {currentLang.name}
            </button>
            <ul className="dropdown-menu-custom dropdown-menu">
              {languages.map((lang) => (
                <li key={lang.id}>
                  <button
                    className={`dropdown-item-custom ${!lang.is_active ? 'disabled' : ''}`}
                    onClick={() => lang.is_active && setCurrentLang(lang)}
                    disabled={!lang.is_active}
                  >
                    <span style={{ fontSize: '1.3rem' }}>{lang.flag}</span>
                    <span>{lang.name}</span>
                    {!lang.is_active && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        Sắp ra mắt
                      </span>
                    )}
                    {lang.is_active && lang.code === currentLang.code && (
                      <i className="bi bi-check-circle-fill ms-auto" style={{ color: 'var(--success)' }}></i>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="streak-badge d-none d-sm-inline-flex">
            <i className="bi bi-fire"></i> 3 ngày
          </span>
          <button className="theme-toggle" onClick={toggleTheme}>
            <i className={`bi ${theme === 'light' ? 'bi-moon-fill' : 'bi-sun-fill'}`}></i>
          </button>
          <div className="dropdown">
            <button
              className="theme-toggle"
              type="button"
              data-bs-toggle="dropdown"
              style={{ fontSize: '0.9rem', fontWeight: 600 }}
            >
              <i className="bi bi-person-circle"></i>
            </button>
            <ul className="dropdown-menu-custom dropdown-menu dropdown-menu-end">
              <li>
                <div className="dropdown-item-custom" style={{ cursor: 'default' }}>
                  <i className="bi bi-envelope"></i>
                  <span style={{ fontSize: '0.85rem' }}>{user.email}</span>
                </div>
              </li>
              <li><hr className="dropdown-divider" style={{ borderColor: 'var(--border-color)' }} /></li>
              <li>
                <button className="dropdown-item-custom" onClick={handleSignOut}>
                  <i className="bi bi-box-arrow-right"></i>
                  <span>Đăng xuất</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* ====== MAIN CONTENT ====== */}
      <main className="container-fluid px-3 px-md-4 py-4" style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Stats Row */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="stat-card">
              <div className="d-flex align-items-center gap-3">
                <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)' }}>
                  <i className="bi bi-book"></i>
                </div>
                <div>
                  <div className="stat-value">{vocabularies.length}</div>
                  <div className="stat-label">Từ vựng</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="stat-card">
              <div className="d-flex align-items-center gap-3">
                <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)' }}>
                  <i className="bi bi-check-circle"></i>
                </div>
                <div>
                  <div className="stat-value">{currentCardIndex + 1}/{filteredVocab.length}</div>
                  <div className="stat-label">Đã học</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="stat-card">
              <div className="d-flex align-items-center gap-3">
                <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: 'var(--accent)' }}>
                  <i className="bi bi-trophy"></i>
                </div>
                <div>
                  <div className="stat-value">{highScore}</div>
                  <div className="stat-label">Kỷ lục</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="stat-card">
              <div className="d-flex align-items-center gap-3">
                <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)' }}>
                  <i className="bi bi-fire"></i>
                </div>
                <div>
                  <div className="stat-value">{gameMaxCombo || 0}</div>
                  <div className="stat-label">Max Combo</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-nav mb-4">
          <button
            className={`tab-btn ${activeTab === 'flashcard' ? 'active' : ''}`}
            onClick={() => setActiveTab('flashcard')}
          >
            <i className="bi bi-layers me-2"></i>Flashcard
          </button>
          <button
            className={`tab-btn ${activeTab === 'game' ? 'active' : ''}`}
            onClick={() => setActiveTab('game')}
          >
            <i className="bi bi-controller me-2"></i>Mini Game
          </button>
        </div>

        {/* ====== FLASHCARD TAB ====== */}
        {activeTab === 'flashcard' && (
          <div className="row g-4">
            {/* Search & Virtual Keyboard */}
            <div className="col-12">
              <div className="card-custom p-3 p-md-4">
                <div className="d-flex flex-column flex-md-row gap-3 align-items-stretch align-items-md-center">
                  <div className="flex-grow-1">
                    <div className="d-flex gap-2">
                      <input
                        type="text"
                        className="form-control-custom flex-grow-1"
                        placeholder="Tìm kiếm từ vựng..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentCardIndex(0); }}
                      />
                      <button
                        className="btn-speak"
                        onClick={() => currentVocab && speakWord(currentVocab.word)}
                        title="Phát âm"
                      >
                        <i className={`bi ${isSpeaking ? 'bi-soundwave' : 'bi-volume-up-fill'}`}></i>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Virtual Keyboard */}
                {currentLang.special_chars && currentLang.special_chars.length > 0 && (
                  <div className="mt-3">
                    <small style={{ color: 'var(--text-muted)', fontWeight: 500, marginBottom: 8, display: 'block' }}>
                      <i className="bi bi-keyboard me-1"></i>Bàn phím đặc biệt:
                    </small>
                    <div className="virtual-keyboard">
                      {currentLang.special_chars.map((char, idx) => (
                        <button key={idx} className="key-btn" onClick={() => insertChar(char)}>
                          {char}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Flashcard */}
            <div className="col-12 col-md-7">
              <div className="card-custom p-4">
                {loading ? (
                  <div className="d-flex justify-content-center align-items-center" style={{ height: 280 }}>
                    <div className="spinner-custom"></div>
                  </div>
                ) : currentVocab ? (
                  <>
                    <div className="flashcard-container" onClick={() => setIsFlipped(!isFlipped)}>
                      <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
                        {/* Front */}
                        <div className={`flashcard-front border-${currentVocab.attributes?.gender || 'der'}`}>
                          <div className={`flashcard-article article-${currentVocab.attributes?.gender || 'der'}`}>
                            {currentVocab.attributes?.gender || '?'}
                          </div>
                          <div className="flashcard-word">{currentVocab.word}</div>
                          {currentVocab.attributes?.plural && (
                            <small style={{ color: 'var(--text-muted)' }}>
                              Plural: {currentVocab.attributes.plural}
                            </small>
                          )}
                          <div className="mt-3">
                            <button
                              className="btn-speak"
                              onClick={(e) => { e.stopPropagation(); speakWord(currentVocab.word); }}
                            >
                              <i className="bi bi-volume-up-fill"></i>
                            </button>
                          </div>
                          <small style={{ color: 'var(--text-muted)', marginTop: 'auto', fontSize: '0.8rem' }}>
                            Nhấn để lật thẻ ↻
                          </small>
                        </div>
                        {/* Back */}
                        <div className={`flashcard-back border-${currentVocab.attributes?.gender || 'der'}`}>
                          <div className={`flashcard-article article-${currentVocab.attributes?.gender || 'der'}`}>
                            {currentVocab.attributes?.gender} {currentVocab.word}
                          </div>
                          <div className="flashcard-translation">{currentVocab.translation}</div>
                          {currentVocab.examples && currentVocab.examples.length > 0 && (
                            <div className="flashcard-example">
                              "{currentVocab.examples[0].text}"
                              {currentVocab.examples[0].translation && (
                                <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
                                  → {currentVocab.examples[0].translation}
                                </div>
                              )}
                            </div>
                          )}
                          {currentVocab.attributes?.mnemonic && (
                            <div className="flashcard-mnemonic">
                              <i className="bi bi-lightbulb me-1"></i>
                              {currentVocab.attributes.mnemonic}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="d-flex justify-content-between align-items-center mt-4">
                      <button className="btn-3d btn-3d-primary" onClick={prevCard} style={{ padding: '8px 20px' }}>
                        <i className="bi bi-chevron-left me-1"></i>Trước
                      </button>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                        {currentCardIndex + 1} / {filteredVocab.length}
                      </span>
                      <button className="btn-3d btn-3d-primary" onClick={nextCard} style={{ padding: '8px 20px' }}>
                        Tiếp<i className="bi bi-chevron-right ms-1"></i>
                      </button>
                    </div>

                    {/* Progress */}
                    <div className="progress-custom mt-3">
                      <div
                        className="progress-custom-bar"
                        style={{ width: `${((currentCardIndex + 1) / filteredVocab.length) * 100}%` }}
                      ></div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-5">
                    <i className="bi bi-search" style={{ fontSize: '3rem', color: 'var(--text-muted)' }}></i>
                    <p className="mt-3" style={{ color: 'var(--text-muted)' }}>Không tìm thấy từ vựng nào</p>
                  </div>
                )}
              </div>
            </div>

            {/* Vocabulary List */}
            <div className="col-12 col-md-5">
              <div className="card-custom p-3" style={{ maxHeight: 500, overflowY: 'auto' }}>
                <h6 style={{ fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
                  <i className="bi bi-list-ul me-2"></i>Danh sách từ vựng
                </h6>
                {filteredVocab.map((vocab, idx) => (
                  <div
                    key={vocab.id}
                    className="d-flex align-items-center gap-3 p-2 rounded-3 mb-2"
                    style={{
                      background: idx === currentCardIndex ? 'var(--primary-light)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      borderLeft: `3px solid var(--gender-${vocab.attributes?.gender || 'der'})`,
                    }}
                    onClick={() => { setCurrentCardIndex(idx); setIsFlipped(false); }}
                  >
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: `var(--gender-${vocab.attributes?.gender || 'der'})`,
                        color: 'white',
                        minWidth: 36,
                        textAlign: 'center',
                      }}
                    >
                      {vocab.attributes?.gender || '?'}
                    </span>
                    <div className="flex-grow-1">
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{vocab.word}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{vocab.translation}</div>
                    </div>
                    <button
                      className="btn-speak"
                      style={{ width: 32, height: 32, fontSize: '0.8rem' }}
                      onClick={(e) => { e.stopPropagation(); speakWord(vocab.word); }}
                    >
                      <i className="bi bi-volume-up-fill"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ====== GAME TAB ====== */}
        {activeTab === 'game' && (
          <div className="row g-4 justify-content-center">
            <div className="col-12 col-md-8 col-lg-6">
              <div className="game-container">
                <div className="text-center mb-3">
                  <h4 style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                    <i className="bi bi-lightning-charge-fill me-2" style={{ color: 'var(--accent)' }}></i>
                    Phản xạ Der / Die / Das
                  </h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Chọn giống của danh từ trong 5 giây! Phím: ← Der | ↑ Die | → Das
                  </p>
                </div>

                {!gameActive ? (
                  /* Game Start / Result Screen */
                  <div className="text-center py-4">
                    {gameScore > 0 ? (
                      <>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                          {gameScore >= 100 ? '🏆' : gameScore >= 50 ? '🎉' : '💪'}
                        </div>
                        <h3 style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Kết thúc!</h3>
                        <div className="game-score my-3">{gameScore} điểm</div>
                        <div className="d-flex justify-content-center gap-4 mb-4">
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '1.3rem' }}>x{gameMaxCombo}</div>
                            <small style={{ color: 'var(--text-muted)' }}>Max Combo</small>
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '1.3rem' }}>{highScore}</div>
                            <small style={{ color: 'var(--text-muted)' }}>Kỷ lục</small>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎮</div>
                        <h5 style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Sẵn sàng thử thách?</h5>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          Bạn có 60 giây. Mỗi danh từ có 5 giây để chọn giống đúng.<br />
                          Trả lời đúng liên tiếp để tăng Combo!
                        </p>
                        {highScore > 0 && (
                          <div className="mb-3">
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Kỷ lục: </span>
                            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{highScore} điểm</span>
                          </div>
                        )}
                      </>
                    )}
                    <button className="btn-3d btn-3d-success" onClick={startGame} style={{ padding: '14px 40px', fontSize: '1.1rem' }}>
                      <i className="bi bi-play-fill me-2"></i>
                      {gameScore > 0 ? 'Chơi lại' : 'Bắt đầu'}
                    </button>
                  </div>
                ) : (
                  /* Active Game Screen */
                  <div className={gameResult === 'correct' ? 'game-result-correct' : gameResult === 'wrong' ? 'game-result-wrong' : ''}>
                    {/* Timer Bar */}
                    <div className="game-timer">
                      <div
                        className="game-timer-bar"
                        style={{ width: `${(gameTimeLeft / 5000) * 100}%` }}
                      ></div>
                    </div>

                    {/* Score & Combo */}
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="game-score">
                        <i className="bi bi-star-fill me-1" style={{ fontSize: '0.8em' }}></i>
                        {gameScore}
                      </div>
                      {gameCombo >= 2 && (
                        <div className="game-combo">
                          <i className="bi bi-fire me-1"></i>Combo x{gameCombo}
                        </div>
                      )}
                    </div>

                    {/* Word Display */}
                    {gameWord && (
                      <div className="game-word" key={gameWord.id}>
                        {gameWord.word}
                      </div>
                    )}

                    {/* Answer Buttons */}
                    <div className="game-btn-group">
                      <button className="game-btn game-btn-der" onClick={() => handleGameAnswer('der')}>
                        Der
                        <span className="game-key-hint">← Trái</span>
                      </button>
                      <button className="game-btn game-btn-die" onClick={() => handleGameAnswer('die')}>
                        Die
                        <span className="game-key-hint">↑ Lên</span>
                      </button>
                      <button className="game-btn game-btn-das" onClick={() => handleGameAnswer('das')}>
                        Das
                        <span className="game-key-hint">→ Phải</span>
                      </button>
                    </div>

                    {/* Time remaining */}
                    <div className="text-center mt-3">
                      <small style={{ color: 'var(--text-muted)' }}>
                        <i className="bi bi-clock me-1"></i>
                        {Math.ceil(gameTimeLeft / 1000)}s cho từ này
                      </small>
                    </div>
                  </div>
                )}
              </div>

              {/* Game Instructions */}
              {!gameActive && (
                <div className="card-custom p-3 mt-3">
                  <h6 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <i className="bi bi-info-circle me-2"></i>Hướng dẫn
                  </h6>
                  <div className="row g-2 mt-1">
                    <div className="col-4 text-center">
                      <div style={{
                        padding: '8px',
                        borderRadius: 'var(--border-radius-sm)',
                        background: 'rgba(37, 99, 235, 0.1)',
                        color: 'var(--gender-der)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                      }}>
                        ← Der (Giống đực)
                      </div>
                    </div>
                    <div className="col-4 text-center">
                      <div style={{
                        padding: '8px',
                        borderRadius: 'var(--border-radius-sm)',
                        background: 'rgba(225, 29, 72, 0.1)',
                        color: 'var(--gender-die)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                      }}>
                        ↑ Die (Giống cái)
                      </div>
                    </div>
                    <div className="col-4 text-center">
                      <div style={{
                        padding: '8px',
                        borderRadius: 'var(--border-radius-sm)',
                        background: 'rgba(22, 163, 74, 0.1)',
                        color: 'var(--gender-das)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                      }}>
                        → Das (Giống trung)
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-4 mt-4" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <p className="mb-1">
          <i className="bi bi-heart-fill me-1" style={{ color: 'var(--danger)' }}></i>
          LinguaPlay © 2026 - Nền tảng học ngôn ngữ đa phương thức
        </p>
        <p className="mb-0" style={{ fontSize: '0.75rem' }}>
          Dữ liệu từ vựng từ Tatoeba API • Phát âm bởi Web Speech API
        </p>
      </footer>
    </div>
  );
}
