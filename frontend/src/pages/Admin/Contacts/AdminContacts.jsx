import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Table from "../../../components/Table/Table.jsx";
import Badge from "../../../components/Badge/Badge.jsx";
import Button from "../../../components/Button/Button.jsx";
import { adminContactsAPI } from "../../../api/admin.js";

export default function AdminContacts() {
  const navigate = useNavigate();
  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const pollRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);

  const unwrapList = (res) => {
    // axios: { data: { success, data } }
    const payload = res?.data;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload)) return payload;
    return [];
  };

  const getErrMsg = (err, fallback) =>
    err?.response?.data?.message || err?.message || fallback;

  const load = async ({ silent = false } = {}) => {
    try {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      if (!silent) setLoading(true);
      setError("");

      const res = await adminContactsAPI.list();
      const list = unwrapList(res);

      if (!isMountedRef.current) return;
      setItems(list);
    } catch (err) {
      console.error(err);
      if (isMountedRef.current) setError(getErrMsg(err, "Failed to load inbox"));
    } finally {
      inFlightRef.current = false;
      if (!silent && isMountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const startPolling = () => {
      if (pollRef.current) return;
      pollRef.current = setInterval(() => {
        if (document.visibilityState !== "visible") return;
        load({ silent: true });
      }, 8000);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        load();
        startPolling();
      } else {
        stopPolling();
      }
    };

    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      isMountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibility);
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => {
    const needle = String(q || "").trim().toLowerCase();
    const base = Array.isArray(items) ? items : [];
    const withStableKey = (list) =>
      list.map((c) => ({
        ...c,
        // Table component falls back to CustomerID which is not unique for contacts.
        // Provide a stable unique key to avoid missing/stale rows on re-render.
        id: c?.ContactID ?? c?.id,
      }));

    if (!needle) return withStableKey(base);

    const filtered = base.filter((c) => {
      const hay = [
        c?.ContactID,
        c?.Subject,
        c?.Message,
        c?.customer?.Name,
        c?.customer?.Email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });

    return withStableKey(filtered);
  }, [items, q]);

  const cols = [
    {
      key: "ContactID",
      header: "ID",
      width: 90,
      render: (r) => <span style={{ fontWeight: 800 }}>#{r?.ContactID}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      render: (r) => (
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ fontWeight: 700 }}>{r?.customer?.Name || "N/A"}</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{r?.customer?.Email || "N/A"}</div>
        </div>
      ),
    },
    {
      key: "Subject",
      header: "Subject",
      render: (r) => <span>{r?.Subject || "—"}</span>,
    },
    {
      key: "CreatedAt",
      header: "Received",
      width: 190,
      render: (r) =>
        r?.CreatedAt ? new Date(r.CreatedAt).toLocaleString() : "N/A",
    },
    {
      key: "status",
      header: "Status",
      width: 120,
      render: (r) =>
        r?.ReplyMessage ? (
          String(r?.ReplyMailStatus || "").toLowerCase() === "sent" ? (
            <Badge tone="success">Sent</Badge>
          ) : String(r?.ReplyMailStatus || "").toLowerCase() === "failed" ? (
            <Badge tone="danger">Failed</Badge>
          ) : String(r?.ReplyMailStatus || "").toLowerCase() === "pending" ? (
            <Badge tone="warn">Pending</Badge>
          ) : (
            <Badge tone="info">Replied</Badge>
          )
        ) : (
          <Badge tone="warn">Open</Badge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      width: 120,
      render: (r) => (
        <Button onClick={() => navigate(`/admin/contacts/${r?.ContactID}`)}>
          Open
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Contacts Inbox</h2>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            View customer contact messages and reply.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" onClick={() => load()} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by subject, message, name, email…"
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #d6d6d6",
          }}
        />
      </div>

      {error ? (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            border: "1px solid #f3b4b4",
            borderRadius: 8,
          }}
        >
          <strong style={{ display: "block", marginBottom: 6 }}>Error</strong>
          <div>{error}</div>
        </div>
      ) : null}

      {loading ? <div style={{ padding: 12 }}>Loading…</div> : null}

      {!loading && rows.length === 0 ? (
        <div style={{ padding: 12, opacity: 0.8 }}>No messages found.</div>
      ) : null}

      {!loading && rows.length > 0 ? <Table columns={cols} rows={rows} /> : null}
    </div>
  );
}
