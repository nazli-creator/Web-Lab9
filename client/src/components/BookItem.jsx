export default function BookItem({ book, busy, onToggleRead, onRate, onEdit, onDelete }) {
  return (
    <li className={`book ${book.read ? 'is-read' : ''}`}>
      <div className="book-info">
        <strong>{book.title}</strong> <span>by {book.author}</span>
        <div className="meta">
          {book.year} · {book.genre} · {book.read ? 'read' : 'unread'} ·{' '}
          {book.rating === null ? 'not rated' : `rating ${book.rating}/5`}
        </div>
      </div>
      <div className="book-actions">
        <button type="button" disabled={busy} onClick={() => onToggleRead(book)}>
          {book.read ? 'Mark unread' : 'Mark read'}
        </button>
        {book.read && (
          <label>
            Rating
            <select
              disabled={busy}
              value={book.rating === null ? '' : String(book.rating)}
              onChange={(event) => onRate(book, event.target.value === '' ? null : Number(event.target.value))}
            >
              <option value="">none</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        )}
        <button type="button" disabled={busy} onClick={() => onEdit(book)}>Edit</button>
        <button type="button" className="danger" disabled={busy} onClick={() => onDelete(book)}>Delete</button>
      </div>
    </li>
  );
}
