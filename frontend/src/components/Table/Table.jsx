import styles from './Table.module.css'

export default function Table({ columns, rows, rowClassName = null }) {
  const safeColumns = Array.isArray(columns) ? columns : []
  const safeRows = Array.isArray(rows) ? rows : []
  const resolveRowClass = typeof rowClassName === 'function' ? rowClassName : null
  const getBaseRowKey = (r, idx) =>
    r?.id ??
    r?.key ??
    r?.ProductID ??
    r?.ReservationID ??
    r?.SaleID ??
    r?.CustomerID ??
    r?.raw?.id ??
    r?.raw?.ProductID ??
    r?.raw?.ReservationID ??
    r?.raw?.SaleID ??
    idx

  const baseRowKeys = safeRows.map(getBaseRowKey)
  const baseKeyCounts = baseRowKeys.reduce((acc, k) => {
    const sk = String(k)
    acc[sk] = (acc[sk] || 0) + 1
    return acc
  }, {})

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {safeColumns.map((c, idx) => (
              <th
                key={c?.key ?? idx}
                style={c?.width ? { width: c.width } : undefined}
              >
                {c?.header ?? ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {safeRows.map((r, idx) => {
            const baseRowKey = baseRowKeys[idx]
            const rowKey =
              baseKeyCounts[String(baseRowKey)] > 1 ? `${baseRowKey}-${idx}` : baseRowKey
            return (
              <tr
                key={rowKey}
                className={resolveRowClass ? resolveRowClass(r, idx) : undefined}
              >
                {safeColumns.map((c, cIdx) => (
                  <td key={c?.key ?? cIdx}>
                    {typeof c?.render === 'function' ? c.render(r) : r?.[c?.key]}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
