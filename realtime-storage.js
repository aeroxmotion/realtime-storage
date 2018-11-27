(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = rs;

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/**
 * Used internally to store proxy info
 *
 * @type {symbol}
 * @private
 */
var __entry__ = Symbol('RS.__entry__');
/**
 * Default options
 *
 * @enum {*}
 * @private
 */


var defaults = {
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
  preserve: true,

  /**
   * Serialize entry object on each write
   *
   * @type {Function}
   */
  serializer: function serializer(entryObject) {
    return JSON.stringify(entryObject);
  },

  /**
   * Deserialize entry string
   *
   * @type {Function}
   */
  deserializer: function deserializer(entryString) {
    return JSON.parse(entryString);
  }
};
/**
 * Locks removing/writing to avoid inconsistencies
 *
 * @type {boolean}
 * @private
 */

var __writing__ = false;
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

function rs(options) {
  var entry = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  // Support name as first argument
  if (typeof options === 'string') {
    options = {
      name: options
    };
  }

  var _Object$assign = Object.assign({}, defaults, options),
      name = _Object$assign.name,
      sync = _Object$assign.sync,
      storage = _Object$assign.storage,
      preserve = _Object$assign.preserve,
      deserializer = _Object$assign.deserializer,
      serializer = _Object$assign.serializer;

  var _storage = getStorage(storage);

  if (!_storage) {
    throw new Error("unknown storage '".concat(storage, "'. Consider using 'local' or 'session' as possible options"));
  }

  if (!isObject(entry)) {
    throw new Error('entry option must be an object or array');
  }

  if (!name) {
    throw new Error('you must specify an entry name');
  }

  var _entry = preserve ? entry : deserializer(_storage.getItem(name));

  var write = sync ? function () {
    return syncWrite(_storage, name, _entry, serializer);
  } : function () {
    return asyncWrite(_storage, name, _entry, serializer);
  };

  if (!_entry) {
    _entry = entry;
    write();
  }

  return getRevocableWriter(_entry, write, {
    name: name,
    storage: storage
  });
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


rs.session = function sessionRs(name, entry) {
  return rs({
    name: name,
    storage: 'session'
  }, entry);
};
/**
 * Remove realtime entry from storage
 *
 * @param {Proxy} entry
 *
 * @return void
 *
 * @api public
 */


rs.remove = function removeRs(entry) {
  if (!isObject(entry) || !entry[__entry__]) {
    throw new Error('the given value is not a valid entry');
  } // Perform entry removing in a sync/async way


  removeEntry(entry);
};

function syncWrite(storage, name, entry, serializer) {
  storage.setItem(name, serializer(entry));
}

function asyncWrite(storage, name, entry, serializer) {
  if (__writing__) return;
  __writing__ = true;
  setTimeout(function () {
    syncWrite(storage, name, entry, serializer);
    __writing__ = false;
  });
}

function removeEntry(entry) {
  if (__writing__) {
    // Re-schedule remove... Wait until writing has completed
    return setTimeout(removeEntry, 0, entry);
  }

  var desc = entry[__entry__];
  getStorage(desc.storage).removeItem(desc.name);
  desc.revoke();
}

function getRevocableWriter(value, write, info) {
  var _arr = Object.keys(value);

  for (var _i = 0; _i < _arr.length; _i++) {
    var key = _arr[_i];

    if (canProxify(key, value[key])) {
      value[key] = getRevocableWriter(value[key], write, info);
    }
  }

  var _Proxy$revocable = Proxy.revocable(value, {
    defineProperty: function defineProperty(target, property, descriptor) {
      var _value = descriptor.value;

      if (canProxify(property, _value)) {
        descriptor.value = getRevocableWriter(_value, write, info);
      }

      var defined = Reflect.defineProperty(target, property, descriptor);
      if (canWrite(property, defined)) write();
      return defined;
    },
    deleteProperty: function deleteProperty(target, property) {
      var _value = target[property];
      var deleted = Reflect.deleteProperty(target, property);

      if (canProxify(property, _value)) {
        _value[__entry__].revoke();
      }

      if (canWrite(property, deleted)) write();
      return deleted;
    }
  }),
      proxy = _Proxy$revocable.proxy,
      _revoke = _Proxy$revocable.revoke;

  value[__entry__] = {
    name: info.name,
    storage: info.storage,
    revoke: function revoke() {
      _revoke();

      delete value[__entry__];

      var _arr2 = Object.keys(value);

      for (var _i2 = 0; _i2 < _arr2.length; _i2++) {
        var key = _arr2[_i2];
        var _value = value[key];

        if (canProxify(key, _value)) {
          _value[__entry__].revoke();
        }
      }
    }
  };
  return proxy;
}

function getStorage(name) {
  return window["".concat(name, "Storage")];
}

function canProxify(key, value) {
  return !isSymbol(key) && isObject(value);
}

function canWrite(key, changed) {
  return changed && !isSymbol(key);
}

function isSymbol(value) {
  return _typeof(value) === 'symbol';
}

function isObject(value) {
  return value !== null && _typeof(value) === 'object';
}

},{}]},{},[1]);
