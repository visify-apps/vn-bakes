import { useEffect, useState } from 'react'
import { listCategories, listProducts, getProduct } from '../services/firestore/catalogue'

/**
 * @param {{ categoryId?: string, cakeOnly?: boolean, brownieOnly?: boolean, giftOnly?: boolean }} [options]
 */
export function useProducts(options = {}) {
  const { categoryId, cakeOnly = false, brownieOnly = false, giftOnly = false } = options
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listProducts(undefined, { categoryId, cakeOnly, brownieOnly, giftOnly })
      .then((data) => {
        if (!cancelled) setProducts(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [categoryId, cakeOnly, brownieOnly, giftOnly])

  return { products, loading, error }
}

/**
 * @param {{ cakeOnly?: boolean, brownieOnly?: boolean, giftOnly?: boolean }} [options]
 */
export function useCategories(options = {}) {
  const { cakeOnly = false, brownieOnly = false, giftOnly = false } = options
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    listCategories(undefined, { cakeOnly, brownieOnly, giftOnly })
      .then((data) => {
        if (!cancelled) setCategories(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [cakeOnly, brownieOnly, giftOnly])

  return { categories, loading, error }
}

export function useProduct(productId) {
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!productId) {
      setProduct(null)
      setLoading(false)
      return undefined
    }
    setLoading(true)
    getProduct(productId)
      .then((data) => {
        if (!cancelled) setProduct(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [productId])

  return { product, loading, error }
}
