/**
 * Smoke test: Product request approval flow
 *
 * Prereqs:
 * - backend running on http://localhost:5000
 * - at least 1 Category exists
 * - valid staff credentials
 *
 * PowerShell example:
 *   $env:ADMIN_ID="A001"; $env:ADMIN_PW="pass"; $env:EMP_ID="E001"; $env:EMP_PW="pass"; node backend/scripts/smokeProductRequests.js
 */

const axios = require("axios");

const API = process.env.API_BASE_URL || "http://localhost:5000/api";

async function staffLogin(body) {
  const r = await axios.post(`${API}/auth/staff-login`, body);
  if (!r.data?.token) throw new Error("No token returned from staff-login");
  return r.data.token;
}

async function main() {
  const adminId = process.env.ADMIN_ID;
  const adminPw = process.env.ADMIN_PW;
  const empId = process.env.EMP_ID;
  const empPw = process.env.EMP_PW;

  if (!adminId || !adminPw || !empId || !empPw) {
    console.error(
      "Missing env vars. Set ADMIN_ID, ADMIN_PW, EMP_ID, EMP_PW (optionally API_BASE_URL)."
    );
    process.exit(2);
  }

  const [adminToken, empToken] = await Promise.all([
    staffLogin({ adminId, password: adminPw }),
    staffLogin({ employeeId: empId, password: empPw }),
  ]);

  const admin = axios.create({
    baseURL: API,
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  const emp = axios.create({
    baseURL: API,
    headers: { Authorization: `Bearer ${empToken}` },
  });

  // 1) Employee cannot create product directly
  try {
    await emp.post("/products", {
      productName: "X",
      categoryId: 1,
      price: 1,
      stockQty: 1,
      minQty: 1,
    });
    console.log("UNEXPECTED: employee could create product");
  } catch (e) {
    console.log(
      "EMP POST /products ->",
      e.response?.status,
      e.response?.data?.message
    );
  }

  // 2) Employee creates product request
  const cats = await admin.get("/categories");
  const catId = cats.data?.data?.[0]?.CategoryID;
  if (!catId) throw new Error("No categories found in DB. Seed a category first.");

  const reqRes = await emp.post("/product-requests", {
    productName: `Requested Part ${Date.now()}`,
    categoryId: catId,
    price: 123.45,
    stockQty: 10,
    minQty: 2,
    desc: "Requested via smoke script",
  });
  const requestId = reqRes.data?.data?.RequestID;
  console.log(
    "EMP POST /product-requests ->",
    reqRes.status,
    "RequestID=",
    requestId,
    "Status=",
    reqRes.data?.data?.Status
  );

  // 3) Admin lists pending
  const pending = await admin.get("/product-requests?status=PENDING");
  const found = pending.data?.data?.find((r) => r.RequestID === requestId);
  console.log("ADMIN GET /product-requests?status=PENDING -> found=", !!found);

  // 4) Admin approves
  const approve = await admin.patch(`/product-requests/${requestId}/approve`);
  console.log(
    "ADMIN PATCH approve ->",
    approve.status,
    "reqStatus=",
    approve.data?.data?.updatedReq?.Status,
    "productId=",
    approve.data?.data?.product?.ProductID
  );

  // 5) Ensure product appears in catalog
  const products = await admin.get("/products", { params: { q: "Requested Part" } });
  console.log(
    "ADMIN GET /products?q=Requested Part -> count=",
    products.data?.data?.length
  );
}

main().catch((e) => {
  console.error("Smoke test failed:", e.response?.status, e.response?.data || e.message);
  process.exit(1);
});
