import axiosClient from "./axiosClient";

const unwrapData = (response) =>
  response?.data?.data ?? response?.data ?? response ?? {};

const toNumber = (val) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

const formatMonthLabel = (key) => {
  const parts = String(key || "").split("-");
  if (parts.length < 2) return String(key || "");
  const year = parts[0];
  const monthIdx = Number(parts[1]) - 1;
  const names = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  if (!Number.isFinite(monthIdx) || monthIdx < 0 || monthIdx > 11) return String(key || "");
  return `${names[monthIdx]} ${year}`;
};

const normalizePerformancePayload = (raw) => {
  if (!raw || typeof raw !== "object") {
    return { overview: [], chart: [], topSelling: [], recentReports: [] };
  }

  // If backend already returns the expected shape, pass through safely.
  if (raw.overview || raw.chart || raw.topSelling || raw.recentReports) {
    return {
      overview: Array.isArray(raw.overview) ? raw.overview : [],
      chart: Array.isArray(raw.chart) ? raw.chart : [],
      topSelling: Array.isArray(raw.topSelling) ? raw.topSelling : [],
      recentReports: Array.isArray(raw.recentReports) ? raw.recentReports : [],
    };
  }

  const sales = raw.sales || {};
  const reservations = raw.reservations || {};
  const keys = Array.from(new Set([
    ...Object.keys(sales || {}),
    ...Object.keys(reservations || {}),
  ]));

  keys.sort((a, b) => {
    const [ay, am] = String(a).split("-").map((v) => Number(v));
    const [by, bm] = String(b).split("-").map((v) => Number(v));
    if (ay !== by) return ay - by;
    return (am || 0) - (bm || 0);
  });

  const chart = keys.map((k) => {
    const revenue = toNumber(sales?.[k]);
    const reserve = toNumber(reservations?.[k]);
    return {
      m: formatMonthLabel(k),
      revenue,
      profit: 0,
      reserve,
    };
  });

  const totalRevenue = chart.reduce((sum, c) => sum + toNumber(c.revenue), 0);
  const totalReserve = chart.reduce((sum, c) => sum + toNumber(c.reserve), 0);
  const avgRevenue = chart.length ? totalRevenue / chart.length : 0;

  const overview = [
    {
      label: "Total Revenue",
      value: `Rs ${Math.round(totalRevenue).toLocaleString()}`,
      meta: "All time",
      green: true,
    },
    {
      label: "Total Reservations",
      value: String(totalReserve),
      meta: "All time",
      green: true,
    },
    {
      label: "Avg Monthly Revenue",
      value: `Rs ${Math.round(avgRevenue).toLocaleString()}`,
      meta: "Based on available data",
    },
    {
      label: "Months Tracked",
      value: String(chart.length),
      meta: "Sales + reservations",
    },
  ];

  return {
    overview,
    chart,
    topSelling: [],
    recentReports: [],
  };
};

export const reportsAPI = {
  getReports: async () => {
    const response = await axiosClient.get("/reports");
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await axiosClient.get("/reports/dashboard");
    return { data: unwrapData(response) };
  },

  getSalesReport: async (params = {}) => {
    const response = await axiosClient.get("/reports/sales", { params });
    return { data: unwrapData(response) };
  },

  getInventoryReport: async (params = {}) => {
    const response = await axiosClient.get("/reports/inventory", { params });
    return { data: unwrapData(response) };
  },

  getPerformanceReport: async (params = {}) => {
    const response = await axiosClient.get("/reports/performance", { params });
    const raw = unwrapData(response);
    return { data: normalizePerformancePayload(raw) };
  },
};
