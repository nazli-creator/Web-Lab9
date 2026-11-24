import { GENRES, SORT_FIELDS } from '../constants.js';

export default function Filters({ filters, onChange }) {
  // Always build a NEW filters object; never mutate the old one.
  const update = (name) => (event) => onChange({ ...filters, [name]: event.target.value });

  return (
    <section className="panel filters" aria-label="Search and filters">
      <label>
        Search
        <input type="search" placeholder="Title or author" value={filters.q} onChange={update('q')} />
      </label>
      <label>
        Genre
        <select value={filters.genre} onChange={update('genre')}>
          <option value="">All genres</option>
          {GENRES.map((genre) => (
            <option key={genre} value={genre}>{genre}</option>
          ))}
        </select>
      </label>
      <label>
        Read
        <select value={filters.read} onChange={update('read')}>
          <option value="">All</option>
          <option value="true">Read</option>
          <option value="false">Unread</option>
        </select>
      </label>
      <label>
        Sort by
        <select value={filters.sort} onChange={update('sort')}>
          {SORT_FIELDS.map((field) => (
            <option key={field.value} value={field.value}>{field.label}</option>
          ))}
        </select>
      </label>
      <label>
        Direction
        <select value={filters.order} onChange={update('order')}>
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </label>
    </section>
  );
}
