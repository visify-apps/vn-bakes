import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useBusiness } from '../../context/BusinessContext'
import { useAccess } from '../../context/AccessContext'
import { useProducts } from '../../hooks/useCatalogue'
import { ShopCard } from '../../components/customer/ShopCard'
import { AFTER_ENQUIRY_HOME_KEY } from '../../services/whatsapp'
import { customerClosedMessage } from '../../utils/subscription'

export function HomePage() {
  const { business } = useBusiness()
  const { access } = useAccess()

  useEffect(() => {
    try {
      sessionStorage.removeItem(AFTER_ENQUIRY_HOME_KEY)
    } catch {
      // ignore
    }
  }, [])

  const { products: cakes, loading: cakesLoading } = useProducts({ cakeOnly: true })
  const { products: brownies, loading: browniesLoading } = useProducts({ brownieOnly: true })
  const { products: gifts, loading: giftsLoading } = useProducts({ giftOnly: true })
  const days = business.minimumPreorderDays || 2
  const cakeShowcase = cakes.slice(0, 2)
  const brownieShowcase = brownies.slice(0, 2)
  const giftShowcase = gifts.slice(0, 2)
  const ig = business.instagramHandle || business.instagramUrl || 'vn__bakes__'

  return (
    <div className="shop-home">
      <section className="shop-hero">
        <p className="shop-hero__kicker">Home bakers · Red Hills / Korattur</p>
        <h1>{business.displayName || 'VN Bakes'}</h1>
        <p className="shop-hero__line">
          Custom cakes, brownies, chocolates, and bouquets — two friends, one mission. Order on the
          website; we’ll continue on WhatsApp.
        </p>
        <div className="shop-hero__actions">
          {access.open ? (
            <Link className="btn btn-primary" to="/custom-cake">
              Start an enquiry
            </Link>
          ) : (
            <p className="shop-hero__note">{customerClosedMessage()}</p>
          )}
          <Link className="btn btn-secondary" to="/menu">
            See cakes
          </Link>
        </div>
        <p className="shop-hero__note">
          {days} days notice · Pickup or delivery · @
          {String(ig).replace(/^@/, '').replace(/.*instagram\.com\//, '').replace(/\/.*/, '')}
        </p>
      </section>

      <section className="page shop-page shop-home__menu">
        <div className="shop-section-head">
          <h2>Cakes</h2>
          <Link to="/menu">All cakes</Link>
        </div>
        {cakesLoading ? <p className="muted">Loading…</p> : null}
        <div className="shop-grid">
          {cakeShowcase.map((product) => (
            <ShopCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {brownieShowcase.length ? (
        <section className="page shop-page shop-home__menu">
          <div className="shop-section-head">
            <h2>Brownies</h2>
            <Link to="/brownies">All brownies</Link>
          </div>
          {browniesLoading ? <p className="muted">Loading…</p> : null}
          <div className="shop-grid">
            {brownieShowcase.map((product) => (
              <ShopCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : null}

      {giftShowcase.length ? (
        <section className="page shop-page shop-home__menu">
          <div className="shop-section-head">
            <h2>Gifts</h2>
            <Link to="/gifts">Chocolates & bouquets</Link>
          </div>
          {giftsLoading ? <p className="muted">Loading…</p> : null}
          <div className="shop-grid">
            {giftShowcase.map((product) => (
              <ShopCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
