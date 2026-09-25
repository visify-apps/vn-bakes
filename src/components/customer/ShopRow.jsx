import { Link } from 'react-router-dom'
import { formatProductPrice } from '../../utils/pricing'

export function ShopRow({ product }) {
  const sub = product.minimumQuantity ? `Min ${product.minimumQuantity}` : ''
  return (
    <article className="menu-row">
      <Link to={`/products/${product.id}`} className="menu-row__main">
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
    </article>
  )
}
