import { Link, useParams } from 'react-router-dom'
import { useProduct } from '../../hooks/useCatalogue'
import { customerPrice, isPieceItem, isProductOffered } from '../../utils/enquiryRules'
import { useAccess } from '../../context/AccessContext'
import { customerClosedMessage } from '../../utils/subscription'
import { useSmartBack } from '../../hooks/useSmartBack'

export function ProductDetailPage() {
  const { productId } = useParams()
  const { access } = useAccess()
  const { product, loading } = useProduct(productId)
  const goBack = useSmartBack('/menu')

  if (loading) {
    return (
      <section className="page shop-page">
        <p className="muted">Loading…</p>
      </section>
    )
  }

  if (!isProductOffered(product)) {
    return (
      <section className="page shop-page">
        <button type="button" className="back-link" onClick={goBack}>
          ← Back
        </button>
        <p className="muted">This item is not on the menu right now.</p>
      </section>
    )
  }

  const price = customerPrice(product)
  const image = product.imageUrls?.[0]
  const piece = isPieceItem(product)
  
  return (
    <section className="page shop-page product-detail">
      <button type="button" className="back-link" onClick={goBack}>
        ← Back
      </button>

      <div className="product-stage">
        <div className="product-stage__media">
          {image ? <img src={image} alt="" /> : <span>{product.name.charAt(0)}</span>}
        </div>
        <div className="product-stage__copy">
          <em className={`shop-price shop-price--${price.kind}`}>{price.label}</em>
          <h1>{product.name}</h1>
          {product.description ? <p>{product.description}</p> : null}
          {product.minimumQuantity ? (
            <p className="product-stage__min">Minimum {product.minimumQuantity}</p>
          ) : null}
          <p className="product-stage__hint">
            {price.kind === 'fixed'
                ? 'Price is per piece. We’ll confirm the total when you choose quantity.'
                : price.kind === 'from'
                  ? piece
                    ? 'Starting price per piece — final total depends on quantity.'
                    : 'Starting price for a classic finish. Size, theme, and date decide the quote.'
                  : 'We’ll send a quote on WhatsApp after we see your details on the website.'}
          </p>
        </div>
      </div>

      <div className="admin-sticky-actions">
        {access.open ? (
          <Link className="btn btn-primary" to={`/custom-cake?product=${product.id}`}>
            'Enquire about this'
          </Link>
        ) : (
          <p className="muted">{customerClosedMessage()}</p>
        )}
      </div>
    </section>
  )
}
