import axiosClient from "./axiosClient";

export const createBackup = () => {
  return axiosClient.post("/settings/backup");
};

export const exportData = (type) => {
  return axiosClient.get(`/settings/export/${type}`, {
    responseType: "blob",
  });
};

export const restoreBackup = () => {
  return axiosClient.post("/settings/backup/restore");
};
