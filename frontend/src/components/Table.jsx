export default function Table({ columns, rows }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#e6deef] bg-white shadow-[0_8px_26px_rgba(118,84,146,0.08)]">
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
  );
}
