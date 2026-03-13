import { useMemo, useState, useEffect, useRef } from "react";
import {
  FiSearch,
  FiPlus,
  FiTrash2,
  FiDollarSign,
  FiCheckCircle,
  FiClock,
  FiUser,
} from "react-icons/fi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useNavigate } from "react-router-dom";
import { salesAPI } from "../../api/sales";
import { productsAPI } from "../../api/products";

import StatCard from "../../components/StatCard/StatCard.jsx";
import Badge from "../../components/Badge/Badge.jsx";
import Table from "../../components/Table/Table.jsx";
import Button from "../../components/Button/Button.jsx";
import styles from "./SalesBilling.module.css";
import toast from "react-hot-toast";
import Modal from "../../components/Modal/Modal.jsx";

const barData = [
  { name: "Jan", sales: 4200, target: 4600 },
  { name: "Feb", sales: 3000, target: 3800 },
  { name: "Mar", sales: 5200, target: 5000 },
  { name: "Apr", sales: 2800, target: 3200 },
  { name: "May", sales: 6000, target: 5200 },
  { name: "Jun", sales: 3400, target: 3900 },
];

export default function SalesBilling() {
  const navigate = useNavigate();
  const isMountedRef = useRef(true);
  // keep if other UI parts depend on it later
  const [cartQty, setCartQty] = useState(1);
  const [invoicePreview, setInvoicePreview] = useState(null);

  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH"); // CASH | CARD

  const [cartItems, setCartItems] = useState([]);
  // each: { ProductID, Name, Price, qty, Stock }

  const total = useMemo(() => {
    return cartItems.reduce(
      (sum, it) => sum + Number(it.Price || 0) * Number(it.qty || 0),
      0
    );
  }, [cartItems]);

  const refreshSales = async () => {
    const salesResponse = await salesAPI.getSales();
    const salesList = Array.isArray(salesResponse?.data) ? salesResponse.data : [];
    const mappedSales =
      salesList.map((s) => ({
        id: `INV-${s.SaleID}`,
        saleId: s.SaleID,
        customer: s.customer?.Name || "N/A",
        date: s.SaleDate ? new Date(s.SaleDate).toISOString().slice(0, 10) : "N/A",
        amount: `Rs ${Number(s.TotalPrice || 0).toLocaleString("en-LK")}`,
        payment: s.Type === "CARD" ? "Credit Card" : "Cash",
        invoiceId: s.invoice?.InvoiceID || null,
      })) || [];
    if (isMountedRef.current) {
      setSales(mappedSales);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    const fetchData = async () => {
      try {
        setError(null);
        setLoading(true);

        const [productsResponse, salesResponse] = await Promise.all([
          productsAPI.getProducts(),
          salesAPI.getSales(),
        ]);

        // productsResponse.data expected: [{ ProductID, Name, Price, Stock, ... }]
        const productsList = Array.isArray(productsResponse?.data) ? productsResponse.data : [];
        const mappedProducts =
          productsList.map((p) => ({
            ProductID: p.ProductID,
            Name: p.Name,
            Price: p.Price,
            Stock: p.Stock,
            revenue: `Rs ${Number(p.Price || 0).toLocaleString("en-LK")}`,
          })) || [];

        const salesList = Array.isArray(salesResponse?.data) ? salesResponse.data : [];
        const mappedSales =
          salesList.map((s) => ({
            id: `INV-${s.SaleID}`,
            saleId: s.SaleID,
            customer: s.customer?.Name || "N/A",
            date: s.SaleDate ? new Date(s.SaleDate).toISOString().slice(0, 10) : "N/A",
            amount: `Rs ${Number(s.TotalPrice || 0).toLocaleString("en-LK")}`,
            payment: s.Type === "CARD" ? "Credit Card" : "Cash",
            invoiceId: s.invoice?.InvoiceID || null,
          })) || [];

        if (!isMountedRef.current) return;
        setProducts(mappedProducts);
        setSales(mappedSales);
      } catch (err) {
        console.error("Error fetching data:", err);
        if (isMountedRef.current) {
          setError("Failed to load data");
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const cols = [
    {
      key: "id",
      header: "Invoice ID",
      width: 110,
      render: (r) => <span className={styles.invId}>{r.id}</span>,
    },
    { key: "customer", header: "Customer" },
    {
      key: "date",
      header: "Date",
      width: 160,
      render: (r) => <span className={styles.dateCell}>Date: {r.date}</span>,
    },
    { key: "amount", header: "Amount", width: 140 },
    {
      key: "payment",
      header: "Payment",
      width: 140,
      render: (r) =>
        r.payment === "Cash" ? (
          <Badge tone="success">Cash</Badge>
        ) : (
          <Badge tone="success">Credit Card</Badge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      width: 160,
      render: (r) => (
        <div className={styles.links}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setInvoicePreview(r);
            }}
          >
            View
          </a>
          <span className={styles.sep}>|</span>
          <a
            href="#"
            onClick={async (e) => {
              e.preventDefault();
              try {
                if (!r.saleId) return toast.error("Missing sale id");

                // create invoice if not exists
                const res = await fetch(
                  `${import.meta.env.VITE_API_BASE || ""}/api/sales/${r.saleId}/invoice`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                  }
                );

                const data = await res.json();
                if (!data.success) throw new Error(data.message || "Invoice failed");

                const blob = new Blob([JSON.stringify(data, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `invoice-sale-${r.saleId}.json`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (err) {
                console.error(err);
                toast.error(err.message || "Download failed");
              }
            }}
          >
            Download
          </a>
        </div>
      ),
    },
  ];

  const filteredProducts = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => String(p.Name).toLowerCase().includes(q));
  }, [products, searchText]);

  const addToCart = (p) => {
    const maxStock = Number(p.Stock);
    if (!Number.isFinite(maxStock) || maxStock <= 0) {
      toast.error("Out of stock");
      return;
    }

    setCartItems((prev) => {
      const found = prev.find((x) => x.ProductID === p.ProductID);
      if (found) {
        return prev.map((x) =>
          x.ProductID === p.ProductID
            ? {
                ...x,
                qty: Math.min(
                  maxStock,
                  Math.max(1, Number(x.qty) || 1) + 1
                ),
              }
            : x
        );
      }
      return [
        ...prev,
        {
          ProductID: p.ProductID,
          Name: p.Name,
          Price: p.Price,
          Stock: p.Stock,
          qty: 1,
        },
      ];
    });
  };

  const decQty = (productId) => {
    setCartItems((prev) =>
      prev.map((x) => {
        if (x.ProductID !== productId) return x;
        const current = Math.max(1, Number(x.qty) || 1);
        return { ...x, qty: Math.max(1, current - 1) };
      })
    );
  };

  const incQty = (productId) => {
    setCartItems((prev) =>
      prev.map((x) => {
        if (x.ProductID !== productId) return x;
        const maxStock = Number(x.Stock);
        const current = Math.max(1, Number(x.qty) || 1);
        if (!Number.isFinite(maxStock) || maxStock <= 0) {
          return { ...x, qty: current };
        }
        return { ...x, qty: Math.min(maxStock, current + 1) };
      })
    );
  };

  const removeItem = (productId) => {
    setCartItems((prev) => prev.filter((x) => x.ProductID !== productId));
  };

  const processSale = async () => {
    try {
      if (cartItems.length === 0) return toast.error("Cart is empty");

      for (const it of cartItems) {
        await salesAPI.createSale({
          ProductID: it.ProductID,
          Quantity: it.qty,
          Type: paymentMethod,
        });
      }

      toast.success("Sale processed");
      if (!isMountedRef.current) return;
      setCartItems([]);
      await refreshSales();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Process sale failed");
    }
  };

  const generateInvoiceForLatestSale = async () => {
    try {
      if (!sales || sales.length === 0) return toast.error("No sales found");

      const latest = sales[0];
      if (!latest?.saleId) return toast.error("Missing sale id");

      const res = await fetch(
        `${import.meta.env.VITE_API_BASE || ""}/api/sales/${latest.saleId}/invoice`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Invoice failed");

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-sale-${latest.saleId}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Invoice generated (JSON downloaded)");
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Invoice failed");
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className="pageTitle">Sales & Billing</div>
        <div style={{ padding: 24, opacity: 0.8 }}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className="pageTitle">Sales & Billing</div>
        <div style={{ padding: 24, color: "tomato" }}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className="pageTitle">Sales & Billing</div>

      <div className={styles.blockTitle}>
        <div className={styles.h1}>Sales & Billing</div>
        <div className={styles.sub}>
          Manage your sales, invoices, and billing information.
        </div>
      </div>

      <div className={styles.topGrid}>
        <div className={`card ${styles.products}`}>
          <div className={styles.productsHead}>
            <div className={styles.phTitle}>Products</div>
            <div className={styles.pSearch}>
              <FiSearch className={styles.sIcon} />
              <input
                placeholder="Search inventory..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.pGrid}>
            {filteredProducts.map((p) => (
              <div key={p.ProductID} className={styles.pCard}>
                <div className={styles.pName}>{p.Name}</div>
                <div className={styles.pMeta}>Total Revenue</div>
                <div className={styles.pBottom}>
                  <div className={styles.pRevenue}>{p.revenue}</div>
                  <div className={styles.pStock}>Stock : {p.Stock}</div>
                </div>

                <button
                  className={styles.addBtn}
                  aria-label="Add"
                  onClick={() => addToCart(p)}
                >
                  <FiPlus />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.rightCol}>
          <div className={`card ${styles.cart}`}>
            <div className={styles.cartTitle}>Cart</div>

            {cartItems.length === 0 ? (
              <div style={{ padding: 12, opacity: 0.7 }}>Cart is empty</div>
            ) : (
              cartItems.map((it) => (
                <div key={it.ProductID} className={styles.cartRow}>
                  <div>
                    <div className={styles.cartName}>{it.Name}</div>
                    <div className={styles.cartEach}>
                      Rs. {Number(it.Price || 0)} each
                    </div>
                  </div>

                  <div className={styles.qty}>
                    <button onClick={() => decQty(it.ProductID)}>-</button>
                    <div>{it.qty}</div>
                    <button onClick={() => incQty(it.ProductID)}>+</button>
                  </div>

                  <button
                    className={styles.trash}
                    aria-label="Remove"
                    onClick={() => removeItem(it.ProductID)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))
            )}

            <div className={styles.totalRow}>
              <div className={styles.totalLabel}>Total</div>
              <div className={styles.totalValue}>
                Rs. {Number(total || 0).toLocaleString("en-LK")}
              </div>
            </div>
          </div>

          <div className={`card ${styles.checkout}`}>
            <div className={styles.cartTitle}>Checkout</div>

            <div style={{ marginBottom: 10 }} />

            <div className={styles.pm}>Payment Method</div>
            <div className={styles.pmRow}>
              <button
                className={`${styles.pmBtn} ${
                  paymentMethod === "CASH" ? styles.pmActive : ""
                }`}
                onClick={() => setPaymentMethod("CASH")}
              >
                Cash
              </button>
              <button
                className={`${styles.pmBtn} ${
                  paymentMethod === "CARD" ? styles.pmActive : ""
                }`}
                onClick={() => setPaymentMethod("CARD")}
              >
                Card
              </button>
            </div>

            <Button
              style={{ width: "100%", height: 42, borderRadius: 10 }}
              onClick={processSale}
            >
              Process Sale
            </Button>

            <button className={styles.invoiceBtn} onClick={generateInvoiceForLatestSale}>
              Generate Invoice
            </button>
          </div>
        </div>
      </div>

      <div className={styles.stats}>
        <StatCard
          label="Total Revenue Monthly"
          value={`Rs ${sales
            .reduce((sum, s) => sum + Number(String(s.amount).replace(/[^\d]/g, "") || 0), 0)
            .toLocaleString("en-LK")}`}
          icon={<FiDollarSign />}
          iconTone="purple"
        />
        <StatCard
          label="Total Orders Monthly"
          value={String(sales.length)}
          icon={<FiCheckCircle />}
          iconTone="blue"
        />
        <StatCard
          label="Pending Payments"
          value="Rs 0"
          icon={<FiClock />}
          iconTone="accent"
        />
        <StatCard
          label="New Customers"
          value="0"
          icon={<FiUser />}
          iconTone="green"
        />
      </div>

      <div className={`card ${styles.chartCard}`}>
        <div className={styles.chartHead}>Sales Overview</div>
        <div className={styles.chartBox}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} barGap={10}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="sales" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="target" fill="#3dd9ff" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className={styles.legend}>
            <span>
              <i className={styles.l1} /> sales
            </span>
            <span>
              <i className={styles.l2} /> target
            </span>
          </div>
        </div>
      </div>

      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableHead}>
          <div>Recent Invoices</div>
          <a
            className={styles.viewAll}
            href="/employee/sales"
            onClick={(e) => {
              e.preventDefault();
              navigate("/employee/sales");
            }}
          >
            View All
          </a>
        </div>
        <Table columns={cols} rows={sales} />
      </div>

      <Modal
        open={!!invoicePreview}
        title="Invoice Details"
        onClose={() => setInvoicePreview(null)}
        width={520}
      >
        {!invoicePreview ? null : (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ color: "#64748b", fontWeight: 800, fontSize: 12 }}>Invoice</div>
                <div style={{ fontWeight: 900 }}>{invoicePreview.id}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ color: "#64748b", fontWeight: 800, fontSize: 12 }}>Customer</div>
                <div style={{ fontWeight: 800 }}>{invoicePreview.customer}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ color: "#64748b", fontWeight: 800, fontSize: 12 }}>Date</div>
                <div style={{ fontWeight: 800 }}>{invoicePreview.date}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ color: "#64748b", fontWeight: 800, fontSize: 12 }}>Payment</div>
                <div style={{ fontWeight: 800 }}>{invoicePreview.payment}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ color: "#64748b", fontWeight: 800, fontSize: 12 }}>Amount</div>
                <div style={{ fontWeight: 900 }}>{invoicePreview.amount}</div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setInvoicePreview(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
