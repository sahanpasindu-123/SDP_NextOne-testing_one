import axiosClient from './axiosClient'

export const reportsAPI = {
  getReports: async () => {
    const response = await axiosClient.get('/reports')
    return response.data
  }
}