export default function Pagination({ page, perPage, total, onPageChange }) {
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  if (total <= perPage) return null;

  return (
    <nav className="admin-pagination" aria-label="Страницы списка">
      <div>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Назад
        </button>
        <label className="admin-pagination-picker">
          <span className="sr-only">Номер страницы</span>
          <select
            aria-label="Номер страницы"
            value={page}
            onChange={(event) => onPageChange(Number(event.target.value))}
          >
            {Array.from({ length: pageCount }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1}
              </option>
            ))}
          </select>
          <span>из {pageCount}</span>
        </label>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Вперёд
        </button>
      </div>
    </nav>
  );
}
