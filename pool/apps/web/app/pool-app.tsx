'use client';

import { useEffect, useMemo, useState } from 'react';
import { copy, type Language } from './copy';

type Pool = { id: string; title: string; area: string; state: string; closesAt: string; unit: string };
type View = 'discover' | 'saved' | 'how';
const STORAGE_KEY = 'pool.shortlist.v1';

function formatClosing(value: string, language: Language, c: ReturnType<typeof getCopy>) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return c.awaiting;
  return new Intl.DateTimeFormat(language === 'en' ? 'en-IN' : language === 'te' ? 'te-IN' : 'hi-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata',
  }).format(date);
}

function getCopy(language: Language) { return copy[language]; }

export function PoolApp() {
  const [language, setLanguage] = useState<Language>('en');
  const c = getCopy(language);
  const [view, setView] = useState<View>('discover');
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<Pool | null>(null);

  useEffect(() => {
    try { setSaved(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')); } catch { /* empty */ }
  }, []);

  const loadPools = async (term = submitted) => {
    setLoading(true); setError(false);
    try {
      const response = await fetch(`/api/pools?q=${encodeURIComponent(term)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('catalog unavailable');
      const data = await response.json() as { pools?: Pool[] };
      setPools(data.pools ?? []);
    } catch { setError(true); setPools([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadPools(''); }, []);

  const saveQuery = () => {
    const clean = query.trim();
    if (!clean) { setNotice(c.savePrompt); return; }
    const next = [clean, ...saved.filter(item => item.toLowerCase() !== clean.toLowerCase())].slice(0, 20);
    setSaved(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setNotice(c.savedNotice); }
    catch { setNotice(c.storageError); }
    window.setTimeout(() => setNotice(''), 2800);
  };

  const removeSaved = (item: string) => {
    const next = saved.filter(value => value !== item); setSaved(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* keep visible state */ }
  };

  const search = (term = query) => {
    const clean = term.trim(); setSubmitted(clean); setView('discover'); void loadPools(clean);
  };

  const visiblePools = useMemo(() => pools.filter(pool => pool.state !== 'CANCELLED'), [pools]);

  return <>
    <a className="skip-link" href="#main">{c.skip}</a>
    <div className="app-shell">
      <div className="preview-bar"><span className="preview-pill">{c.preview}</span><span>{c.previewNote}</span></div>
      <header className="site-header">
        <button className="brand" onClick={() => { setView('discover'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label="POOL home">
          <span className="brand-mark" aria-hidden="true">P</span><span>POOL</span>
        </button>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={view === 'discover' ? 'nav-link active' : 'nav-link'} onClick={() => setView('discover')}>{c.discover}</button>
          <button className={view === 'saved' ? 'nav-link active' : 'nav-link'} onClick={() => setView('saved')}>{c.saved}{saved.length > 0 && <span className="nav-count">{saved.length}</span>}</button>
          <button className={view === 'how' ? 'nav-link active' : 'nav-link'} onClick={() => setView('how')}>{c.how}</button>
        </nav>
        <div className="header-tools"><span className="india-chip"><span className="india-dot" />{c.india}</span><label className="language-picker"><span className="sr-only">{c.language}</span><select value={language} onChange={event => setLanguage(event.target.value as Language)} aria-label={c.language}><option value="en">EN</option><option value="te">తె</option><option value="hi">हि</option></select></label></div>
      </header>

      <main id="main">
        {view === 'discover' && <>
          <section className="hero-section" aria-labelledby="hero-title">
            <div className="hero-copy">
              <p className="eyebrow">{c.eyebrow}</p>
              <h1 id="hero-title">{c.headline}<br /><em>{c.headlineAccent}</em></h1>
              <p className="hero-intro">{c.intro}</p>
              <form className="search-card" onSubmit={event => { event.preventDefault(); search(); }}>
                <label htmlFor="product-search">{c.searchLabel}</label>
                <div className="search-row"><input id="product-search" value={query} onChange={event => setQuery(event.target.value)} placeholder={c.placeholder} autoComplete="off" /><button type="submit" className="primary-button">{c.search}</button></div>
                <p className="search-hint">{c.searchHint}</p>
              </form>
              <div className="hero-points"><span><b>{c.any}</b></span><span><b>{c.your}</b></span><span><b>{c.together}</b></span></div>
            </div>
            <div className="hero-art" aria-label={c.illustration} role="img">
              <div className="sun-disc" /><div className="art-caption"><strong>{c.small1}</strong><span>{c.small2}</span></div>
              <div className="pool-bag"><div className="bag-handle" /><div className="bag-face"><span className="bag-letter">P</span><span className="bag-word">POOL</span></div><div className="bag-shadow" /></div>
              <div className="person person-one"><i /><b /><span /></div><div className="person person-two"><i /><b /><span /></div><div className="person person-three"><i /><b /><span /></div>
              <div className="art-spark spark-one">✦</div><div className="art-spark spark-two">·</div><div className="art-spark spark-three">✦</div>
            </div>
          </section>
          <section className="promise-grid" aria-label="POOL promises"><article><div className="promise-icon orange">✓</div><div><h2>{c.noPressure}</h2><p>{c.noPressureText}</p></div></article><article><div className="promise-icon blue">↺</div><div><h2>{c.refundable}</h2><p>{c.refundableText}</p></div></article><article><div className="promise-icon green">~</div><div><h2>{c.wave}</h2><p>{c.waveText}</p></div></article></section>
          <section className="pools-section" aria-labelledby="pools-title">
            <div className="section-heading"><div><p className="eyebrow">{c.liveLabel}</p><h2 id="pools-title">{submitted ? `${c.result} “${submitted}”` : c.pools}</h2><p>{c.poolsIntro}</p></div><div className="section-actions"><button className="text-button" onClick={() => void loadPools()}>{c.refresh}</button>{submitted && <button className="text-button" onClick={() => { setQuery(''); search(''); }}>{c.clear}</button>}</div></div>
            {loading ? <div className="state-box loading-box"><span className="loader" />{c.loading}</div> : error ? <div className="state-box error-box"><div><strong>{c.unavailable}</strong><p>{c.unavailableText}</p></div><button className="secondary-button" onClick={() => void loadPools()}>{c.retry}</button></div> : visiblePools.length === 0 ? <div className="state-box empty-box"><div className="empty-mark">+</div><div><strong>{submitted ? c.noResults : c.empty}</strong><p>{submitted ? c.noResultsText : c.emptyText}</p></div>{submitted && <button className="secondary-button" onClick={saveQuery}>{c.save}</button>}</div> : <div className="pool-grid">{visiblePools.map(pool => <PoolCard key={pool.id} pool={pool} language={language} c={c} onOpen={() => setSelected(pool)} />)}</div>}
          </section>
        </>}
        {view === 'saved' && <SavedView saved={saved} c={c} onRemove={removeSaved} onSearch={term => { setQuery(term); search(term); }} onBack={() => setView('discover')} />}
        {view === 'how' && <HowView c={c} />}
      </main>
      <footer className="site-footer"><div><span className="footer-brand"><span className="brand-mark" aria-hidden="true">P</span> POOL</span><p>{c.footerNote}</p></div><span>{c.footer}</span></footer>
    </div>
    {notice && <div className="toast" role="status">{notice}</div>}
    {selected && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null); }}><section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="pool-dialog-title"><button className="modal-close" onClick={() => setSelected(null)} aria-label={c.close}>×</button><span className="status-badge">{c[`state_${selected.state}` as keyof typeof c] ?? c.state_UNKNOWN}</span><h2 id="pool-dialog-title">{selected.title}</h2><p className="modal-area">{selected.area || c.unknown}</p><dl className="detail-facts"><div><dt>{c.closes}</dt><dd>{formatClosing(selected.closesAt, language, c)}</dd></div><div><dt>{c.area}</dt><dd>{selected.area || c.unknown}</dd></div><div><dt>{c.unit}</dt><dd>{selected.unit || c.unknown}</dd></div></dl><div className="modal-note"><strong>{c.unconfirmed}</strong><p>{c.detailsNote}</p></div><p className="modal-footnote">{c.priceNote}</p></section></div>}
  </>;
}

function PoolCard({ pool, language, c, onOpen }: { pool: Pool; language: Language; c: ReturnType<typeof getCopy>; onOpen: () => void }) {
  const label = c[`state_${pool.state}` as keyof typeof c] ?? c.state_UNKNOWN;
  return <article className="pool-card"><div className="pool-card-top"><span className={`state-dot state-${pool.state.toLowerCase()}`} /> <span>{label}</span><span className="pool-id">{pool.id.slice(0, 8)}</span></div><h3>{pool.title}</h3><p className="pool-location">⌖ {pool.area || c.unknown}</p><div className="pool-card-bottom"><span>{c.closes}<strong>{formatClosing(pool.closesAt, language, c)}</strong></span><button className="card-button" onClick={onOpen}>{c.details}</button></div></article>;
}

function SavedView({ saved, c, onRemove, onSearch, onBack }: { saved: string[]; c: ReturnType<typeof getCopy>; onRemove: (item: string) => void; onSearch: (item: string) => void; onBack: () => void }) {
  return <section className="saved-view content-view"><p className="eyebrow">{c.saved}</p><h1>{c.savedTitle}</h1><p className="view-intro">{c.savedIntro}</p>{saved.length === 0 ? <div className="state-box empty-box saved-empty"><div className="empty-mark">♡</div><div><strong>{c.savedEmpty}</strong><p>{c.savedEmptyText}</p></div><button className="secondary-button" onClick={onBack}>{c.back}</button></div> : <div className="saved-list">{saved.map(item => <article className="saved-item" key={item}><div><span className="saved-item-icon">↗</span><div><strong>{item}</strong><small>{c.unconfirmed}</small></div></div><div><button className="text-button" onClick={() => onSearch(item)}>{c.find}</button><button className="remove-button" onClick={() => onRemove(item)}>{c.remove}</button></div></article>)}</div>}</section>;
}

function HowView({ c }: { c: ReturnType<typeof getCopy> }) {
  return <section className="how-view content-view"><p className="eyebrow">{c.stepsLabel}</p><h1>{c.stepsTitle}</h1><div className="steps-grid"><article><span>01</span><h2>{c.step1}</h2><p>{c.step1Text}</p></article><article><span>02</span><h2>{c.step2}</h2><p>{c.step2Text}</p></article><article><span>03</span><h2>{c.step3}</h2><p>{c.step3Text}</p></article></div><div className="faq"><p className="eyebrow">{c.faq}</p>{([['q1','a1'], ['q2','a2'], ['q3','a3'], ['q4','a4']] as const).map(([question, answer]) => <details key={question}><summary>{c[question]}</summary><p>{c[answer]}</p></details>)}</div></section>;
}
