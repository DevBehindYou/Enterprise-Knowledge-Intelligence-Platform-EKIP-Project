/** @param {{columns: {key:string,label:string,render?:Function}[], rows: object[], rowKey?: string}} props */
export default function Table({ columns, rows, rowKey = '_id', emptyLabel = 'Nothing here yet.' }) {
  if (!rows.length) {
    return (
      <div className="border border-dashed border-line rounded-component p-10 text-center text-ink-muted text-sm">
        {emptyLabel}
      </div>
    );
  }
  // Wrap in a horizontally-scrollable region so a wide table scrolls WITHIN its
  // own box on small screens instead of forcing the whole page to scroll
  // sideways. min-w keeps columns from crushing into an unreadable wrap.
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[560px] border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="text-left text-[11.5px] uppercase tracking-wide text-ink-muted font-semibold px-3.5 py-2.5 border-b border-line whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[rowKey]} className="hover:bg-black/[0.015]">
              {columns.map((col) => (
                <td key={col.key} className="px-3.5 py-3.5 border-b border-line text-[13px] align-middle">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
