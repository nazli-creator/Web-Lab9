export default function StatsPanel({ stats, error }) {
  return (
    <section className="panel" aria-label="Statistics">
      <h2>Statistics</h2>
      {error && <p className="error" role="alert">{error}</p>}
      {!stats && !error && <p>Loading statistics…</p>}
      {stats && (
        <>
          <ul className="stats">
            <li>Total: <strong>{stats.total}</strong></li>
            <li>Read: <strong>{stats.read}</strong></li>
            <li>Unread: <strong>{stats.unread}</strong></li>
            <li>
              Average rating:{' '}
              <strong>{stats.averageRating === null ? 'no ratings yet' : stats.averageRating}</strong>
            </li>
          </ul>
          <h3>By genre</h3>
          <ul className="stats">
            {Object.entries(stats.byGenre).map(([genre, count]) => (
              <li key={genre}>{genre}: <strong>{count}</strong></li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
