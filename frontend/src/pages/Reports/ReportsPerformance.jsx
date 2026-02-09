import { useMemo, useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import {
  FiBarChart2,
  FiPieChart,
  FiTrendingUp,
  FiFilter,
  FiDownload,
  FiCalendar,
  FiFileText,
} from "react-icons/fi";
import { reportsAPI } from "../../api/reports";
import styles from "./ReportsPerformance.module.css";

const chips = ["Today", "This Week", "This Month", "Last 3 Months", "Custom"];
const segments = ["Monthly", "Quarterly", "Yearly"];

export default function ReportsPerformance() {
  const location = useLocation();
  const base = location.pathname.startsWith("/admin") ? "/admin" : "/employee";

  const [range, setRange] = useState("This Month");
  const [seg, setSeg] = useState("Monthly");

  const [overview, setOverview] = useState([]);
  const [chart, setChart] = useState([]);
  const [topSelling, setTopSelling] = useState([]);
  const [recentReports, setRecentReports] = useState([]);

  // ---------------- Fetch performance data ----------------
  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    try {
const res = await reportsAPI.getPerformanceReport();
setData(res.data);

      /*
        Expected backend response shape:
        {
          overview: [],
          chart: [],
          topSelling: [],
          recentReports: []
        }
      */

      setOverview(res.data.overview || []);
      setChart(res.data.chart || []);
      setTopSelling(res.data.topSelling || []);
      setRecentReports(res.data.recentReports || []);
    } catch (err) {
      console.error("Performance report fetch failed", err);
    }
  };

  // ---------------- Actions ----------------
  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFilterClick = () => {
    console.log("ReportsPerformance: Filter clicked", { range, seg });
    alert("Filter clicked (filter panel not built yet).");
  };

  const handleExportReport = () => {
    if (!chart.length) return;

    const header = "Month,Revenue,Profit,Reserve";
    const rows = chart
      .map((r) => `${r.m},${r.revenue},${r.profit},${r.reserve}`)
      .join("\n");

    downloadFile(
      `${header}\n${rows}`,
      "performance-report.csv",
      "text/csv"
    );
    alert("Exported: performance-report.csv");
  };

  const handleViewReport = (report) => {
    console.log("View report:", report);
    alert(`Viewing report: ${report.title}`);
  };

  // ---------------- Memo (safe, no static data) ----------------
  const memoOverview = useMemo(() => overview, [overview]);
  const memoChart = useMemo(() => chart, [chart]);
  const memoTopSelling = useMemo(() => topSelling, [topSelling]);
  const memoRecentReports = useMemo(() => recentReports, [recentReports]);

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <div className={styles.h1}>Reports</div>
          <div className={styles.sub}>
            View and generate reports for your inventory and sales data.
          </div>
        </div>
      </div>

      <div className={styles.topCard}>
        <div className={styles.tabs}>
          <NavLink
            to={`${base}/reports/sales`}
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.active : ""}`
            }
          >
            <FiBarChart2 /> Sales Report
          </NavLink>

          <NavLink
            to={`${base}/reports/inventory`}
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.activeYellow : ""}`
            }
          >
            <FiPieChart /> Inventory Report
          </NavLink>

          <NavLink
            to={`${base}/reports/performance`}
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.activeYellow : ""}`
            }
          >
            <FiTrendingUp /> Performance
          </NavLink>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.outlineBtn}
            type="button"
            onClick={handleFilterClick}
          >
            <FiFilter /> Filter
          </button>

          <button
            className={styles.yellowBtn}
            type="button"
            onClick={handleExportReport}
          >
            <FiDownload /> Export Report
          </button>
        </div>
      </div>

      <div className={styles.rangeRow}>
        <div className={styles.rangeLeft}>
          <FiCalendar />
          <span className={styles.rangeLabel}>Date Range:</span>
        </div>

        <div className={styles.chips}>
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setRange(c)}
              className={`${styles.chip} ${
                range === c ? styles.chipActive : ""
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.bigCard}>
        <div className={styles.bigTop}>
          <div className={styles.bigTitle}>Performance Overview</div>

          <div className={styles.segment}>
            {segments.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeg(s)}
                className={`${styles.segBtn} ${
                  seg === s ? styles.segActive : ""
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.overviewGrid}>
          {memoOverview.map((o) => (
            <div key={o.label} className={styles.mini}>
              <div className={styles.miniLabel}>{o.label}</div>
              <div className={styles.miniValue}>{o.value}</div>
              <div
                className={`${styles.miniMeta} ${
                  o.green ? styles.green : ""
                }`}
              >
                {o.meta}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={memoChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="m" />
              <YAxis />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#E0AB00"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="#4CE7FF"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="reserve"
                stroke="#FF6B6B"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>

          <div className={styles.chartLegend}>
            <span>
              <i className={styles.dotY} /> Revenue
            </span>
            <span>
              <i className={styles.dotB} /> Profit
            </span>
            <span>
              <i className={styles.dotR} /> Reserve
            </span>
          </div>
        </div>
      </div>

      <div className={styles.bottomGrid}>
        <div className={styles.box}>
          <div className={styles.boxTitle}>Top Selling Products</div>

          <div className={styles.table}>
            <div className={styles.tHead}>
              <div>Product</div>
              <div>Units Sold</div>
              <div>Revenue</div>
              <div>Profit</div>
            </div>

            {memoTopSelling.map((r, i) => (
              <div key={i} className={styles.tRow}>
                <div className={styles.tStrong}>{r.product}</div>
                <div className={styles.tMuted}>{r.units}</div>
                <div className={styles.tMuted}>{r.revenue}</div>
                <div className={styles.tMuted}>{r.profit}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.box}>
          <div className={styles.boxTitle}>Recent Reports</div>

          <div className={styles.list}>
            {memoRecentReports.map((r, i) => (
              <div key={i} className={styles.item}>
                <div className={styles.icon}>
                  <FiFileText />
                </div>
                <div className={styles.itemBody}>
                  <div className={styles.itemTitle}>{r.title}</div>
                  <div className={styles.itemSub}>{r.date}</div>
                </div>
                <button
                  className={styles.view}
                  type="button"
                  onClick={() => handleViewReport(r)}
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
