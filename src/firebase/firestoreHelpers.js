import { db } from './firebaseConfig'
import { collection, doc, setDoc, deleteDoc, getDocs, getDoc, writeBatch, onSnapshot } from 'firebase/firestore'

const entriesCol    = (uid) => collection(db, 'users', uid, 'moodEntries')
const entryDoc      = (uid, id) => doc(db, 'users', uid, 'moodEntries', String(id))
const activitiesDoc = (uid) => doc(db, 'users', uid, 'settings', 'activities')

export async function fetchUserMoodEntries(uid) {
  const snap = await getDocs(entriesCol(uid))
  return snap.docs.map(d => d.data())
}

export async function saveUserMoodEntry(uid, entry) {
  await setDoc(entryDoc(uid, entry.id), entry)
}

export async function deleteUserMoodEntry(uid, entryId) {
  await deleteDoc(entryDoc(uid, entryId))
}

export async function fetchUserCustomActivities(uid) {
  const snap = await getDoc(activitiesDoc(uid))
  return snap.exists() ? snap.data() : { custom: [], deleted: [] }
}

export async function saveUserCustomActivities(uid, data) {
  await setDoc(activitiesDoc(uid), data)
}

export function subscribeToUserMoodEntries(uid, callback) {
  return onSnapshot(entriesCol(uid), snap => callback(snap.docs.map(d => d.data())))
}

export function subscribeToUserCustomActivities(uid, callback) {
  return onSnapshot(activitiesDoc(uid), snap =>
    callback(snap.exists() ? snap.data() : { custom: [], deleted: [] })
  )
}

// Overwrites all entries at once — used by importData (max 500 per batch)
export async function batchSaveUserMoodEntries(uid, entries) {
  const batch = writeBatch(db)
  entries.forEach(entry => batch.set(entryDoc(uid, entry.id), entry))
  await batch.commit()
}

// ─── Firestore REST API (used on iOS when JS SDK auth isn't available) ────────

const fsBase = () =>
  `https://firestore.googleapis.com/v1/projects/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/databases/(default)/documents`

function toFsVal(val) {
  if (val === null || val === undefined) return { nullValue: null }
  if (typeof val === 'boolean') return { booleanValue: val }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) }
    return { doubleValue: val }
  }
  if (typeof val === 'string') return { stringValue: val }
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFsVal) } }
  if (typeof val === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(val).map(([k, v]) => [k, toFsVal(v)])) } }
  }
  return { nullValue: null }
}

function fromFsVal(val) {
  if ('nullValue'    in val) return null
  if ('booleanValue' in val) return val.booleanValue
  if ('integerValue' in val) return parseInt(val.integerValue)
  if ('doubleValue'  in val) return val.doubleValue
  if ('stringValue'  in val) return val.stringValue
  if ('timestampValue' in val) return val.timestampValue
  if ('arrayValue'   in val) return (val.arrayValue.values || []).map(fromFsVal)
  if ('mapValue'     in val) return fromFsFields(val.mapValue.fields || {})
  return null
}

function fromFsFields(fields) {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fromFsVal(v)]))
}

async function fsGet(path, token) {
  const res = await fetch(`${fsBase()}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Firestore GET ${path} failed: ${res.status}`)
  return res.json()
}

async function fsPatch(path, fields, token) {
  const res = await fetch(`${fsBase()}/${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  })
  if (!res.ok) throw new Error(`Firestore PATCH ${path} failed: ${res.status}`)
}

async function fsDelete(path, token) {
  const res = await fetch(`${fsBase()}/${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok && res.status !== 404) throw new Error(`Firestore DELETE ${path} failed: ${res.status}`)
}

export async function fetchUserMoodEntriesREST(uid, token) {
  const data = await fsGet(`users/${uid}/moodEntries`, token)
  return (data?.documents || []).map(doc => fromFsFields(doc.fields || {}))
}

export async function saveUserMoodEntryREST(uid, entry, token) {
  await fsPatch(`users/${uid}/moodEntries/${entry.id}`, Object.fromEntries(Object.entries(entry).map(([k, v]) => [k, toFsVal(v)])), token)
}

export async function deleteUserMoodEntryREST(uid, entryId, token) {
  await fsDelete(`users/${uid}/moodEntries/${entryId}`, token)
}

export async function fetchUserCustomActivitiesREST(uid, token) {
  const data = await fsGet(`users/${uid}/settings/activities`, token)
  if (!data?.fields) return { custom: [], deleted: [] }
  return fromFsFields(data.fields)
}

export async function saveUserCustomActivitiesREST(uid, activities, token) {
  await fsPatch(`users/${uid}/settings/activities`, Object.fromEntries(Object.entries(activities).map(([k, v]) => [k, toFsVal(v)])), token)
}

export async function batchSaveUserMoodEntriesREST(uid, entries, token) {
  await Promise.all(entries.map(entry => saveUserMoodEntryREST(uid, entry, token)))
}
