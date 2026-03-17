import { useEffect, useMemo, useRef, useState } from 'react'
import { FiSearch, FiBell, FiUser } from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'
import { alertsAPI } from '../../api/alerts'
import styles from './Topbar.module.css'

export default function Topbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const dropdownRef = useRef(null)

  const path = location?.pathname || ''
  const notificationsPath = path.startsWith('/admin')
    ? '/admin/low-stock'
    : '/employee/alerts'

  const [alerts, setAlerts] = useState([])
  const [openNotifications, setOpenNotifications] = useState(false)
  const [loadingAlerts, setLoadingAlerts] = useState(false)

  const normalizeAlerts = (raw) => {
    if (!Array.isArray(raw)) return []

    return raw
      .filter(Boolean)
      .sort((a, b) => {
        const aTime = a?.CreatedAt ? new Date(a.CreatedAt).getTime() : 0
        const bTime = b?.CreatedAt ? new Date(b.CreatedAt).getTime() : 0
        return bTime - aTime
      })
  }

  const loadAlerts = async () => {
    try {
      setLoadingAlerts(true)
      const res = await alertsAPI.list()
      const raw = Array.isArray(res?.data) ? res.data : []
      setAlerts(normalizeAlerts(raw))
    } catch (error) {
      console.error('Failed to load alerts:', error)
      setAlerts([])
    } finally {
      setLoadingAlerts(false)
    }
  }

  useEffect(() => {
    loadAlerts()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const unreadCount = useMemo(() => {
    return alerts.filter((item) => String(item?.Status || '').toLowerCase() !== 'read').length
  }, [alerts])

  const recentAlerts = useMemo(() => alerts.slice(0, 5), [alerts])

  const formatTypeLabel = (value) => {
    const raw = String(value || '').trim()
    if (!raw) return 'Notification'

    return raw
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const getAlertTitle = (item) => {
    if (item?.Title) return item.Title
    if (item?.Subject) return item.Subject
    if (item?.Type) return formatTypeLabel(item.Type)
    return 'Notification'
  }

  const getAlertTime = (item) => {
    if (!item?.CreatedAt) return ''
    try {
      return new Date(item.CreatedAt).toLocaleString('en-LK')
    } catch {
      return ''
    }
  }

  const handleBellClick = async () => {
    if (!openNotifications) {
      await loadAlerts()
    }
    setOpenNotifications((prev) => !prev)
  }

  const handleMarkAllRead = async () => {
    try {
      await alertsAPI.markAllRead()
      await loadAlerts()
    } catch (error) {
      console.error('Failed to mark all alerts as read:', error)
    }
  }

  const handleNotificationClick = async (item) => {
    try {
      const isUnread = String(item?.Status || '').toLowerCase() !== 'read'

      if (isUnread && item?.AlertID) {
        await alertsAPI.markRead(item.AlertID)
      }

      await loadAlerts()
    } catch (error) {
      console.error('Failed to mark alert as read:', error)
    } finally {
      setOpenNotifications(false)
      navigate(notificationsPath)
    }
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.right}>
        <div className={styles.search}>
          <FiSearch className={styles.searchIcon} />
          <input placeholder="Search..." />
        </div>

        <div className={styles.notificationWrap} ref={dropdownRef}>
          <button
            className={styles.iconBtn}
            aria-label="Notifications"
            type="button"
            onClick={handleBellClick}
          >
            <FiBell />
            {unreadCount > 0 && (
              <span className={styles.dot}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {openNotifications && (
            <div className={styles.notificationDropdown}>
              <div className={styles.notificationHeader}>
                <span className={styles.notificationHeading}>Notifications</span>
                {alerts.length > 0 && (
                  <button
                    type="button"
                    className={styles.notificationAction}
                    onClick={handleMarkAllRead}
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className={styles.notificationList}>
                {loadingAlerts ? (
                  <div className={styles.notificationEmpty}>Loading...</div>
                ) : recentAlerts.length === 0 ? (
                  <div className={styles.notificationEmpty}>No notifications</div>
                ) : (
                  recentAlerts.map((item, index) => {
                    const isUnread = String(item?.Status || '').toLowerCase() !== 'read'
                    const itemKey = item?.AlertID || `${item?.CreatedAt || 'alert'}-${index}`

                    return (
                      <button
                        key={itemKey}
                        type="button"
                        className={`${styles.notificationItem} ${
                          isUnread ? styles.notificationUnread : ''
                        }`}
                        onClick={() => handleNotificationClick(item)}
                      >
                        <div className={styles.notificationItemTop}>
                          <span className={styles.notificationTitle}>
                            {getAlertTitle(item)}
                          </span>
                          {isUnread && <span className={styles.notificationPill}>New</span>}
                        </div>

                        <div className={styles.notificationMessage}>
                          {item?.Message || 'No message'}
                        </div>

                        <div className={styles.notificationTime}>
                          {getAlertTime(item)}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>

              <button
                type="button"
                className={styles.viewAllBtn}
                onClick={() => {
                  setOpenNotifications(false)
                  navigate(notificationsPath)
                }}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>

        <div className={styles.user}>
          <div className={styles.userBadge}>
            <FiUser />
          </div>
          <div className={styles.userName}>User</div>
        </div>
      </div>
    </header>
  )
}