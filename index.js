'use strict'
const immer = require('immer')
const produce = immer.default

const Subject = require('rxjs/Subject').Subject
require('rxjs/add/operator/debounceTime')
require('rxjs/add/operator/filter')
require('rxjs/add/operator/do')
require('rxjs/add/operator/map')
require('rxjs/add/operator/share')

require('rxjs/add/operator/startWith')

const _set = require('lodash.set')
const _get = require('lodash.get')

function Justore (initData, storeName) {
  var self = this
  self.name = storeName || 'Anonymous Store'
  self.debugOn = new Set()
  function isIndebug (key) {
    return self.debugOn.has(key)
  }

  /** @protected */
  self._getErrorMsg = function (msg) {
    return '[Store ' + self.name + '] ' + msg
  }

  var data = initData || {}
  var previousData = data

  function dataSetter (path, payload) {
    let newData = produce(data, function (draft) {
      _set(draft, path, payload)
    })
    updatePreviousData()
    data = newData
    return {newData: data, previousData: previousData}
  }

  function dataGetter (path, isPre) {
    var source = isPre ? previousData : data
    return _get(source, path)
  }

  function updatePreviousData () {
    previousData = data
  }

  /** @protected */
  this.writeSubject = new Subject()

  function getMainKey (updatePath) {
    return typeof updatePath === 'string' ? updatePath.split('.')[0] : ''
  }

  /**
   * Write data to the store, return store
   * @param {String} updatePath - Update path
   * @param {Object} value - The value
   * @param {Object} [opt] - Options
   * @param {Boolean} [opt.mute=false] - Mute the change events
   * @return {Object} self - Justore instance
   * */
  this.write = function (updatePath, value, opt) {
    let conf = {
      key: getMainKey(updatePath),
      path: updatePath,
      d: value,
      opt: opt || {}
    }

    if (isIndebug(conf.key)) { debugger }
    let updateResult = dataSetter(conf.path, conf.d)
    conf.newData = updateResult.newData
    conf.previousData = updateResult.previousData
    self.writeSubject.next(conf)
    return self
  }

  function triggerReject (reson) {
    console.warn('Justore write ' + self.name + ' Error: ', reson)
  }

  this.writing$ = this.writeSubject
    .debounceTime(0)
    .share()

  this.writing$.subscribe(function (info) {
    updatePreviousData()
    return info
  }, triggerReject)


  /**
   * Read the value from store
   * @param {String} key - Store key
   */
  self.read = function (key) {
    return key === '*' ? data : dataGetter(key)
  }


  /**
   * Subscribe to the writing$
   * @param {String} path - Subscribe update path
   * @param {Function} callback - onNextHandler
   * @param {Boolean} immediate - use 'startWith' operator
   * @return {Subscription} subscription - subscription
   */
  self.sub = function (path, callback, immediate) {
    var stream = self.writing$
      .filter(function (info) {
        if (info.opt.mute) {
          return false
        }
        return _get(info.newData, path) !== _get(info.previousData, path)
      })

    function genPair (info) {
      return [_get(info.newData, path), _get(info.previousData, path)]
    }

    if (immediate) {
      stream = stream.startWith(
        [dataGetter(path), dataGetter(path, true)]
      )
    } else {
      stream = stream
        .map(genPair)
    }

    if (callback) {
      let subscription = stream
        .subscribe(function (arg) {
          callback.apply(self, arg)
        }, triggerReject)

      return subscription
    } else {
      return stream
    }
  }

};

Justore.prototype.createReactMixin = function (key) {
  var self = this
  let subscriptions
  return {
    componentWillMount: function () {
      subscriptions = self.sub(key, this.onStoreChange)
    },
    componentWillUnmount: function () {
      if (subscriptions && subscriptions.unsubscribe) {
        subscriptions.unsubscribe()
      }
    }
  }
}

Justore.prototype.report = function () {
  return this.read('*')
}


module.exports = Justore
