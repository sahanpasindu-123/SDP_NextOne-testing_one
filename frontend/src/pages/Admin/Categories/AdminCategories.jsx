import { useEffect, useRef, useState } from "react";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import Button from "../../../components/Button/Button";
import Table from "../../../components/Table/Table";
import { categoriesAPI } from "../../../api/categories";
import styles from "./AdminCategories.module.css";
import AddCategoryModal from "../../../components/modals/Categories/AddCategoryModal";
import { useCategories } from "../../../context/CategoriesContext";

export default function AdminCategories() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const POLL_MS = 10000;

  // ✅ React 18 StrictMode mounts effects twice in DEV.
  // Guard to avoid duplicate polling intervals / request storms.
  const didStartPollingRef = useRef(false);

  // ✅ shared context refresher
  const { refreshCategories } = useCategories();

  const load = async () => {
    const res = await categoriesAPI.getAll();
    if (!res?.success) {
      alert(res?.message || "Failed to load categories");
      return;
    }
    setItems(res.data || []);
  };

  useEffect(() => {
    if (didStartPollingRef.current) return;
    didStartPollingRef.current = true;

    load().catch((e) => {
      console.error(e);
      alert("Failed to load categories (check backend + token)");
    });

    const interval = setInterval(() => {
      load().catch((e) => console.error("poll categories failed:", e));
    }, POLL_MS);

    return () => clearInterval(interval);
  }, []);

  const handleAdd = async (name) => {
    setLoading(true);
    try {
      const res = await categoriesAPI.create(name);
      if (!res?.success) {
        alert(res?.message || "Failed to add category");
        return;
      }

      setAddOpen(false);

      // ✅ update category page list
      await load();

      // ✅ MOST IMPORTANT: update global categories for Inventory dropdown real-time
      await refreshCategories();
    } catch (e) {
      console.error(e);
      alert("Add category failed (check Network tab)");
    } finally {
      setLoading(false);
    }
  };

  const editCategory = async (row) => {
    const newName = prompt("New category name:", row?.Name);
    if (!newName || !newName.trim()) return;

    setLoading(true);
    try {
      const res = await categoriesAPI.update(row.CategoryID, newName.trim());
      if (!res?.success) {
        alert(res?.message || "Failed to update category");
        return;
      }

      await load();
      await refreshCategories(); // ✅ keep dropdown in sync
    } catch (e) {
      console.error(e);
      alert("Update failed");
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (row) => {
    const ok = confirm(`Delete category "${row?.Name}"?`);
    if (!ok) return;

    setLoading(true);
    try {
      const res = await categoriesAPI.remove(row.CategoryID);
      if (!res?.success) {
        alert(res?.message || "Failed to delete category");
        return;
      }

      await load();
      await refreshCategories(); // ✅ keep dropdown in sync
    } catch (e) {
      console.error(e);
      alert("Delete failed (maybe products exist in this category)");
    } finally {
      setLoading(false);
    }
  };

  const rows = items.map((c) => ({
    id: c.CategoryID,
    name: c.Name,
    raw: c,
  }));

  const columns = [
    { key: "name", header: "Category Name" },
    {
      key: "actions",
      header: "Actions",
      width: 180,
      render: (r) => (
        <div className={styles.actions}>
          <button
            className={styles.iconBtn}
            disabled={loading}
            onClick={() => editCategory(r.raw)}
            title="Edit"
          >
            <FiEdit2 />
          </button>
          <button
            className={styles.iconBtn}
            disabled={loading}
            onClick={() => deleteCategory(r.raw)}
            title="Delete"
          >
            <FiTrash2 />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className="pageTitle">Categories</div>
      <div className="pageSub">Manage product categories (Admin only).</div>

      <div className={`card ${styles.toolbar}`}>
        <Button leftIcon={<FiPlus />} onClick={() => setAddOpen(true)} disabled={loading}>
          Add Category
        </Button>
      </div>

      <div className={`card ${styles.tableCard}`}>
        <Table columns={columns} rows={rows} />
      </div>

      <AddCategoryModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAdd}
        loading={loading}
      />
    </div>
  );
}
