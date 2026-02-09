const path = require("path");
const dotenv = require("dotenv");

// Always resolve backend/.env explicitly so running the app from different CWDs
// loads the same env file.
const ENV_PATH = path.join(__dirname, "..", "..", ".env");

// Do not crash if .env is missing (e.g., CI); keep process.env values as-is.
const result = dotenv.config({ path: ENV_PATH });

if (result.error && result.error.code !== "ENOENT") {
  // eslint-disable-next-line no-console
  console.warn("⚠️ Failed to load .env:", result.error.message);
}

module.exports = { ENV_PATH };
