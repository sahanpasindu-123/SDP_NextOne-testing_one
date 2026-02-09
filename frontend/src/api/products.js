import axiosClient from "./axiosClient";

export const productsAPI = {
  // 🔹 Get all products
      getProducts: async (params = {}) => {
    console.log("🔍 [API] GET /products - Fetching products", params);
    try {
      const response = await axiosClient.get("/products", { params });
      console.log("✅ [API] GET /products - Success:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ [API] GET /products - Error:", error);
      throw error;
    }
  },



    getProductById: async (id) => {
    console.log("🔍 [API] GET /products/:id - Fetching product:", id);
    try {
      const response = await axiosClient.get(`/products/${id}`);
      console.log("✅ [API] GET /products/:id - Success:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ [API] GET /products/:id - Error:", error);
      throw error;
    }
  },


  // 🔹 Get categories (used in product forms)
  getCategories: async () => {
    console.log("🔍 [API] GET /categories - Fetching categories");
    try {
      const response = await axiosClient.get("/categories");
      console.log("✅ [API] GET /categories - Success:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ [API] GET /categories - Error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // 🔹 Create new product
  createProduct: async (productData) => {
    console.log(
      "🔍 [API] POST /products - Creating product:",
      productData
    );
    try {
      const response = await axiosClient.post(
        "/products",
        productData
      );
      console.log("✅ [API] POST /products - Success:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ [API] POST /products - Error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // 🔹 Update existing product
  updateProduct: async (id, productData) => {
    console.log(
      `🔍 [API] PUT /products/${id} - Updating product:`,
      productData
    );
    try {
      const response = await axiosClient.put(
        `/products/${id}`,
        productData
      );
      console.log("✅ [API] PUT /products - Success:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ [API] PUT /products - Error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // 🔹 Delete product
  deleteProduct: async (id) => {
    console.log(
      `🔍 [API] DELETE /products/${id} - Deleting product`
    );
    try {
      const response = await axiosClient.delete(
        `/products/${id}`
      );
      console.log("✅ [API] DELETE /products - Success:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ [API] DELETE /products - Error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  updateProductImage: async (id, file) => {
    console.log("🔍 [API] POST /products/:id/image - Updating image:", id);

    try {
      const fd = new FormData();
      fd.append("image", file); // ✅ backend expects field name "image"

      const response = await axiosClient.post(`/products/${id}/image`, fd);
      console.log("✅ [API] POST /products/:id/image - Success:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ [API] POST /products/:id/image - Error:", error);
      throw error;
    }
  }
};


export default productsAPI;
