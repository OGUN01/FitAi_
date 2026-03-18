interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  emptyMessage?: string;
}

export default function DataTable<T>({ columns, data, keyField, emptyMessage = 'No data' }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-900/50">
            {columns.map(col => (
              <th key={String(col.key)} className="text-left px-4 py-3 text-gray-400 font-medium">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr key={String(row[keyField])} className="border-b border-gray-800/50 hover:bg-gray-900/30">
                {columns.map(col => (
                  <td key={String(col.key)} className="px-4 py-3 text-gray-300">
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key as string] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
