export function groupShopProducts(products = [], categories = []) {
  const groups = categories
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      items: products.filter((p) => p.categoryId === cat.id),
    }))
    .filter((g) => g.items.length)

  const known = new Set(categories.map((c) => c.id))
  const extra = products.filter((p) => !known.has(p.categoryId))
  if (extra.length) groups.push({ id: 'other', name: 'More', items: extra })
  return groups
}
