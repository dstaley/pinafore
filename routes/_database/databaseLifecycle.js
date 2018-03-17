import {
  META_STORE,
  STATUS_TIMELINES_STORE,
  STATUSES_STORE,
  ACCOUNTS_STORE,
  RELATIONSHIPS_STORE,
  NOTIFICATIONS_STORE,
  NOTIFICATION_TIMELINES_STORE,
  PINNED_STATUSES_STORE,
  TIMESTAMP,
  REBLOG_ID,
  THREADS_STORE,
  STATUS_ID
} from './constants'

import forEach from 'lodash/forEach'

const openReqs = {}
const databaseCache = {}

const DB_VERSION = 8

export function getDatabase (instanceName) {
  if (!instanceName) {
    throw new Error('instanceName is undefined in getDatabase()')
  }
  if (databaseCache[instanceName]) {
    return Promise.resolve(databaseCache[instanceName])
  }

  databaseCache[instanceName] = new Promise((resolve, reject) => {
    let req = indexedDB.open(instanceName, DB_VERSION)
    openReqs[instanceName] = req
    req.onerror = reject
    req.onblocked = () => {
      console.log('idb blocked')
    }
    req.onupgradeneeded = (e) => {
      let db = req.result

      function createObjectStore (name, init, indexes) {
        let store = init
          ? db.createObjectStore(name, init)
          : db.createObjectStore(name)
        if (indexes) {
          forEach(indexes, (indexValue, indexKey) => {
            store.createIndex(indexKey, indexValue)
          })
        }
      }

      if (e.oldVersion < 7) {
        createObjectStore(STATUSES_STORE, {keyPath: 'id'}, {
          [TIMESTAMP]: TIMESTAMP,
          [REBLOG_ID]: REBLOG_ID
        })
        createObjectStore(STATUS_TIMELINES_STORE, null, {
          'statusId': ''
        })
        createObjectStore(NOTIFICATIONS_STORE, {keyPath: 'id'}, {
          [TIMESTAMP]: TIMESTAMP,
          [STATUS_ID]: STATUS_ID
        })
        createObjectStore(NOTIFICATION_TIMELINES_STORE, null, {
          'notificationId': ''
        })
        createObjectStore(ACCOUNTS_STORE, {keyPath: 'id'}, {
          [TIMESTAMP]: TIMESTAMP
        })
        createObjectStore(RELATIONSHIPS_STORE, {keyPath: 'id'}, {
          [TIMESTAMP]: TIMESTAMP
        })
        createObjectStore(THREADS_STORE, null, {
          'statusId': ''
        })
        createObjectStore(PINNED_STATUSES_STORE, null, {
          'statusId': ''
        })
        createObjectStore(META_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
  })
  return databaseCache[instanceName]
}

export async function dbPromise (db, storeName, readOnlyOrReadWrite, cb) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, readOnlyOrReadWrite)
    let store = typeof storeName === 'string'
      ? tx.objectStore(storeName)
      : storeName.map(name => tx.objectStore(name))
    let res
    cb(store, (result) => {
      res = result
    })

    tx.oncomplete = () => resolve(res)
    tx.onerror = () => reject(tx.error)
  })
}

export function deleteDatabase (instanceName) {
  return new Promise((resolve, reject) => {
    // close any open requests
    let openReq = openReqs[instanceName]
    if (openReq && openReq.result) {
      openReq.result.close()
    }
    delete openReqs[instanceName]
    delete databaseCache[instanceName]
    let req = indexedDB.deleteDatabase(instanceName)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}
