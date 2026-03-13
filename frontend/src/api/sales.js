import axiosClient from "./axiosClient";

export const salesAPI = {
  getSales: async (params = {}) => {
    const response = await axiosClient.get("/sales", { params });
    return response.data;
  },

  createSale: async (saleData) => {
    const response = await axiosClient.post("/sales", saleData);
    return response.data;
  },

  createFromReservation: async (reservationId, paymentMethod = "CASH") => {
    const response = await axiosClient.post("/sales/from-reservation", {
      reservationId,
      paymentMethod,
    });
    return response.data;
  },
};
