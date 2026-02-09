import axiosClient from "./axiosClient";

/**
 * Customer Contact Us - create message
 * Backend expects: subject (optional), message (required)
 */
export const createContactMessage = (payload) => {
  return axiosClient.post("/contacts", payload);
};
