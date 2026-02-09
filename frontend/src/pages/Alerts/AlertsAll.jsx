import { useEffect, useMemo, useState } from "react";
import { FiCheck, FiFilter, FiBell, FiAlertTriangle, FiAlertCircle } from "react-icons/fi";
import { alertsAPI } from "../../api/alerts";
import StatCard from "../../components/StatCard/StatCard.jsx";
import Tabs from "../../components/Tabs/Tabs.jsx";
import Badge from "../../components/Badge/Badge.jsx";
import Table from "../../components/Table/Table.jsx";
import Button from "../../components/Button/Button.jsx";
import styles from "./AlertsAll.module.css";

const tabs = [
  { label: "All", value: "all" },
  { label: "Low Stock", value: "low" },
  { label: "System", value: "system" },
  { label: "Price Change", value: "price" },
  { label: "Reservation", value: "reservation" },
];

export default function AlertsAll() {
  const [tab, setTab] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [q, setQ] = useState("");

  const [priorityFilter, setPriorityFilter] = useState("all"); // all|high|medium
  const [dateRange, setDateRange] = useState("all"); // all|today|7d|30d

  const mapTabToType = (t) => {
    const m = {
      // Backend stores enum-like values (e.g. LOW_STOCK)
      low: "LOW_STOCK",
      system: "SYSTEM",
      price: "PRICE_CHANGE",
      reservation: "RESERVATION",
    };
    return t === "all" ? "all" : m[t];
  };

  const derivePriority = (type) => {
    // DB model has no priority column, so we derive it
    return String(type).toUpperCase() === "LOW_STOCK" ? "High" : "Medium";
  };

  const prettyType = (type) => {
    const t = String(type || "");
    const u = t.toUpperCase();
    if (u === "LOW_STOCK") return "Low Stock";
    if (u === "SYSTEM") return "System";
    if (u === "PRICE_CHANGE") return "Price Change";
    if (u === "RESERVATION") return "Reservation";
    return t;
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = {
        type: mapTabToType(tab),
        q: q.trim() ? q.trim() : undefined,
        range: dateRange,
      };

      const res = await alertsAPI.list(params);

      const list = (res?.data || []).map((a) => ({
        id: a.AlertID,
        alert: a.Message,
        detail: a.Message,
        type: prettyType(a.Type),
        priority: derivePriority(a.Type),
        time: new Date(a.CreatedAt).toLocaleString("en-LK"),
        status: (a.Status || "Unread") === "Read" ? "Read" : "Unread",
      }));

      setRows(list);
    } catch (e) {
      console.error("alerts load failed:", e);
      alert("Failed to load alerts");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, dateRange]);

  const columns = [
    {
      key: "alert",
      header: "Alert",
      render: (r) => (
        <div>
          <div className={styles.aTitle}>{r.alert}</div>
          <div className={styles.aSub}>{r.detail}</div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      width: 170,
      render: (r) => (
        <div className={styles.typeCell}>
          <span className={styles.typeIcon}>{r.type === "System" ? "i" : "⬣"}</span>
          <span>{r.type}</span>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      width: 140,
      render: (r) =>
        r.priority === "High" ? (
          <Badge tone="danger">High</Badge>
        ) : (
          <Badge tone="warn">Medium</Badge>
        ),
    },
    { key: "time", header: "Date & Time", width: 190 },
    {
      key: "status",
      header: "Status",
      width: 120,
      render: (r) =>
        r.status === "Unread" ? (
          <Badge tone="unread">Unread</Badge>
        ) : (
          <Badge tone="read">Read</Badge>
        ),
    },
  ];

  const filtered = useMemo(() => {
    const base = rows;

    const afterPriority =
      priorityFilter === "all"
        ? base
        : base.filter((r) =>
            priorityFilter === "high" ? r.priority === "High" : r.priority === "Medium"
          );

    return afterPriority;
  }, [rows, priorityFilter]);

  return (
    <div className={styles.page}>
      <div className="pageTitle">Alerts & Notifications</div>

      <div className={styles.blockTitle}>
        <div className={styles.h1}>Alerts & Notifications</div>
        <div className={styles.sub}>Manage system alerts and notifications for your inventory.</div>
      </div>

      <div className={`card ${styles.toolbar}`}>
        <div className={styles.leftBtns}>
          <Button
            leftIcon={<FiCheck />}
            onClick={async () => {
              await alertsAPI.markAllRead();
              await load();
            }}
          >
            Mark All as Read
          </Button>

          <Button
            variant="secondary"
            leftIcon={<FiFilter />}
            onClick={() => setShowFilters((v) => !v)}
          >
            Filter
          </Button>
        </div>

        <div className={styles.rightBtns}>
          <button
            className={styles.dd}
            onClick={() => {
              const order = ["all", "high", "medium"];
              const i = order.indexOf(priorityFilter);
              setPriorityFilter(order[(i + 1) % order.length]);
            }}
            type="button"
          >
            {priorityFilter === "all" ? "All Priorities" : priorityFilter.toUpperCase()} ˅
          </button>

          <button
            className={styles.dd}
            onClick={() => {
              const order = ["all", "today", "7d", "30d"];
              const i = order.indexOf(dateRange);
              setDateRange(order[(i + 1) % order.length]);
            }}
            type="button"
          >
            {dateRange === "all" ? "All Dates" : dateRange.toUpperCase()} ˅
          </button>
        </div>
      </div>

      {/* ✅ Filters panel is now INSIDE the returned JSX */}
      {showFilters && (
        <div className={`card ${styles.filterCard}`}>
          <div className={styles.filterRow}>
            <input
              className={styles.filterInput}
              placeholder="Search alerts..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Button
              onClick={async () => {
                await load();
              }}
              disabled={loading}
            >
              Apply
            </Button>
          </div>
        </div>
      )}

      <div className={styles.stats}>
        <StatCard
          label="Unread Alerts"
          value={String(rows.filter((r) => r.status === "Unread").length)}
          icon={<FiBell />}
          iconTone="blue"
        />

        <StatCard
          label="High Priority"
          value={String(rows.filter((r) => r.priority === "High").length)}
          icon={<FiAlertTriangle />}
          iconTone="red"
        />

        <StatCard
          label="Low Stock Alerts"
          value={String(rows.filter((r) => r.type === "Low Stock").length)}
          icon={<FiAlertCircle />}
          iconTone="accent"
        />
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableHead}>All Alerts</div>
        <Table
          columns={columns}
          rows={filtered}
          rowClassName={(r) => (r.status === "Unread" ? styles.unreadRow : "")}
          loading={loading} // only if your Table supports it; otherwise remove this line
        />
      </div>
    </div>
  );
}
