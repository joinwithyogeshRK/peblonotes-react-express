import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Archive,
  Bot,
  CalendarClock,
  FilePlus2,
  LogOut,
  NotebookTabs,
  RefreshCcw,
  Search,
  Share2,
  Sparkles,
  Trash2,
  Users
} from 'lucide-react';
import { api, apiBase } from './api.js';
import './styles.css';

const emptyEditor = {
  title: '',
  content: '',
  tags: '',
  category: 'Personal',
  type: 'note',
  meeting_at: ''
};

function App() {
  const [route, setRoute] = useState(window.location.pathname);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    api('/auth/me')
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (route.startsWith('/shared/')) {
    return <SharedNote shareId={route.split('/').pop()} />;
  }

  if (loading) return <div className="loading">Loading workspace...</div>;

  return user ? <Workspace user={user} onLogout={() => setUser(null)} /> : <Auth onAuthed={setUser} />;
}

function Auth({ onAuthed }) {
  const [mode, setMode] = useState('signup');
  const [form, setForm] = useState({ name: 'Demo User', email: 'demo@peblo.test', password: 'password123' });
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      const payload = mode === 'signup' ? form : { email: form.email, password: form.password };
      const { user } = await api(`/auth/${mode}`, { method: 'POST', body: payload });
      onAuthed(user);
    } catch (error) {
      setError(error.message);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-copy">
        <span className="logo">P</span>
        <p className="eyebrow">Peblo challenge</p>
        <h1>Collaborative AI notes for serious work.</h1>
        <p>React frontend, Express API, PostgreSQL persistence, secure sessions, and AI workflows in one full-stack workspace.</p>
      </section>
      <form className="auth-card" onSubmit={submit}>
        <div className="segmented">
          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Sign up</button>
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Log in</button>
        </div>
        {mode === 'signup' && (
          <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        )}
        <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
        <button className="primary" type="submit">Enter workspace</button>
        {error && <p className="error">{error}</p>}
      </form>
    </main>
  );
}

function Workspace({ user, onLogout }) {
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editor, setEditor] = useState(emptyEditor);
  const [filters, setFilters] = useState({ search: '', tag: '', archived: false });
  const [insights, setInsights] = useState(null);
  const [status, setStatus] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  const selected = notes.find((note) => note.id === selectedId);

  useEffect(() => {
    loadNotes();
    loadInsights();
  }, [filters.search, filters.tag, filters.archived]);

  useEffect(() => {
    if (selected) setEditor(noteToEditor(selected));
    else setEditor(emptyEditor);
  }, [selectedId, notes.length]);

  useEffect(() => {
    if (!selected) return;
    const timer = setTimeout(() => saveNote(), 500);
    setStatus('Saving...');
    return () => clearTimeout(timer);
  }, [editor.title, editor.content, editor.tags, editor.category, editor.type, editor.meeting_at]);

  async function loadNotes() {
    const params = new URLSearchParams({
      search: filters.search,
      tag: filters.tag,
      archived: String(filters.archived)
    });
    const { notes } = await api(`/notes?${params}`);
    setNotes(notes);
    setSelectedId((current) => current && notes.some((note) => note.id === current) ? current : notes[0]?.id || null);
  }

  async function loadInsights() {
    const { insights } = await api('/insights');
    setInsights(insights);
  }

  async function createNote(type = 'note') {
    const body = type === 'meeting'
      ? {
          title: 'New meeting',
          type: 'meeting',
          category: 'Work',
          tags: ['meeting'],
          meeting_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          content: '# Meeting agenda\n\n- Attendees:\n- Discussion:\n- Decisions:\n- Action items:'
        }
      : { title: 'Untitled note', type: 'note', category: 'Personal', tags: [], content: '' };
    const { note } = await api('/notes', { method: 'POST', body });
    setNotes((items) => [note, ...items]);
    setSelectedId(note.id);
    await loadInsights();
  }

  async function saveNote() {
    if (!selected) return;
    const body = editorToPayload(editor);
    const { note } = await api(`/notes/${selected.id}`, { method: 'PATCH', body });
    setNotes((items) => items.map((item) => item.id === note.id ? note : item));
    setStatus(note.is_public ? `Public: ${window.location.origin}/shared/${note.share_id}` : 'Saved');
    await loadInsights();
  }

  async function archiveNote() {
    if (!selected) return;
    const { note } = await api(`/notes/${selected.id}`, { method: 'PATCH', body: { archived: !selected.archived } });
    setNotes((items) => items.map((item) => item.id === note.id ? note : item));
    if (note.archived && !filters.archived) setSelectedId(null);
    await loadNotes();
    await loadInsights();
  }

  async function deleteNote() {
    if (!selected) return;
    if (pendingDelete !== selected.id) {
      setPendingDelete(selected.id);
      setStatus('Click Delete again to permanently remove this item.');
      setTimeout(() => setPendingDelete(null), 4000);
      return;
    }
    await api(`/notes/${selected.id}`, { method: 'DELETE' });
    setPendingDelete(null);
    setSelectedId(null);
    await loadNotes();
    await loadInsights();
  }

  async function generateAi() {
    if (!selected) return;
    await saveNote();
    setStatus('Generating AI output...');
    const { note } = await api(`/notes/${selected.id}/generate-summary`, { method: 'POST' });
    setNotes((items) => items.map((item) => item.id === note.id ? note : item));
    setStatus('AI output generated.');
    await loadInsights();
  }

  async function toggleShare() {
    if (!selected) return;
    const { note, share_url: shareUrl } = await api(`/notes/${selected.id}/share`, { method: 'POST' });
    setNotes((items) => items.map((item) => item.id === note.id ? note : item));
    setStatus(shareUrl ? `Public: ${window.location.origin}${shareUrl}` : 'Private note');
  }

  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    onLogout();
  }

  return (
    <main className="workspace">
      <aside className="sidebar">
        <div className="brand-row"><span className="logo small">P</span><div><strong>Peblo Notes</strong><span>{user.email}</span></div></div>
        <div className="create-grid">
          <button className="primary" onClick={() => createNote('note')}><FilePlus2 size={17} /> New note</button>
          <button className="secondary" onClick={() => createNote('meeting')}><CalendarClock size={17} /> New meeting</button>
        </div>
        <label><Search size={15} /> Search<input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Title, content, category" /></label>
        <label><NotebookTabs size={15} /> Tag filter<input value={filters.tag} onChange={(event) => setFilters({ ...filters, tag: event.target.value })} placeholder="meeting" /></label>
        <label className="check"><input type="checkbox" checked={filters.archived} onChange={(event) => setFilters({ ...filters, archived: event.target.checked })} /> Show archived</label>
        <div className="notes-list">
          {notes.map((note) => (
            <button key={note.id} className={`note-card ${note.id === selectedId ? 'active' : ''}`} onClick={() => setSelectedId(note.id)}>
              <strong>{note.title}</strong>
              <span>{note.type === 'meeting' ? 'Meeting' : 'Note'} · {note.category}</span>
              <span>{note.tags.length ? note.tags.join(', ') : 'No tags'}</span>
            </button>
          ))}
        </div>
        <button className="secondary" onClick={logout}><LogOut size={17} /> Log out</button>
      </aside>

      <section className="editor">
        <header className="toolbar">
          <input className="title-input" disabled={!selected} value={editor.title} onChange={(event) => setEditor({ ...editor, title: event.target.value })} placeholder="Untitled note" />
          <div className="toolbar-actions">
            <button onClick={generateAi} disabled={!selected}><Bot size={17} /> AI</button>
            <button onClick={toggleShare} disabled={!selected}><Share2 size={17} /> Share</button>
            <button onClick={archiveNote} disabled={!selected}><Archive size={17} /> {selected?.archived ? 'Restore' : 'Archive'}</button>
            <button className="danger" onClick={deleteNote} disabled={!selected}><Trash2 size={17} /> Delete</button>
          </div>
        </header>

        <div className="meta-grid">
          <label>Type<select disabled={!selected} value={editor.type} onChange={(event) => setEditor({ ...editor, type: event.target.value })}><option value="note">Note</option><option value="meeting">Meeting</option></select></label>
          <label>Tags<input disabled={!selected} value={editor.tags} onChange={(event) => setEditor({ ...editor, tags: event.target.value })} placeholder="work, meeting" /></label>
          <label>Category<input disabled={!selected} value={editor.category} onChange={(event) => setEditor({ ...editor, category: event.target.value })} /></label>
          {editor.type === 'meeting' && <label>Meeting time<input disabled={!selected} type="datetime-local" value={editor.meeting_at} onChange={(event) => setEditor({ ...editor, meeting_at: event.target.value })} /></label>}
          <p className="status">{selected ? status : 'Create or select an item'}</p>
        </div>

        <textarea disabled={!selected} value={editor.content} onChange={(event) => setEditor({ ...editor, content: event.target.value })} placeholder="Write notes, meeting decisions, and action items..." />

        <div className="panels">
          <article>
            <h2><Sparkles size={18} /> AI output</h2>
            <p>{selected?.ai?.summary || 'Generate AI output to see a summary.'}</p>
            <h3>Action items</h3>
            <ul>{(selected?.ai?.action_items || []).map((item) => <li key={item}>{item}</li>)}</ul>
            {selected?.ai?.suggested_title && <p className="suggested">Suggested title: {selected.ai.suggested_title}</p>}
          </article>
          <article>
            <h2><RefreshCcw size={18} /> Markdown preview</h2>
            <div className="preview">{renderPreview(editor.content)}</div>
          </article>
        </div>
      </section>

      <Insights insights={insights} />
    </main>
  );
}

function Insights({ insights }) {
  if (!insights) return <aside className="dashboard">Loading insights...</aside>;
  return (
    <aside className="dashboard">
      <h2>Insights</h2>
      <div className="metric"><span>Total notes</span><strong>{insights.total_notes}</strong></div>
      <div className="metric"><span>Meetings</span><strong>{insights.total_meetings}</strong></div>
      <div className="metric"><span>AI generations</span><strong>{insights.ai_usage.total_generations}</strong></div>
      <h3>Most-used tags</h3>
      <div className="chips">{insights.most_used_tags.length ? insights.most_used_tags.map((item) => <span key={item.tag}>{item.tag} · {item.count}</span>) : <span>No tags</span>}</div>
      <h3>Recent edits</h3>
      <div className="chips">{insights.recently_edited.length ? insights.recently_edited.map((note) => <span key={note.id}>{note.title}</span>) : <span>No edits</span>}</div>
      <h3>Weekly activity</h3>
      <div className="activity">{insights.weekly_activity.map((day) => <span key={day.date}>{new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}<strong>{day.edits}</strong></span>)}</div>
    </aside>
  );
}

function SharedNote({ shareId }) {
  const [note, setNote] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/shared/${shareId}`).then(({ note }) => setNote(note)).catch((error) => setError(error.message));
  }, [shareId]);

  if (error) return <main className="public-note"><h1>Shared note unavailable</h1><p>{error}</p></main>;
  if (!note) return <main className="public-note"><p>Loading shared note...</p></main>;

  return (
    <main className="public-note">
      <p className="eyebrow">Shared Peblo {note.type}</p>
      <h1>{note.title}</h1>
      <p className="muted">{note.category} · {note.tags.join(', ') || 'No tags'}</p>
      <section className="public-summary"><strong>AI summary</strong><p>{note.ai?.summary || 'No AI summary yet.'}</p></section>
      <article className="preview">{renderPreview(note.content)}</article>
    </main>
  );
}

function noteToEditor(note) {
  return {
    title: note.title || '',
    content: note.content || '',
    tags: (note.tags || []).join(', '),
    category: note.category || 'Personal',
    type: note.type || 'note',
    meeting_at: toDatetimeLocal(note.meeting_at)
  };
}

function editorToPayload(editor) {
  return {
    title: editor.title || 'Untitled note',
    content: editor.content,
    tags: editor.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    category: editor.category || 'Personal',
    type: editor.type,
    meeting_at: editor.type === 'meeting' && editor.meeting_at ? new Date(editor.meeting_at).toISOString() : null
  };
}

function toDatetimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function renderPreview(markdown = '') {
  const lines = markdown.split('\n');
  return lines.map((line, index) => {
    if (line.startsWith('# ')) return <h1 key={index}>{line.slice(2)}</h1>;
    if (line.startsWith('## ')) return <h2 key={index}>{line.slice(3)}</h2>;
    if (line.startsWith('- ')) return <p key={index}>• {line.slice(2)}</p>;
    return <p key={index}>{line || '\u00A0'}</p>;
  });
}

createRoot(document.getElementById('root')).render(<App />);
