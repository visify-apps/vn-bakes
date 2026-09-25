import { useMemo, useState } from 'react'
import { useAccess } from '../../context/AccessContext'
import { useCategories, useProducts } from '../../hooks/useCatalogue'
import { ShopCard } from '../../components/customer/ShopCard'
import { groupShopProducts } from '../../utils/shopLists'
import { customerClosedMessage } from '../../utils/subscription'

/** Cake catalogue — brownies & gifts live on their own pages. */
export function MenuPage() {
  const { access } = useAccess()
  const { categories, loading: catsLoading } = useCategories({ cakeOnly: true })
  const { products, loading: productsLoading } = useProducts({ cakeOnly: true })
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const loading = catsLoading || productsLoading

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matched = products.filter((p) => {
      if (filter && p.categoryId !== filter) return false
      if (!q) return true
      return [p.name, p.description].filter(Boolean).join(' ').toLowerCase().includes(q)
    })
    const cats = filter ? categories.filter((c) => c.id === filter) : categories
    return groupShopProducts(matched, cats)
  }, [products, categories, search, filter])

  const usedCats = useMemo(() => {
    const used = new Set(products.map((p) => p.categoryId))
    return categories.filter((c) => used.has(c.id))
  }, [products, categories])

  return (
    <section className="page shop-page">
      <header className="shop-menu-head">
        <h1>Cakes</h1>
        <p>
          {access.open
            ? 'Custom and theme cakes — tap to enquire. Brownies and gift bouquets are listed separately.'
            : customerClosedMessage()}
        </p>
      </header>

      <div className="jobs-toolbar">
        <input
          className="admin-search"
          type="search"
          placeholder="Search cakes"
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
          All cakes
        </button>
        {usedCats.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`quick-filter${filter === c.id ? ' is-active' : ''}`}
            onClick={() => setFilter(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {loading ? <p className="muted">Loading…</p> : null}
      {!loading && !groups.length ? <p className="muted">Nothing matches that.</p> : null}

      {groups.map((group) => (
        <section key={group.id} className="shop-group">
          <h2>{group.name}</h2>
          <div className="shop-grid">
            {group.items.map((product) => (
              <ShopCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}
    </section>
  )
}
