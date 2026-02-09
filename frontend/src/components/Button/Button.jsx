import styles from './Button.module.css'

export default function Button({ variant='primary', leftIcon=null, children, ...props }) {
  const cls = [styles.btn, styles[variant]].join(' ')
  return (
    <button className={cls} {...props}>
      {leftIcon ? <span className={styles.left}>{leftIcon}</span> : null}
      {children}
    </button>
  )
}
