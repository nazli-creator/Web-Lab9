import { useEffect, useState } from 'react';
import * as api from './api/books.js';
import Filters from './components/Filters.jsx';
import BookList from './components/BookList.jsx';
import BookForm from './components/BookForm.jsx';
import StatsPanel from './components/StatsPanel.jsx';

const INITIAL_FILTERS = { q: '', genre: '', read: '', sort: '', order: 'asc' };

export default function App() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false); // a change request is in progress
  const [formError, setFormError] = useState(null);
  const [actionError, setActionError] = useState(null);
  // Incremented after every successful change: refetches the list AND the statistics.
  const [refreshKey, setRefreshKey] = useState(0);

  // Load the list from the server whenever a control changes. The cleanup aborts
  // the previous request so a slow, stale response can never overwrite a newer one.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api
      .listBooks(filters, controller.signal)
      .then((data) => {
        setBooks(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return; // replaced by a newer request
        setError(err.message);
        setLoading(false);
      });
    return () => controller.abort();
  }, [filters, refreshKey]);

  useEffect(() => {
    const controller = new AbortController();
    setStatsError(null);
    api
      .getStats(controller.signal)
      .then(setStats)
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setStatsError(err.message);
      });
    return () => controller.abort();
  }, [refreshKey]);

  // Runs a change request; the screen is updated only after the server confirmed it.
  // Returns true on success.
  const runChange = async (request, setErrorMessage) => {
    setBusy(true);
    setErrorMessage(null);
    try {
      await request();
      setRefreshKey((key) => key + 1);
      return true;
    } catch (err) {
      setErrorMessage(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (data) => {
    setActionError(null);
    const saved = await runChange(
      () => (editing ? api.replaceBook(editing.id, data) : api.createBook(data)),
      setFormError,
    );
    if (saved && editing) setEditing(null);
    return saved;
  };

  const handleToggleRead = (book) => {
    setFormError(null);
    // Marking a book unread also clears its rating (a rating needs read = true).
    const changes = book.read ? { read: false, rating: null } : { read: true };
    return runChange(() => api.updateBook(book.id, changes), setActionError);
  };

  const handleRate = (book, rating) => {
    setFormError(null);
    return runChange(() => api.updateBook(book.id, { rating }), setActionError);
  };

  const handleDelete = async (book) => {
    if (!window.confirm(`Delete "${book.title}"?`)) return;
    setFormError(null);
    const deleted = await runChange(() => api.deleteBook(book.id), setActionError);
    if (deleted && editing?.id === book.id) setEditing(null);
  };

  const handleEdit = (book) => {
    setActionError(null);
    setFormError(null);
    setEditing(book);
  };

  return (
    <main>
      <h1>Reading List</h1>
      <div className="layout">
        <div className="main-column">
          <Filters filters={filters} onChange={setFilters} />
          {actionError && <p className="error" role="alert">{actionError}</p>}
          <BookList
            books={books}
            loading={loading}
            error={error}
            busy={busy}
            onToggleRead={handleToggleRead}
            onRate={handleRate}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
        <aside className="side-column">
          <BookForm
            key={editing ? `edit-${editing.id}` : 'new'}
            book={editing}
            submitting={busy}
            error={formError}
            onSubmit={handleSubmit}
            onCancel={() => {
              setEditing(null);
              setFormError(null);
            }}
          />
          <StatsPanel stats={stats} error={statsError} />
        </aside>
      </div>
    </main>
  );
}
