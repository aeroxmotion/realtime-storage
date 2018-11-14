/**
 * Used internally to store proxy info
 *
 * @type {symbol}
 * @private
 */
const __entry__ = Symbol('RS.__entry__')

/**
 * Default options
 *
 * @enum {*}
 * @private
 */
const defaults = {

  /**
   * Storage entry name
   *
   * @type {string}
   */
  name: '',

  /**
   * Synchoronous writes
   *
   * @type {boolean}
   */
  sync: false,

  /**
   * Storage type
   *
   * @type {string}
   */
  storage: 'local',

  /**
   * Whether to preserve passed entry instead of stored entry
   *
   * @type {boolean}
   */
  preserve: false,

  /**
   * Serialize entry object on each write
   *
   * @type {Function}
   */
  serializer (entryObject) {
    return JSON.stringify(entryObject)
  },

  /**
   * Deserialize entry string
   *
   * @type {Function}
   */
  deserializer (entryString) {
    return JSON.parse(entryString)
  }
}

/**
 * Creates a new realtime entry
 *
 * @param {string|Object} options
 * @param {Array|Object} entry
 *
 * @return {Proxy}
 *
 * @api public
 */
export default function rs (options, entry = {}) {

  // Support name as first argument
  if (typeof options === 'string') {
    options = { name: options }
  }

  const {
    name,
    sync,
    storage,
    preserve,
    deserializer,
    serializer
  } = Object.assign({}, defaults, options)

  const _storage = getStorage(storage)

  if (!_storage) {
    throw new Error(`unknown storage '${storage}'. Consider using 'local' or 'session' as possible options`)
  }

  if (!isObject(entry)) {
    throw new Error('entry option must be an object or array')
  }

  if (!name) {
    throw new Error('you must specify an entry name')
  }

  let _entry = preserve ? entry : deserializer(_storage.getItem(name))

  const write = sync
    ? () => syncWrite(_storage, name, _entry, serializer)
    : () => asyncWrite(_storage, name, _entry, serializer)

  if (!_entry) {
    _entry = entry
    write()
  }

  return getRevocableWriter(_entry, write, { name, storage })
}

/**
 * Just an alias for rs({ name, storage: 'session', ... }, entry)
 *
 * @param {string} name
 * @param {Array|Object} entry
 *
 * @return {Proxy}
 *
 * @api public
 */
rs.session = function sessionRs (name, entry) {
  return rs({ name, storage: 'session' }, entry)
}

/**
 * Remove realtime entry from storage
 *
 * @param {Proxy} entry
 *
 * @return void
 *
 * @api public
 */
rs.remove = function removeRs (entry) {
  if (!isObject(entry) || !entry[__entry__]) {
    throw new Error('the given value is not a valid entry')
  }

  const desc = entry[__entry__]

  getStorage(desc.storage).removeItem(desc.name)

  desc.revoke()
}

function syncWrite (storage, name, entry, serializer) {
  storage.setItem(name, serializer(entry))
}

function asyncWrite (storage, name, entry, serializer) {
  if (asyncWrite.writting) return

  asyncWrite.writting = true

  setTimeout(() => {
    syncWrite(storage, name, entry, serializer)

    asyncWrite.writting = false
  })
}

function getRevocableWriter (value, write, info) {
  for (const key of Object.keys(value)) {
    if (canProxify(key, value[key])) {
      value[key] = getRevocableWriter(value[key], write, info)
    }
  }

  const { proxy, revoke } = Proxy.revocable(value, {
    defineProperty (target, property, descriptor) {
      const { value: _value } = descriptor

      if (canProxify(property, _value)) {
        descriptor.value = getRevocableWriter(_value, write, info)
      }

      const defined = Reflect.defineProperty(target, property, descriptor)

      if (canWrite(property, defined)) write()

      return defined
    },

    deleteProperty (target, property) {
      const _value = target[property]
      const deleted = Reflect.deleteProperty(target, property)

      if (canProxify(property, _value)) {
        _value[__entry__].revoke()
      }

      if (canWrite(property, deleted)) write()

      return deleted
    }
  })

  value[__entry__] = {
    name: info.name,
    storage: info.storage,
    revoke () {
      revoke()
      delete value[__entry__]

      for (const key of Object.keys(value)) {
        const _value = value[key]

        if (canProxify(key, _value)) {
          _value[__entry__].revoke()
        }
      }
    }
  }

  return proxy
}

function getStorage (name) {
  return window[`${name}Storage`]
}

function canProxify (key, value) {
  return !isSymbol(key) && isObject(value)
}

function canWrite (key, changed) {
  return changed && !isSymbol(key)
}

function isSymbol (value) {
  return typeof value === 'symbol'
}

function isObject (value) {
  return value !== null && typeof value === 'object'
}
