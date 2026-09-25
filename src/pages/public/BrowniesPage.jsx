import { useMemo, useState } from 'react'
import { useAccess } from '../../context/AccessContext'
import { useCategories, useProducts } from '../../hooks/useCatalogue'
import { ShopCard } from '../../components/customer/ShopCard'
import { groupShopProducts } from '../../utils/shopLists'
import { customerClosedMessage } from '../../utils/subscription'

export function BrowniesPage() {
  const { access } = useAccess()
  const { categories, loading: catsLoading } = useCategories({ brownieOnly: true })
  const { products, loading: productsLoading } = useProducts({ brownieOnly: true })
  const [search, setSearch] = useState('')
  const loading = catsLoading || productsLoading

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matched = products.filter((p) => {
      if (!q) return true
      return [p.name, p.description].filter(Boolean).join(' ').toLowerCase().includes(q)
    })
    return groupShopProducts(matched, categories)
  }, [products, categories, search])

  return (
    <section className="page shop-page">
      <header className="shop-menu-head">
        <h1>Brownies</h1>
        <p>
          {access.open
            ? 'Fudgy homemade brownies — order by piece or box. Not a cake order.'
            : customerClosedMessage()}
        </p>
      </header>

      <div className="jobs-toolbar">
        <input
          className="admin-search"
          type="search"
          placeholder="Search brownies"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? <p className="muted">Loading…</p> : null}
      {!loading && !groups.length ? <p className="muted">No brownies listed yet.</p> : null}

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
