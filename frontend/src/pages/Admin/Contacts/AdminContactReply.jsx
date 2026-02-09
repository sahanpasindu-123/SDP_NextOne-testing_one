import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../../../components/Button/Button.jsx";
import { adminContactsAPI } from "../../../api/admin.js";

export default function AdminContactReply() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contact, setContact] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const inFlightRef = useRef(false);

  // ---------- helpers ----------
  const unwrapOne = (res) => {
    // axios: { data: { success, data } }
    if (res?.data?.data) return res.data.data;
    if (res?.data) return res.data;
    return null;
  };

  const getErrMsg = (err, fallback) =>
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback;

  const isValidId = Number.isInteger(Number(id)) && Number(id) > 0;

  // ---------- load contact ----------
  const load = async ({ silent = false } = {}) => {
    if (!isValidId) {
      setError("Invalid contact id");
      setContact(null);
      return;
    }

    try {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      if (!silent) setLoading(true);
      setError("");
      setSuccessMsg("");

      const res = await adminContactsAPI.getById(id);
      const data = unwrapOne(res);

      setContact(data || null);
      setReplyMessage(data?.ReplyMessage || "");
    } catch (err) {
      console.error(err);
      setError(getErrMsg(err, "Failed to load contact message"));
      setContact(null);
    } finally {
      inFlightRef.current = false;
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---------- send reply ----------
  const sendReply = async () => {
    if (!isValidId) {
      setError("Invalid contact id");
      return;
    }

    try {
      setError("");
      setSuccessMsg("");

      const msg = String(replyMessage || "").trim();
      if (!msg) return setError("Reply message is required.");
      if (msg.length < 3) return setError("Reply message is too short.");

      setSending(true);
      await adminContactsAPI.reply(id, { replyMessage: msg });

      setSuccessMsg("Reply sent successfully.");
      await load({ silent: true });
    } catch (err) {
      console.error(err);
      setError(getErrMsg(err, "Failed to send reply"));
    } finally {
      setSending(false);
    }
  };

  // ---------- UI ----------
  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Contact Message</h2>

        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant="secondary"
            onClick={() => navigate("/admin/contacts")}
            disabled={loading || sending}
          >
            Back
          </Button>
          <Button onClick={() => load()} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 12, padding: 12, border: "1px solid #f3b4b4", borderRadius: 8 }}>
          <strong>Error</strong>
          <div>{error}</div>
        </div>
      )}

      {successMsg && (
        <div style={{ marginBottom: 12, padding: 12, border: "1px solid #bfe7c0", borderRadius: 8 }}>
          <strong>Success</strong>
          <div>{successMsg}</div>
        </div>
      )}

      {loading && <div>Loading...</div>}

      {!loading && contact && (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ padding: 12, border: "1px solid #e5e5e5", borderRadius: 10 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div><strong>ID:</strong> {contact.ContactID}</div>
              <div><strong>Customer:</strong> {contact?.customer?.Name || "—"}</div>
              <div><strong>Email:</strong> {contact?.customer?.Email || "—"}</div>
              <div><strong>Subject:</strong> {contact?.Subject || "—"}</div>
              <div>
                <strong>Received:</strong>{" "}
                {contact?.CreatedAt
                  ? new Date(contact.CreatedAt).toLocaleString()
                  : "—"}
              </div>
            </div>

            <hr style={{ margin: "12px 0" }} />

            <strong>Message</strong>
            <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
              {contact?.Message || "—"}
            </div>
          </div>

          <div style={{ padding: 12, border: "1px solid #e5e5e5", borderRadius: 10 }}>
            <strong>Reply</strong>

            <textarea
              rows={6}
              style={{ width: "100%", marginTop: 8, padding: 10 }}
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              disabled={sending}
              placeholder="Type your reply here..."
            />

            <div style={{ marginTop: 10, textAlign: "right" }}>
              <Button onClick={sendReply} disabled={sending}>
                {sending ? "Sending..." : "Send Reply"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
