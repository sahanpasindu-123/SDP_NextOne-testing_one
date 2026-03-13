// Legacy wrapper kept for backward-compat.
// Prefer importing from `frontend/src/api/settings.js`.
import { settingsAPI } from "./settings";

export const createBackup = () => settingsAPI.createBackup();
export const listBackups = () => settingsAPI.listBackups();
export const exportData = (type) => settingsAPI.exportData(type);
export const restoreBackup = (fileName) => settingsAPI.restoreBackup(fileName);
