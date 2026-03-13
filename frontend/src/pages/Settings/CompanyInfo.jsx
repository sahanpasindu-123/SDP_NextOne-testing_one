import { useEffect, useState } from "react";
import styles from "./CompanyInfo.module.css";
import toast from "react-hot-toast";

export default function CompanyInfo() {
  const [companyName, setCompanyName] = useState("Liyanage Motors");
  const [tax, setTax] = useState("BRN / VAT (optional)");
  const [addr1, setAddr1] = useState("No. 123, Main Street");
  const [addr2, setAddr2] = useState("");
  const [city, setCity] = useState("Sooriyawewa");
  const [state, setState] = useState("Hambantota");
  const [postal, setPostal] = useState("82000");
  const [phone, setPhone] = useState("+94 11 234 5678");
  const [email, setEmail] = useState("info@liyanagemotors.lk");
  const [web, setWeb] = useState("https://www.liyanagemotors.lk");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("companyInfo");
      if (!raw) return;
      const c = JSON.parse(raw);

      if (typeof c.companyName === "string") setCompanyName(c.companyName);
      if (typeof c.tax === "string") setTax(c.tax);
      if (typeof c.addr1 === "string") setAddr1(c.addr1);
      if (typeof c.addr2 === "string") setAddr2(c.addr2);
      if (typeof c.city === "string") setCity(c.city);
      if (typeof c.state === "string") setState(c.state);
      if (typeof c.postal === "string") setPostal(c.postal);
      if (typeof c.phone === "string") setPhone(c.phone);
      if (typeof c.email === "string") setEmail(c.email);
      if (typeof c.web === "string") setWeb(c.web);
    } catch {
      // ignore invalid localStorage
    }
  }, []);

  const handleSaveCompanyInfo = () => {
    const payload = {
      companyName,
      tax,
      addr1,
      addr2,
      city,
      state,
      postal,
      phone,
      email,
      web,
    };

    localStorage.setItem("companyInfo", JSON.stringify(payload));
    toast.success("Company info saved (stored locally).");
  };


  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Company Information</div>
      <div className={styles.notice}>
        Saved locally in this browser only (not synced to the server).
      </div>

      <div className={styles.grid2}>
        <div className={styles.block}>
          <div className={styles.label}>Company Name</div>
          <input className={styles.input} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </div>

        <div className={styles.block}>
          <div className={styles.label}>BRN / VAT Number</div>
          <input className={styles.input} value={tax} onChange={(e) => setTax(e.target.value)} />
        </div>

        <div className={styles.blockFull}>
          <div className={styles.label}>Address</div>
          <input className={styles.input} value={addr1} onChange={(e) => setAddr1(e.target.value)} />
        </div>

        <div className={styles.blockFull}>
          <input className={styles.input} value={addr2} onChange={(e) => setAddr2(e.target.value)} />
        </div>

        <div className={styles.block}>
          <div className={styles.label}>City</div>
          <input className={styles.input} value={city} onChange={(e) => setCity(e.target.value)} />
        </div>

        <div className={styles.block}>
          <div className={styles.label}>District / Province</div>
          <input className={styles.input} value={state} onChange={(e) => setState(e.target.value)} />
        </div>

        <div className={styles.block}>
          <div className={styles.label}>Postal Code</div>
          <input className={styles.input} value={postal} onChange={(e) => setPostal(e.target.value)} />
        </div>

        <div className={styles.block}>
          <div className={styles.label}>Phone Number</div>
          <input className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <div className={styles.block}>
          <div className={styles.label}>Email Address</div>
          <input className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className={styles.blockFull}>
          <div className={styles.label}>Website</div>
          <input className={styles.input} value={web} onChange={(e) => setWeb(e.target.value)} />
        </div>
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.saveBtn} onClick={handleSaveCompanyInfo}>
          <span className={styles.saveIco} />
          Save Changes
        </button>
      </div>
    </div>
  );
}
