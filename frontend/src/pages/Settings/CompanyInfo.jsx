import { useRef, useState } from "react";
import styles from "./CompanyInfo.module.css";

export default function CompanyInfo() {
  const [companyName, setCompanyName] = useState("Liyanage Motors");
  const [tax, setTax] = useState("27AABCU9603R1ZX");
  const [addr1, setAddr1] = useState("123 Construction Lane, Industrial Area");
  const [addr2, setAddr2] = useState("Phase 2");
  const [city, setCity] = useState("Sooriyawewa");
  const [state, setState] = useState("Maharashtra");
  const [postal, setPostal] = useState("400001");
  const [phone, setPhone] = useState("+91 22 2345 6789");
  const [email, setEmail] = useState("info@jcbparts.com");
  const [web, setWeb] = useState("https://www.jcbparts.com");

  // -------- Logo + Save actions (implemented) --------
  const logoFileRef = useRef(null);
  const [logoUrl, setLogoUrl] = useState("");

  const handleChangeLogo = () => {
    logoFileRef.current?.click();
  };

  const handleLogoSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setLogoUrl(url);
  };

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
      logoUrl,
    };

    localStorage.setItem("companyInfo", JSON.stringify(payload));
    alert("Company info saved (stored locally).");
  };


  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Company Information</div>

      <div className={styles.logoRow}>
        <div className={styles.logoBox}>J</div>
        <button type="button" className={styles.saveBtn}>
          <span className={styles.saveIco} />
          Save Changes
        </button>
      </div>

      <div className={styles.grid2}>
        <div className={styles.block}>
          <div className={styles.label}>Company Name</div>
          <input className={styles.input} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </div>

        <div className={styles.block}>
          <div className={styles.label}>Tax ID / GST Number</div>
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
          <div className={styles.label}>State</div>
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
