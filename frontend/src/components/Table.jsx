export default function Table({ columns, rows }) {
  const mobileTitleKey = columns[0]?.key;
  return (
    <div className="rounded-2xl border border-[#e6deef] bg-white shadow-[0_8px_26px_rgba(118,84,146,0.08)]">
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f8f5fc] text-left">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-[#5a4f6d]">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-[#6b7280]">
                  Sin datos
                </td>
              </tr>
            )}
            {rows.map((row, idx) => (
              <tr key={row.id || idx} className="border-t border-[#efe8f6] transition hover:bg-[#fdfbff]">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3.5 align-top text-[#2b2239]">{col.render ? col.render(row) : row[col.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-[#efe8f6] md:hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[#6b7280]">Sin datos</p>
        ) : (
          rows.map((row, idx) => (
            <article key={row.id || idx} className="space-y-2 px-4 py-3">
              {mobileTitleKey ? (
                <h3 className="text-sm font-semibold text-[#261d35]">
                  {columns[0].render ? columns[0].render(row) : row[mobileTitleKey]}
                </h3>
              ) : null}
              <dl className="space-y-1.5 text-sm">
                {columns.slice(1).map((col) => (
                  <div key={col.key} className="flex items-start justify-between gap-3">
                    <dt className="min-w-[110px] text-xs font-semibold uppercase tracking-[0.08em] text-[#6f6384]">{col.label}</dt>
                    <dd className="text-right text-[#2b2239]">{col.render ? col.render(row) : row[col.key] || '—'}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
