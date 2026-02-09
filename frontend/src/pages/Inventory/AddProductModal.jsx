import { useState } from 'react'
import Modal from '../../components/Modal/Modal.jsx'
import Input from '../../components/FormControls/Input.jsx'
import Select from '../../components/FormControls/Select.jsx'
import Button from '../../components/Button/Button.jsx'
import styles from './AddProductModal.module.css'

export default function AddProductModal({ open, onClose }) {
  const [form, setForm] = useState({
    name: '',
    category: '',
    price: '',
    stock: '',
    min: '',
    sku: '',
    desc: '',
  })

  function set(k, v){ setForm(prev => ({...prev, [k]: v})) }

  return (
    <Modal open={open} title="Add New Product" onClose={onClose} width={700}>
      <div className={styles.grid}>
        <Input label="Product Name" required value={form.name} onChange={(e)=>set('name', e.target.value)} />
        <Select label="Category" required value={form.category} onChange={(e)=>set('category', e.target.value)}>
          <option value="">Select category</option>
          <option>Filters</option>
          <option>Tracks</option>
          <option>Engine</option>
          <option>Electrical</option>
          <option>Cabin</option>
          <option>Hydraulics</option>
          <option>Attachments</option>
        </Select>

        <Input label="Price" required value={form.price} onChange={(e)=>set('price', e.target.value)} />
        <Input label="Stock Quantity" required value={form.stock} onChange={(e)=>set('stock', e.target.value)} />

        <Input label="Minimum Required Quantity" required value={form.min} onChange={(e)=>set('min', e.target.value)} />
        <Input label="SKU/Product ID" placeholder="Will be auto-generated if left empty" value={form.sku} onChange={(e)=>set('sku', e.target.value)} />
      </div>

      <div className={styles.desc}>
        <div className={styles.dLabel}>Description</div>
        <textarea value={form.desc} onChange={(e)=>set('desc', e.target.value)} />
      </div>

      <div className={styles.footer}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={onClose}>Add Item</Button>
      </div>
    </Modal>
  )
}
