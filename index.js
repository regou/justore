'use strict'
var Immutable = require('immutable')
var EventEmitter = require('eventemitter3')
var clone = require('lodash.clone')

var nextTick = require('next-tick')

// var Rx = require('rxjs/Rx');
// var Observable = require('rxjs/Observable').Observable;
var Subject = require('rxjs/Subject').Subject
require('rxjs/add/operator/groupBy')
require('rxjs/add/operator/debounceTime')
require('rxjs/add/operator/filter')
require('rxjs/add/operator/do')
require('rxjs/add/operator/map')
require('rxjs/add/operator/share')
require('rxjs/add/operator/mergeMap')
require('rxjs/add/operator/startWith')

var u = require('updeep')

function Justore (initData, storeName) {
  var self = this
  self.name = storeName || 'Anonymous Store'
  self.debugOn = []
  function isIndebug (key) {
    return self.debugOn && self.debugOn.indexOf && self.debugOn.indexOf(key) >= 0
  }

  /** @protected */
  self._getErrorMsg = function (msg) {
    return '[Store ' + self.name + '] ' + msg
  }

  self.asyncEvents = false
  self.bufferWrite = true

  var data = Immutable.Map(initData || {})
  var previousData = data
  function dataSetter (key, val) {
    if (key === '*') {
      if (Immutable.Map.isMap(val)) {
        data = val
      } else {
        throw new TypeError(self._getErrorMsg('* setter must be a ImmutableJS Map'))
      }
    } else {
      data = data.set(key, val)
    }
    return data
  }

  function dataGetter (key) {
    if (key === undefined || key === '*') {
      return data
    } else {
      return data.get(key)
    }
  }

  function emit () {
    var args = arguments
    if (self.asyncEvents) {
      nextTick(function () {
        self.change.emit.apply(self.change, args)
      })
    } else {
      self.change.emit.apply(self.change, args)
    }
  }

  function triggerChange (forceTriggerKey) {
    var changed = []
    data.forEach(function (itemData, key) {
      var prevItemData = previousData.get(key)
      if (forceTriggerKey === key || itemData !== prevItemData) {
        if (isIndebug(key)) { debugger }
        emit(key, itemData, prevItemData)
        changed.push(key)
      }
    })
    if (changed.length) {
      emit('*', changed)
    }
  }

  function updatePreviousData () {
    previousData = data
  }

  /** @protected */
  this.writeSubject = new Subject()

  /**
   * Write data to the store, return store
   * @param {String} key - Store key
   * @param {Object} value - The value
   * @param {Object} [opt] - Options
   * @param {Boolean} [opt.mute=false] - Mute the change events
   * @return {Object} self - Justore instance
   * */
  this.write = function (key, value, opt) {
    var conf = {key: key, d: value, opt: opt || {}}
    if (isIndebug(key)) { debugger }
    dataSetter(conf.key, conf.d)
    self.writeSubject.next(conf)
    return self
  }

  function triggerReject (reson) {
    emit('Error:', reson)
    console.warn('Justore write ' + self.name + ' Error: ', reson)
  }

  this.writing$ = this.writeSubject
    .groupBy(function (val) { return val.key })
    .mergeMap(function (g) {
      var ob = g
        .filter(function (conf) {
          if (conf.key === '*') {
            return true
          }
          var itemData = conf.d
          var prevItemData = previousData.get(conf.key)
          return itemData !== prevItemData
        })
      ob = self.bufferWrite ? ob.debounceTime(0) : ob

      return ob
    })
    .do(function (conf) {
      if (!conf.opt.mute) { triggerChange(conf.key) }

      updatePreviousData()
    })
    .share()

  this.writing$.subscribe(function (conf) {
    return conf
  }, triggerReject)

  /**
   * Manually trigger a change event
   * @param {String} key - Store key
   */
  self.trigger = function (key) {
    triggerChange(key)
  }

  /**
   * Read the value from store
   * @param {String} key - Store key
   */
  self.read = function (key) {
    return dataGetter(key)
  }

  /**
   * Subscribe to the writing$
   * @param {String} key - Store key
   * @param {Function} callback - onNextHandler
   * @param {Boolean} immediate - use 'startWith' operator
   * @return {Subscription} subscription - subscription
   */
  self.sub = function (key, callback, immediate) {
    var subscription = self.writing$
      .filter(function (conf) {
        if (key === '*') {
          return true
        }
        return conf.opt.mute ? false : conf.key === key
      })

    if (immediate) {
      subscription = subscription.startWith(key)
    }

    subscription = subscription
      .map(function () { return dataGetter(key) })
      .subscribe(callback)

    return subscription
  }

  /**
   * Read the cloned value from store
   * @param {String} key - Store key
   */
  self.readAsClone = function (key, isDeep) {
    if (typeof (isDeep) === 'boolean') {
      console.warn('isDeep is deprecated')
    }

    var ret = self.read(key)
    if (!Immutable.Iterable.isIterable(ret)) {
      ret = clone(ret)
    }
    return ret
  }

  /**
   * Update by object schema
   * @param {Object|String} updeepSchema
   * @param {Object|String} [val] - Update value
   * @see {@link https://github.com/substantial/updeep|Updeep}
   */
  self.update = function (updeepSchema) {
    function safetyRead (key) {
      var oriData = data.get(key)
      if (Immutable.Iterable.isIterable(oriData)) {
        throw TypeError(self._getErrorMsg('Not support update Immutablejs Iterables, plain objects&arrays only.'))
      } else {
        return oriData
      }
    }

    var val = arguments[1]
    if (typeof updeepSchema === 'string') {
      ;(function () {
        var path = updeepSchema.split('.')
        var key = path[0]
        var newVal = u.updateIn(path.slice(1, path.length), val, safetyRead(key))
        self.write(key, newVal)
      })()
    } else if (typeof updeepSchema === 'object') {
      ;(function () {
        var keys = Object.keys(updeepSchema)
        keys.forEach(function (key) {
          var newVal = u(updeepSchema[key], safetyRead(key))
          self.write(key, newVal)
        })
      })()
    }

    return self
  }

  /**
   * The event emitter of the store
   * @see {@link https://github.com/primus/EventEmitter3|EventEmitter3}
   */
  self.change = new EventEmitter()
};

Justore.prototype.createReactMixin = function (key) {
  var self = this
  return {
    componentWillMount: function () {
      var comp = this
      self.change.on(key, comp.onStoreChange)
    },
    componentWillUnmount: function () {
      var comp = this
      self.change.removeListener(key, comp.onStoreChange)
    }
  }
}

Justore.prototype.report = function () {
  return this.read('*').toJS()
}

Justore.Immutable = Immutable

Justore.u = u

module.exports = Justore
