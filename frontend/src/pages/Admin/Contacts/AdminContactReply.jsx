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
  const isMountedRef = useRef(true);
  const pollRef = useRef(null);

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

  const renderMailStatus = (c) => {
    if (!c?.ReplyMessage) return null;
    const s = String(c?.ReplyMailStatus || "").toLowerCase();
    if (s === "sent") return "Sent";
    if (s === "failed") return "Failed";
    if (s === "pending") return "Pending";
    return "Replied";
  };

  // ---------- load contact ----------
  const load = async ({ silent = false, syncReplyMessage = true } = {}) => {
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

      if (!isMountedRef.current) return;
      setContact(data || null);
      if (syncReplyMessage) {
        setReplyMessage(data?.ReplyMessage || "");
      }
    } catch (err) {
      console.error(err);
      if (isMountedRef.current) {
        setError(getErrMsg(err, "Failed to load contact message"));
        setContact(null);
      }
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
        load({ silent: true, syncReplyMessage: false });
      }, 15000);
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
      const res = await adminContactsAPI.reply(id, { replyMessage: msg });
      const payload = res?.data;

      if (!isMountedRef.current) return;
      if (payload?.mailSent === false) {
        setSuccessMsg(
          payload?.message ||
            "Reply saved, but email delivery failed. You may contact the customer manually."
        );
      } else {
        setSuccessMsg(payload?.message || "Reply sent successfully.");
      }
      await load({ silent: true, syncReplyMessage: true });
    } catch (err) {
      console.error(err);
      if (isMountedRef.current) {
        setError(getErrMsg(err, "Failed to send reply"));
      }
    } finally {
      if (isMountedRef.current) {
        setSending(false);
      }
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
              <div><strong>Customer:</strong> {contact?.customer?.Name || "N/A"}</div>
              <div><strong>Email:</strong> {contact?.customer?.Email || "N/A"}</div>
              <div><strong>Subject:</strong> {contact?.Subject || "N/A"}</div>
              <div>
                <strong>Received:</strong>{" "}
                {contact?.CreatedAt
                  ? new Date(contact.CreatedAt).toLocaleString()
                  : "N/A"}
              </div>
              {contact?.ReplyMessage ? (
                <div>
                  <strong>Email delivery:</strong> {renderMailStatus(contact)}
                  {contact?.ReplyMailSentAt ? (
                    <span> ({new Date(contact.ReplyMailSentAt).toLocaleString()})</span>
                  ) : null}
                </div>
              ) : null}
              {String(contact?.ReplyMailStatus || "").toLowerCase() === "failed" &&
              contact?.ReplyMailError ? (
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  <strong>Delivery error:</strong> {String(contact.ReplyMailError)}
                </div>
              ) : null}
            </div>

            <hr style={{ margin: "12px 0" }} />

            <strong>Message</strong>
            <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
              {contact?.Message || "N/A"}
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

          {Array.isArray(contact?.history) && contact.history.length > 0 ? (
            <div style={{ padding: 12, border: "1px solid #e5e5e5", borderRadius: 10 }}>
              <strong>Conversation History</strong>
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {contact.history.map((h) => (
                  <div key={h?.ContactID} style={{ padding: 10, border: "1px solid #f0f0f0", borderRadius: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 700 }}>
                        #{h?.ContactID}{h?.Subject ? ` — ${h.Subject}` : ""}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.85 }}>
                        {h?.CreatedAt ? new Date(h.CreatedAt).toLocaleString() : ""}
                      </div>
                    </div>

                    <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{h?.Message || ""}</div>

                    {h?.ReplyMessage ? (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontWeight: 700 }}>
                          Admin reply ({renderMailStatus(h)})
                        </div>
                        <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{h.ReplyMessage}</div>
                        {String(h?.ReplyMailStatus || "").toLowerCase() === "failed" && h?.ReplyMailError ? (
                          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                            <strong>Delivery error:</strong> {String(h.ReplyMailError)}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
