import { useMemo, useState, useEffect, useRef } from "react";
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
import { salesAPI } from "../../api/sales";
import styles from "./ReportsPerformance.module.css";
import toast from "react-hot-toast";

const chips = ["Today", "This Week", "This Month", "Last 3 Months", "Custom"];
const segments = ["Monthly", "Quarterly", "Yearly"];

const escapeCsvCell = (v) => {
  const s = String(v ?? "");
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export default function ReportsPerformance() {
  const location = useLocation();
  const base = location.pathname.startsWith("/admin") ? "/admin" : "/employee";
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const [range, setRange] = useState("This Month");
  const [seg, setSeg] = useState("Monthly");

  const [overview, setOverview] = useState([]);
  const [chart, setChart] = useState([]);
  const [topSelling, setTopSelling] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---------------- Fetch performance data ----------------
  useEffect(() => {
    isMountedRef.current = true;
    fetchPerformance();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isMountedRef.current) return;
    fetchPerformance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, seg]);

  const fetchPerformance = async () => {
    const requestId = (requestIdRef.current += 1);
    try {
      setLoading(true);

      let payload = {};
      try {
        const perfRes = await reportsAPI.getPerformanceReport({ range, seg });
        payload = perfRes?.data || {};
      } catch (err) {
        console.error("Performance report fetch failed", err);
        toast.error("Failed to load performance report");
        payload = {};
      }

      /*
        Expected backend response shape:
        {
          overview: [],
          chart: [],
          topSelling: [],
          recentReports: []
        }
      */

      if (!isMountedRef.current || requestId !== requestIdRef.current) return;
      setOverview(Array.isArray(payload?.overview) ? payload.overview : []);
      setChart(Array.isArray(payload?.chart) ? payload.chart : []);
      setTopSelling(Array.isArray(payload?.topSelling) ? payload.topSelling : []);
      setRecentReports(Array.isArray(payload?.recentReports) ? payload.recentReports : []);

      try {
        const salesRes = await salesAPI.getSales({ limit: 500 });
        const salesList = Array.isArray(salesRes?.data)
          ? salesRes.data
          : Array.isArray(salesRes?.data?.data)
            ? salesRes.data.data
            : [];

        const byProduct = new Map();
        for (const s of salesList) {
          const productId = s?.product?.ProductID ?? s?.ProductID ?? s?.productId ?? null;
          const productName = s?.product?.Name ?? s?.ProductName ?? s?.productName ?? "N/A";
          if (!productId) continue;

          const units = Number(s?.Quantity ?? s?.quantity ?? 0) || 0;
          const revenue = Number(s?.TotalPrice ?? s?.totalPrice ?? s?.invoice?.Amount ?? 0) || 0;

          const curr = byProduct.get(productId) || {
            productId,
            productName,
            units: 0,
            revenue: 0,
          };
          curr.units += units;
          curr.revenue += revenue;
          byProduct.set(productId, curr);
        }

        const top = Array.from(byProduct.values())
          .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
          .slice(0, 8)
          .map((r) => ({
            productId: r.productId,
            product: r.productName,
            units: String(r.units),
            revenue: `Rs ${Math.round(r.revenue).toLocaleString()}`,
            profit: "—",
          }));

        if (!isMountedRef.current || requestId !== requestIdRef.current) return;
        setTopSelling(top);
      } catch (err) {
        console.error("Top selling fetch failed", err);
        if (isMountedRef.current && requestId === requestIdRef.current) {
          setTopSelling(Array.isArray(payload?.topSelling) ? payload.topSelling : []);
        }
      }

    } catch (err) {
      console.error("Performance report fetch failed", err);
      toast.error("Failed to load performance report");
      if (isMountedRef.current && requestId === requestIdRef.current) {
        setOverview([]);
        setChart([]);
        setTopSelling([]);
        setRecentReports([]);
      }
    } finally {
      if (isMountedRef.current && requestId === requestIdRef.current) setLoading(false);
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
    fetchPerformance();
  };

  const handleExportReport = () => {
    if (!chart.length) {
      toast("No data available to export");
      return;
    }

    const header = "Month,Revenue,Profit,Reserve";
    const rows = chart
      .map((r) =>
        [r?.m, r?.revenue, r?.profit, r?.reserve].map(escapeCsvCell).join(",")
      )
      .join("\n");

    downloadFile(
      `${header}\n${rows}`,
      "performance-report.csv",
      "text/csv"
    );
    toast.success("Exported: performance-report.csv");
  };

  const handleViewReport = (report) => {
    console.log("View report:", report);
    toast(`Viewing report: ${report?.title ?? "Report"}`);
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
              `${styles.tab} ${isActive ? styles.activeYellow : ""}`
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
            disabled={loading}
          >
            <FiFilter /> Filter
          </button>

          <button
            className={styles.yellowBtn}
            type="button"
            onClick={handleExportReport}
            disabled={loading}
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
          {loading && !memoOverview.length ? (
            <div style={{ padding: 12, color: "#6b7280", fontWeight: 800 }}>
              Loading overview...
            </div>
          ) : !loading && !memoOverview.length ? (
            <div style={{ padding: 12, color: "#6b7280", fontWeight: 800 }}>
              No data available
            </div>
          ) : null}

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
          {loading && !memoChart.length ? (
            <div style={{ padding: 12, color: "#6b7280", fontWeight: 800 }}>
              Loading chart...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={memoChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="m" />
                <YAxis />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="var(--accent-2)"
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
          )}

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

            {loading && !memoTopSelling.length ? (
              <div className={styles.tRow}>
                <div style={{ gridColumn: "1 / -1", color: "#6b7280", fontWeight: 800 }}>
                  Loading top selling...
                </div>
              </div>
            ) : !loading && !memoTopSelling.length ? (
              <div className={styles.tRow}>
                <div style={{ gridColumn: "1 / -1", color: "#6b7280", fontWeight: 800 }}>
                  No data available
                </div>
              </div>
            ) : null}

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
            {loading && !memoRecentReports.length ? (
              <div style={{ padding: 12, color: "#6b7280", fontWeight: 800 }}>
                Loading recent reports...
              </div>
            ) : !loading && !memoRecentReports.length ? (
              <div style={{ padding: 12, color: "#6b7280", fontWeight: 800 }}>
                No data available
              </div>
            ) : null}
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
