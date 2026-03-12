import { db } from './firebaseConfig'
import { collection, doc, setDoc, deleteDoc, getDocs, getDoc, writeBatch } from 'firebase/firestore'

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

// Overwrites all entries at once — used by importData (max 500 per batch)
export async function batchSaveUserMoodEntries(uid, entries) {
  const batch = writeBatch(db)
  entries.forEach(entry => batch.set(entryDoc(uid, entry.id), entry))
  await batch.commit()
}
