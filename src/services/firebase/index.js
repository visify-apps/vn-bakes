import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { appConfig, isFirebaseConfigured } from '../../config/appConfig'

let app = null
let auth = null
let db = null
let storage = null

/**
 * Lazily initializes Firebase. Safe to call with placeholder env during Phase 1;
 * real credentials are required before Auth/Firestore/Storage operations succeed.
 */
export function getFirebaseApp() {
  if (app) return app
  app = initializeApp(appConfig.firebase)
  return app
}

export function getFirebaseAuth() {
  if (auth) return auth
  auth = getAuth(getFirebaseApp())
  return auth
}

export function getFirestoreDb() {
  if (db) return db
  db = getFirestore(getFirebaseApp())
  return db
}

export function getFirebaseStorage() {
  if (storage) return storage
  storage = getStorage(getFirebaseApp())
  return storage
}

export { isFirebaseConfigured }
