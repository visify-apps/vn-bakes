import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { listAdminProducts, setProductAvailability } from '../../services/firestore/adminProducts'
import { seedCategories } from '../../data/seedCatalogue'
import { formatProductPrice } from '../../utils/pricing'

function categoryName(id) {
  return seedCategories.find((c) => c.id === id)?.name || 'Other'
}

function MenuRow({ product, onToggle }) {
  const on = product.available !== false
  const sub = !on ? 'Hidden' : product.minimumQuantity ? `Min ${product.minimumQuantity}` : ''
  return (
    <article className={`menu-row${on ? '' : ' menu-row--off'}`}>
      <Link to={`/admin/products/${product.id}`} className="menu-row__main">
        <div className="menu-row__thumb">
          {product.imageUrls?.[0] ? (
            <img src={product.imageUrls[0]} alt="" />
          ) : (
            <span>{product.name?.charAt(0)}</span>
          )}
        </div>
        <div className="menu-row__copy">
          <strong>{product.name}</strong>
          {sub ? <p>{sub}</p> : null}
        </div>
        <span className="menu-row__price">{formatProductPrice(product)}</span>
      </Link>
      <button
        type="button"
        className="menu-row__vis"
        onClick={() => onToggle(product)}
        aria-label={on ? 'Hide from menu' : 'Show on menu'}
      >
        {on ? (
          <Eye size={18} strokeWidth={2} aria-hidden="true" />
        ) : (
          <EyeOff size={18} strokeWidth={2} aria-hidden="true" />
        )}
      </button>
    </article>
  )
}

export function AdminProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    let cancelled = false
    listAdminProducts()
      .then((items) => {
        if (!cancelled) setProducts(items)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const hiddenCount = products.filter((p) => p.available === false).length
  const onCount = products.length - hiddenCount

  const categories = useMemo(() => {
    const used = new Set(products.map((p) => p.categoryId))
    return seedCategories.filter((c) => used.has(c.id))
  }, [products])

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matched = products.filter((p) => {
      if (filter === 'hidden' && p.available !== false) return false
      if (filter && filter !== 'hidden' && p.categoryId !== filter) return false
      if (!q) return true
      return [p.name, categoryName(p.categoryId), formatProductPrice(p)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    })

    if (filter && filter !== 'hidden') {
      return matched.length ? [{ id: filter, name: categoryName(filter), items: matched }] : []
    }

    const byCat = new Map()
    for (const product of matched) {
      const id = product.categoryId || 'other'
      if (!byCat.has(id)) {
        byCat.set(id, { id, name: categoryName(id), items: [] })
      }
      byCat.get(id).items.push(product)
    }

    const ordered = seedCategories
      .map((c) => byCat.get(c.id))
      .filter(Boolean)
    const extra = [...byCat.values()].filter((g) => !seedCategories.some((c) => c.id === g.id))
    return [...ordered, ...extra]
  }, [products, search, filter])

  async function toggleAvailable(product) {
    const next = product.available === false
    setProducts((items) => items.map((p) => (p.id === product.id ? { ...p, available: next } : p)))
    try {
      await setProductAvailability(product.id, next)
    } catch {
      const items = await listAdminProducts()
      setProducts(items)
    }
  }

  return (
    <section className="page admin-page admin-menu">
      <header className="menu-head">
        <div>
          <h1>Menu</h1>
          <p>
            Cakes and classes stay in separate categories · {onCount} on
            {hiddenCount ? ` · ${hiddenCount} hidden` : ''}
          </p>
        </div>
        <Link className="btn btn-primary btn-small" to="/admin/products/new">
          Add
        </Link>
      </header>

      <div className="jobs-toolbar">
        <input
          className="admin-search"
          type="search"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="menu-cats" role="tablist" aria-label="Category">
        <button
          type="button"
          className={`quick-filter${!filter ? ' is-active' : ''}`}
          onClick={() => setFilter('')}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`quick-filter${filter === c.id ? ' is-active' : ''}`}
            onClick={() => setFilter(c.id)}
          >
            {c.name}
          </button>
        ))}
        {hiddenCount ? (
          <button
            type="button"
            className={`quick-filter${filter === 'hidden' ? ' is-active' : ''}`}
            onClick={() => setFilter('hidden')}
          >
            Hidden
          </button>
        ) : null}
      </div>

      {loading ? <p className="muted">Loading…</p> : null}
      {!loading && !groups.length ? <p className="muted">Nothing here.</p> : null}

      {groups.map((group) => (
        <section key={group.id} className="home-block">
          {!filter || filter === 'hidden' ? (
            <div className="home-block__head">
              <h2>
                {group.name}
                <em>{group.items.length}</em>
              </h2>
            </div>
          ) : null}
          <div className="home-stack">
            {group.items.map((product) => (
              <MenuRow key={product.id} product={product} onToggle={toggleAvailable} />
            ))}
          </div>
        </section>
      ))}
    </section>
  )
}
