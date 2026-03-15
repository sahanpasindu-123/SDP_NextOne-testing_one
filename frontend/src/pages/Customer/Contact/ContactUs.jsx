import { useEffect, useRef, useState } from "react";
import styles from "./ContactUs.module.css";
import { FiMapPin, FiPhone, FiMail } from "react-icons/fi";
import { createContactMessage } from "../../../api/contacts";
import { customersAPI } from "../../../api/customers";

export default function ContactUs() {
  const isMountedRef = useRef(true);
  const [accountEmail, setAccountEmail] = useState("");

  const [subject, setSubject] = useState(""); // optional
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    isMountedRef.current = true;

    async function loadMe() {
      try {
        setLoadingEmail(true);
        const me = await customersAPI.getMe();
        const email = me?.data?.Email || "";
        if (isMountedRef.current) setAccountEmail(String(email || ""));
      } catch (e) {
        // Contact can still be sent (backend uses CustomerID from token), but we avoid showing a wrong email.
        if (isMountedRef.current) setAccountEmail("");
      } finally {
        if (isMountedRef.current) setLoadingEmail(false);
      }
    }

    loadMe();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");
      setSuccess("");

      const subjectClean = String(subject || "").trim();
      const messageClean = String(message || "").trim();

      // minimum client-side validation
      if (!messageClean) {
        setError("Message is required.");
        return;
      }
      if (messageClean.length < 10) {
        setError("Message must be at least 10 characters.");
        return;
      }

      setLoading(true);

      // Send only what backend uses
      await createContactMessage({
        subject: subjectClean || null,
        message: messageClean,
      });

      setSuccess("Message sent successfully.");
      setSubject("");
      setMessage("");
    } catch (err) {
      console.error(err);

      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to send message.";
      setError(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Contact Us</h1>
        <p>We are here to help you find the right JCB spare parts.</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.title}>Send a Message</div>

          {/* ✅ Use a real form submit */}
          <form className={styles.form} onSubmit={handleSubmit}>
            {/* ✅ Error / Success */}
            {error ? (
              <div
                style={{
                  marginBottom: 12,
                  padding: 12,
                  border: "1px solid #f3b4b4",
                  borderRadius: 8,
                }}
              >
                <strong style={{ display: "block", marginBottom: 6 }}>
                  Error
                </strong>
                <div>{error}</div>
              </div>
            ) : null}

            {success ? (
              <div
                style={{
                  marginBottom: 12,
                  padding: 12,
                  border: "1px solid #bfe7c0",
                  borderRadius: 8,
                }}
              >
                <strong style={{ display: "block", marginBottom: 6 }}>
                  Success
                </strong>
                <div>{success}</div>
              </div>
            ) : null}

            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
              {loadingEmail ? (
                <span>Loading your registered email…</span>
              ) : accountEmail ? (
                <span>Replies will be sent to your registered email: <strong>{accountEmail}</strong></span>
              ) : (
                <span>Replies will be sent to your registered account email.</span>
              )}
            </div>

            <label>
              <span>Subject (optional)</span>
              <input
                placeholder="Enter subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>

            <label>
              <span>Message</span>
              <textarea
                placeholder="Write your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>

            <button
              className={styles.send}
              type="submit"
              disabled={loading}
              style={{
                opacity: loading ? 0.6 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </form>
        </div>

        <div className={styles.card}>
          <div className={styles.title}>Contact Information</div>
          <div className={styles.info}>
            <div>
              <FiMapPin /> Liyanage Motors, Padalangala Road, Sooriyawewa
            </div>
            <div>
              <FiPhone /> +94 755678900
            </div>
            <div>
              <FiMail /> liyanagemotors12@gmail.com
            </div>
          </div>

          <div className={styles.map} />
        </div>
      </div>
    </div>
  );
}
