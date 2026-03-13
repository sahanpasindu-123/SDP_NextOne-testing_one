import { useEffect, useRef, useState } from "react";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import Button from "../../../components/Button/Button";
import Table from "../../../components/Table/Table";
import { categoriesAPI } from "../../../api/categories";
import styles from "./AdminCategories.module.css";
import AddCategoryModal from "../../../components/modals/Categories/AddCategoryModal";
import { useCategories } from "../../../context/CategoriesContext";
import toast from "react-hot-toast";
import Modal from "../../../components/Modal/Modal.jsx";

export default function AdminCategories() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const POLL_MS = 10000;
  const isMountedRef = useRef(true);
  const pollRef = useRef(null);

  //  shared context refresher
  const { refreshCategories } = useCategories();

  const load = async () => {
    const res = await categoriesAPI.getAll();
    if (!res?.success) {
      toast.error(res?.message || "Failed to load categories");
      return;
    }
    if (!isMountedRef.current) return;
    setItems(Array.isArray(res?.data) ? res.data : []);
  };

  useEffect(() => {
    isMountedRef.current = true;

    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const startPolling = () => {
      if (pollRef.current) return;
      pollRef.current = setInterval(() => {
        if (document.visibilityState !== "visible") return;
        load().catch((e) => console.error("poll categories failed:", e));
      }, POLL_MS);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        load().catch((e) => {
          console.error(e);
          toast.error("Failed to load categories");
        });
        startPolling();
      } else {
        stopPolling();
      }
    };

    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isMountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibility);
      stopPolling();
    };
  }, []);

  const handleAdd = async (name) => {
    setLoading(true);
    try {
      const res = await categoriesAPI.create(name);
      if (!res?.success) {
        toast.error(res?.message || "Failed to add category");
        return;
      }

      if (!isMountedRef.current) return;
      setAddOpen(false);
      toast.success("Category added");

      //  update category page list
      await load();

      //  MOST IMPORTANT: update global categories for Inventory dropdown real-time
      await refreshCategories();
    } catch (e) {
      console.error(e);
      toast.error("Add category failed");
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const editCategory = async (row) => {
    setEditTarget(row);
  };

  const handleEdit = async (name) => {
    const row = editTarget;
    if (!row) return;
    if (!name || !name.trim()) return;

    setLoading(true);
    try {
      const res = await categoriesAPI.update(row.CategoryID, name.trim());
      if (!res?.success) {
        toast.error(res?.message || "Failed to update category");
        return;
      }

      setEditTarget(null);
      toast.success("Category updated");
      await load();
      await refreshCategories(); //  keep dropdown in sync
    } catch (e) {
      console.error(e);
      toast.error("Update failed");
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const deleteCategory = async (row) => {
    setDeleteTarget(row);
  };

  const confirmDelete = async () => {
    const row = deleteTarget;
    if (!row) return;
    setLoading(true);
    try {
      const res = await categoriesAPI.remove(row.CategoryID);
      if (!res?.success) {
        toast.error(res?.message || "Failed to delete category");
        return;
      }

      setDeleteTarget(null);
      toast.success("Category deleted");
      await load();
      await refreshCategories(); //  keep dropdown in sync
    } catch (e) {
      console.error(e);
      toast.error("Delete failed (maybe products exist in this category)");
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const rows = (Array.isArray(items) ? items : []).map((c) => ({
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

      <AddCategoryModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEdit}
        loading={loading}
        title="Edit Category"
        initialName={editTarget?.Name || ""}
        submitLabel="Update"
      />

      <Modal open={!!deleteTarget} title="Delete Category" onClose={() => setDeleteTarget(null)} width={520}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ color: "#334155", fontWeight: 700 }}>
            Delete category <span style={{ fontWeight: 900 }}>{deleteTarget?.Name}</span>?
          </div>
          <div style={{ color: "#64748b", fontSize: 13 }}>
            This action cannot be undone.
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={confirmDelete} disabled={loading}>
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
