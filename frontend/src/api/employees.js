import axiosClient from "./axiosClient";

export const changeEmployeePassword = (payload) =>
  axiosClient.post("/employees/change-password", payload);

export const employeesAPI = {
  list: async () => {
    const res = await axiosClient.get("/employees");
    return res.data;
  },

  create: async ({ employeeId, name, role, password }) => {
    const res = await axiosClient.post("/employees", {
      employeeId,
      name,
      role,
      password,
    });
    return res.data;
  },
};
