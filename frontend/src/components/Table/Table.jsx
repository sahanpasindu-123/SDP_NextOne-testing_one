import styles from './Table.module.css'

export default function Table({ columns, rows, rowClassName=null }) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={c.width ? { width: c.width } : undefined}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className={rowClassName ? rowClassName(r, idx) : undefined}>
              {columns.map((c) => (
                <td key={c.key}>
                  {typeof c.render === 'function' ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
