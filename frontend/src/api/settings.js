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
  // Since backend produces json files and does not provide a dedicated download endpoint,
  // we export the backup as a blob by fetching it via /uploads. If uploads are not exposed,
  // fall back to exporting from list.
  // Minimal approach: use browser download of known /uploads path.
  const url = `${axiosClient.defaults.baseURL?.replace(/\/?api\/?$/, "") || ""}/uploads/backups/${encodeURIComponent(fileName)}`;
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
};
