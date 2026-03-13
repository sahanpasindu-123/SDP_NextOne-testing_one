import axiosClient from "./axiosClient";

export const settingsAPI = {
  createBackup: () => axiosClient.post("/settings/backup"),
  listBackups: () => axiosClient.get("/settings/backup"),
  restoreBackup: (fileName) => axiosClient.post("/settings/backup/restore", { fileName }),
  exportData: (type) =>
    axiosClient.get(`/settings/export/${type}`, {
      responseType: "blob",
    }),
};

// Convenience named exports for pages that prefer direct imports
export const createBackup = async () => {
  const res = await settingsAPI.createBackup();
  return res.data;
};

export const listBackups = async () => {
  const res = await settingsAPI.listBackups();
  // backend: { success, data: [...] }
  return res.data?.data ?? res.data;
};

export const restoreBackup = async (fileName) => {
  const res = await settingsAPI.restoreBackup(fileName);
  return res.data;
};

export const exportData = async (type) => {
  // returns axios response with blob
  const res = await settingsAPI.exportData(type);
  return res;
};

export const downloadBackup = async (fileName) => {
  const safeName = String(fileName || "").trim();
  if (!safeName) throw new Error("fileName required");

  const res = await axiosClient.get(
    `/settings/backup/${encodeURIComponent(safeName)}/download`,
    { responseType: "blob" }
  );

  const blob = res?.data instanceof Blob ? res.data : new Blob([res?.data]);
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(url);
};
