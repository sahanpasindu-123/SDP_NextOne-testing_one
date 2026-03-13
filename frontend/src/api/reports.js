import axiosClient from "./axiosClient";

const unwrapData = (response) =>
  response?.data?.data ?? response?.data ?? response ?? {};

const isPlainObject = (v) =>
  !!v && typeof v === "object" && !Array.isArray(v);

const shouldFallbackToPost = (err) => {
  const status = err?.status ?? err?.response?.status ?? err?.raw?.response?.status;
  return status === 404 || status === 405;
};

const getWithPostFallback = async (url, params = {}) => {
  try {
    return await axiosClient.get(url, { params });
  } catch (err) {
    if (!shouldFallbackToPost(err)) throw err;
    return await axiosClient.post(url, params);
  }
};

const toNumber = (val) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

const toISODate = (v) => {
  if (!v) return null;
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
};

const toMoneyString = (v) => {
  if (v === null || v === undefined) return "Rs 0";
  if (typeof v === "string" && v.trim()) {
    // Already formatted by backend
    if (/rs/i.test(v) || /lkr/i.test(v)) return v.trim();
    const n = Number(String(v).replace(/,/g, "").replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n)) return `Rs ${Math.round(n).toLocaleString()}`;
    return v.trim();
  }
  const n = toNumber(v);
  return `Rs ${Math.round(n).toLocaleString()}`;
};

const unwrapArray = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (!isPlainObject(raw)) return [];

  const direct = [
    raw.rows,
    raw.items,
    raw.results,
    raw.sales,
    raw.report,
    raw.data,
  ];
  for (const c of direct) {
    if (Array.isArray(c)) return c;
  }

  // common nesting: { data: { rows: [] } }
  if (isPlainObject(raw.data)) {
    const nested = [raw.data.rows, raw.data.items, raw.data.results];
    for (const c of nested) {
      if (Array.isArray(c)) return c;
    }
  }

  return [];
};

const normalizeSalesReportRows = (raw) => {
  const rows = unwrapArray(raw);
  return rows.map((r) => {
    const id =
      r?.id ??
      r?.InvoiceID ??
      r?.invoiceId ??
      r?.invoiceID ??
      r?.SaleID ??
      r?.saleId ??
      r?.saleID ??
      r?.invoice?.InvoiceID ??
      r?.invoice?.id ??
      r?.invoice?.invoiceId ??
      "N/A";

    const customer =
      r?.customer ??
      r?.customerName ??
      r?.CustomerName ??
      r?.customer?.Name ??
      r?.customer?.name ??
      "N/A";

    const dateRaw = r?.date ?? r?.SaleDate ?? r?.saleDate ?? r?.invoice?.Date ?? r?.invoice?.date;
    const date = toISODate(dateRaw) ?? (typeof dateRaw === "string" ? dateRaw.slice(0, 10) : "N/A");

    const amount =
      r?.amount ??
      r?.Amount ??
      r?.total ??
      r?.Total ??
      r?.TotalPrice ??
      r?.totalPrice ??
      r?.invoice?.Amount ??
      r?.invoice?.amount ??
      "Rs 0";

    const status = r?.status ?? r?.Status ?? r?.invoice?.Status ?? r?.invoice?.status ?? "UNKNOWN";

    return {
      id,
      customer,
      date,
      amount: toMoneyString(amount),
      status,
    };
  });
};

const normalizeInventoryPayload = (raw) => {
  if (Array.isArray(raw)) {
    const products = raw;
    const totalItems = products.length;

    const lowStock = products.filter((p) => {
      const stock = toNumber(p?.Stock ?? p?.stock ?? p?.stockQuantity ?? 0);
      const limitRaw =
        p?.StockLimit ?? p?.stockLimit ?? p?.minStock ?? p?.minimumStock ?? null;
      const limit = limitRaw === null || limitRaw === undefined ? 5 : toNumber(limitRaw);
      return stock < limit;
    }).length;

    const inventoryValue = products.reduce((sum, p) => {
      const stock = toNumber(p?.Stock ?? p?.stock ?? p?.stockQuantity ?? 0);
      const price = toNumber(p?.Price ?? p?.price ?? p?.unitPrice ?? 0);
      return sum + price * stock;
    }, 0);

    const categoryMap = {};
    for (const p of products) {
      const cat =
        p?.CategoryName ??
        p?.categoryName ??
        p?.CategoryCode ??
        p?.categoryCode ??
        p?.category?.Name ??
        p?.category?.name ??
        "Others";
      const stock = toNumber(p?.Stock ?? p?.stock ?? p?.stockQuantity ?? 0);
      categoryMap[String(cat)] = (categoryMap[String(cat)] || 0) + stock;
    }

    const pieData = Object.entries(categoryMap).map(([key, value]) => ({
      key,
      name: key,
      value: toNumber(value),
    }));

    return {
      stats: { totalItems, lowStock, inventoryValue },
      pieData,
      movements: [],
    };
  }

  const obj = isPlainObject(raw) ? raw : {};

  const statsRaw = isPlainObject(obj.stats)
    ? obj.stats
    : isPlainObject(obj.summary)
      ? obj.summary
      : isPlainObject(obj.overview)
        ? obj.overview
        : {};

  const totalItems = toNumber(
    statsRaw.totalItems ??
      statsRaw.total ??
      statsRaw.items ??
      obj.totalItems ??
      obj.total ??
      0
  );
  const lowStock = toNumber(
    statsRaw.lowStock ??
      statsRaw.low ??
      statsRaw.lowStockItems ??
      obj.lowStock ??
      0
  );
  const inventoryValue = toNumber(
    statsRaw.inventoryValue ?? statsRaw.value ?? obj.inventoryValue ?? 0
  );

  let pieRaw =
    obj.pieData ??
    obj.categories ??
    obj.categoryBreakdown ??
    obj.pie ??
    [];

  if (isPlainObject(pieRaw)) {
    pieRaw = Object.entries(pieRaw).map(([key, value]) => ({
      key,
      name: String(key),
      value: toNumber(value),
    }));
  }

  const pieData = Array.isArray(pieRaw)
    ? pieRaw
        .map((p) => {
          const name = p?.name ?? p?.key ?? p?.category ?? p?.CategoryName ?? p?.CategoryCode;
          const value = p?.value ?? p?.count ?? p?.qty ?? p?.quantity ?? 0;
          if (!name) return null;
          return {
            key: String(p?.key ?? name),
            name: String(name),
            value: toNumber(value),
          };
        })
        .filter(Boolean)
    : [];

  const movements = Array.isArray(obj.movements) ? obj.movements : [];

  return {
    stats: { totalItems, lowStock, inventoryValue },
    pieData,
    movements,
  };
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
    const chart = Array.isArray(raw.chart) ? raw.chart : [];
    return {
      overview: Array.isArray(raw.overview) ? raw.overview : [],
      chart: chart
        .map((c) => {
          const m =
            c?.m ??
            c?.month ??
            c?.label ??
            (c?.date ? formatMonthLabel(String(c.date).slice(0, 7)) : null);
          if (!m) return null;
          return {
            m: String(m),
            revenue: toNumber(c?.revenue ?? c?.Revenue ?? c?.sales ?? 0),
            profit: toNumber(c?.profit ?? c?.Profit ?? 0),
            reserve: toNumber(c?.reserve ?? c?.reservations ?? c?.reservationCount ?? 0),
          };
        })
        .filter(Boolean),
      topSelling: Array.isArray(raw.topSelling) ? raw.topSelling : [],
      recentReports: Array.isArray(raw.recentReports) ? raw.recentReports : [],
    };
  }

  const sales = raw.sales || {};
  const reservations = raw.reservations || {};
  // Some backends return monthly data under `chart` as an object map.
  const chartMap =
    (isPlainObject(raw.chart) && raw.chart) ||
    (isPlainObject(raw.monthly) && raw.monthly) ||
    null;

  if (chartMap) {
    const keys = Object.keys(chartMap);
    keys.sort();
    const chart = keys.map((k) => {
      const row = chartMap[k] || {};
      return {
        m: formatMonthLabel(k),
        revenue: toNumber(row?.revenue ?? row?.sales ?? row?.Revenue ?? row ?? 0),
        profit: toNumber(row?.profit ?? row?.Profit ?? 0),
        reserve: toNumber(row?.reserve ?? row?.reservations ?? row?.reservationCount ?? 0),
      };
    });
    return {
      overview: [],
      chart,
      topSelling: [],
      recentReports: [],
    };
  }

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
    return { data: unwrapData(response) };
  },

  getDashboardStats: async () => {
    const response = await axiosClient.get("/reports/dashboard");
    return { data: unwrapData(response) };
  },

  getSalesReport: async (params = {}) => {
    const response = await getWithPostFallback("/reports/sales", params);
    const raw = unwrapData(response);
    return { data: normalizeSalesReportRows(raw) };
  },

  getInventoryReport: async (params = {}) => {
    const response = await getWithPostFallback("/reports/inventory", params);
    const raw = unwrapData(response);
    return { data: normalizeInventoryPayload(raw) };
  },

  getPerformanceReport: async (params = {}) => {
    const response = await getWithPostFallback("/reports/performance", params);
    const raw = unwrapData(response);
    return { data: normalizePerformancePayload(raw) };
  },
};
