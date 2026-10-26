import { useContext, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContextObject';
import Icon from './Icon';
import './UserManualCenter.css';

const EDITIONS = { en: { label: 'English', file: 'VMS_User_Manual_English.pdf' }, ceb: { label: 'Bisaya (Cebuano)', file: 'VMS_User_Manual_Bisaya.pdf' }, fil: { label: 'Tagalog (Filipino)', file: 'VMS_User_Manual_Tagalog.pdf' } };

function ManualEmailDialog({ language, onClose, trigger }) {
  const { user } = useContext(AuthContext);
  const ref = useRef(null);
  const sendingRef = useRef(false);
  const [email, setEmail] = useState(user?.email_verified_at ? user.email : '');
  const [challenge, setChallenge] = useState(null);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [challengeError, setChallengeError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; trigger?.focus(); };
  }, [trigger]);
  useEffect(() => {
    let active = true;
    api.get('/manuals/challenge').then(({ data }) => { if (active) { setChallenge(data); setChallengeError(''); setAnswer(''); } })
      .catch(() => { if (active) setChallengeError('Could not load verification. Please retry.'); });
    return () => { active = false; };
  }, [retry]);
  const send = async (event) => {
    event.preventDefault();
    if (sendingRef.current || !challenge) return;
    sendingRef.current = true; setBusy(true); setNotice(null);
    try {
      const { data } = await api.post('/manuals/email', { language, email, challenge_token: challenge.token, challenge_answer: answer });
      setNotice({ type: 'success', text: data.message });
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || 'Could not send the manual. Please try again.' });
      setChallenge(null); setRetry((value) => value + 1);
    } finally { sendingRef.current = false; setBusy(false); }
  };
  const containFocus = (event) => {
    if (event.key !== 'Tab') return;
    const controls = [...ref.current.querySelectorAll('button:not(:disabled), input:not(:disabled)')];
    const first = controls[0]; const last = controls.at(-1);
    if (!first) { event.preventDefault(); ref.current.focus(); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  return <dialog ref={ref} tabIndex={-1} className="manual-dialog" aria-labelledby="manual-email-title" onKeyDown={containFocus} onClose={onClose} onClick={(event) => { const bounds = ref.current.getBoundingClientRect(); const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom; if (event.target === event.currentTarget && outside && !busy) ref.current.close(); }} onCancel={(event) => { if (busy) event.preventDefault(); }}>
    <div className="manual-dialog-heading"><div><p className="manual-eyebrow">Complete PDF • {EDITIONS[language].label}</p><h3 id="manual-email-title">Send to My Email</h3></div><button type="button" className="manual-icon-button" onClick={() => ref.current.close()} disabled={busy} aria-label="Close email dialog"><Icon name="close" size={20} /></button></div>
    <form onSubmit={send}>
      <label className="manual-field">Email address<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" disabled={busy || notice?.type === 'success'} /></label>
      {notice?.type !== 'success' && <><label className="manual-field">{challenge?.question || 'Verification question'}<input inputMode="numeric" required maxLength={3} value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={!challenge || busy} autoComplete="off" aria-describedby="manual-verification-help" /></label><p id="manual-verification-help" className="manual-help">Answer this short question to help prevent automated email abuse.</p>{challengeError && <p role="alert">{challengeError} <button type="button" className="manual-text-button" onClick={() => setRetry((value) => value + 1)}>Retry</button></p>}</>}
      {notice && <p className={`manual-notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.text}</p>}
      <div className="manual-dialog-actions"><button className="manual-button is-secondary" type="button" disabled={busy} onClick={() => ref.current.close()}>{notice?.type === 'success' ? 'Close' : 'Cancel'}</button>{notice?.type !== 'success' && <button className="manual-button" type="submit" disabled={busy || !challenge}>{busy ? 'Sending manual…' : 'Send Manual'}</button>}</div>
    </form>
  </dialog>;
}

export default function UserManualCenter() {
  const [language, setLanguage] = useState('en');
  const [emailDialog, setEmailDialog] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const downloadingRef = useRef(false);
  const [error, setError] = useState('');
  const download = async () => {
    if (downloadingRef.current) return;
    const selected = language;
    downloadingRef.current = true; setDownloading(true); setError('');
    try {
      const { data } = await api.get(`/manuals/${selected}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a'); link.href = url; link.download = EDITIONS[selected].file;
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError('This PDF is temporarily unavailable. Please try again later.'); }
    finally { downloadingRef.current = false; setDownloading(false); }
  };
  return <section className="about-section manual-center" id="user-manual" aria-labelledby="manual-title"><div className="about-container">
    <header className="about-section-head"><p className="about-eyebrow">Your step-by-step guide</p><h2 id="manual-title">Learn How to Use VMS</h2><p>Access our complete step-by-step user manual for Administrators, Custodians, and Maintenance Personnel. Choose your preferred language and download the guide or receive it by email.</p></header>
    <div className="manual-card"><div className="manual-card-intro"><span className="manual-book" aria-hidden="true"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15" /></svg></span><div><h3>VMS User Manual</h3><p>One complete guide for all three operational roles, with real application screenshots and clear instructions.</p><span className="manual-meta">PDF • Version 1.0 • All three roles</span></div></div><div className="manual-controls"><label className="manual-field" htmlFor="manual-language">Preferred language<select id="manual-language" value={language} onChange={(event) => setLanguage(event.target.value)}>{Object.entries(EDITIONS).map(([code, edition]) => <option key={code} value={code}>{edition.label}</option>)}</select></label><div className="manual-actions"><button className="manual-button" type="button" onClick={download} disabled={downloading}><Icon name="download" size={18} />{downloading ? 'Downloading…' : 'Download PDF'}</button><button className="manual-button is-secondary" type="button" aria-haspopup="dialog" onClick={(event) => setEmailDialog({ language, trigger: event.currentTarget })}><Icon name="mail" size={18} />Send to My Email</button></div></div></div>
    {error && <p className="manual-notice error" role="alert">{error}</p>}
    {emailDialog && <ManualEmailDialog {...emailDialog} onClose={() => setEmailDialog(null)} />}
  </div></section>;
}
