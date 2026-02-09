import { useState } from "react";
import styles from "./ContactUs.module.css";
import { FiMapPin, FiPhone, FiMail } from "react-icons/fi";
import { createContactMessage } from "../../../api/contacts";

export default function ContactUs() {
  // NOTE: Backend creates contact for the logged-in customer (customerId from token)
  // So name/email fields are not required for backend flow.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [subject, setSubject] = useState(""); // optional
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

      // optional: clear these too (they are UI-only)
      setName("");
      setEmail("");
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

            {/* Optional UI-only fields */}
            <label>
              <span>Name (optional)</span>
              <input
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label>
              <span>Email (optional)</span>
              <input
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

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
