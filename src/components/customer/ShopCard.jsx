import { Link } from 'react-router-dom'
import { customerPrice } from '../../utils/enquiryRules'

export function ShopCard({ product }) {
  const price = customerPrice(product)
  return (
    <Link to={`/products/${product.id}`} className={`shop-card shop-card--${price.kind}`}>
      <div className="shop-card__media">
        {product.imageUrls?.[0] ? (
          <img src={product.imageUrls[0]} alt="" loading="lazy" />
        ) : (
          <span>{product.name?.charAt(0)}</span>
        )}
        <em className={`shop-price shop-price--${price.kind}`}>{price.short}</em>
      </div>
      <strong>{product.name}</strong>
      {product.minimumQuantity ? <p>Min {product.minimumQuantity}</p> : null}
    </Link>
  )
}
