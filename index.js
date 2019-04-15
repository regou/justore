'use strict'
const immer = require('immer')
const produce = immer.default

const { Subject } = require('rxjs')

const {debounceTime, filter, takeWhile, map, share, mergeMap, groupBy, startWith} = require('rxjs/operators')

const _set = require('lodash.set')
const _get = require('lodash.get')

const utils = require('./utils')
const getMainKey = utils.getMainKey
const splitLastKey = utils.splitLastKey

function Justore (initData, storeName) {
  let self = this
  self.name = storeName || 'Anonymous Store'
  self.debugOn = []

  self.bufferWrite = true

  function isIndebug (key) {
    return self.debugOn && self.debugOn.indexOf && self.debugOn.indexOf(key) >= 0
  }

  self.onError = function () {}

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
  function batchSetter (manipulateFunction) {
    let newData = produce(data, manipulateFunction)
    updatePreviousData()
    data = newData
    return {newData: data, previousData: previousData}
  }

  function dataDeleter (path) {
    let newData = produce(data, function (draft) {
      let pathPair = splitLastKey(path)
      if (pathPair[1]) {
        delete _get(draft, pathPair[1])[pathPair[0]]
      } else {
        delete draft[pathPair[0]]
      }
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

  this.delete = function (updatePath, opt) {
    let conf = {
      key: getMainKey(updatePath),
      path: updatePath,
      opt: opt || {}
    }
    if (isIndebug(conf.key)) { debugger }
    let updateResult = dataDeleter(conf.path)
    conf.newData = updateResult.newData
    conf.previousData = updateResult.previousData
    self.writeSubject.next(conf)
    return self
  }

  this.batchWrite = function (updatePaths, manipulateFunction, opt) {
    let updateResult = batchSetter(manipulateFunction)
    let paths = (updatePaths || [])
    if (!Array.isArray(paths)) {
      throw TypeError('updatePaths should be an Array of update paths')
    }
    paths.forEach(function (updatePath) {
      let conf = {
        key: getMainKey(updatePath),
        path: updatePath,
        d: _get(updateResult.newData, updatePath),
        opt: opt || {}
      }
      conf.newData = updateResult.newData
      conf.previousData = updateResult.previousData
      self.writeSubject.next(conf)
    })
    return self
  }

  function onReject (reson) {
    self.onError(reson)
    console.warn('Justore write ' + self.name + ' Error: ', reson)
  }

  this.writing$ = this.writeSubject
    .pipe(
      groupBy(function (conf) { return conf.path }),
      mergeMap(function (g) {
        var ob = self.bufferWrite ? g.pipe(debounceTime(0)) : g
        return ob
      }),
      share()
    )

  this.writing$.subscribe(function (info) {
    updatePreviousData()
    return info
  }, onReject)

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
   * @param {Function} [onchange] - onNextHandler
   * @param {Boolean} [immediate] - use 'startWith' operator
   * @return {Subscription} subscription - subscription
   */
  self.sub = function (path, onchange, immediate) {
    var stream = self.writing$
      .pipe(
        takeWhile(function (info) {
          let keyPairs = splitLastKey(path)
          const inData = function (d, pairs) { return pairs[1] ? pairs[0] in (_get(d, pairs[1]) || {}) : pairs[0] in d }

          // Must from have -> don't have
          if (inData(info.newData, keyPairs)) {
            return true
          } else if (inData(info.previousData, keyPairs)) {
            return false
          } else {
            return true
          }
        }),
        filter(function (info) {
          if (info.opt.mute) {
            return false
          }
          return _get(info.newData, path) !== _get(info.previousData, path)
        })
      )

    function genPair (info) {
      return [_get(info.newData, path), _get(info.previousData, path)]
    }

    if (immediate) {
      stream = stream
        .pipe(
          map(genPair),
          startWith(
            [dataGetter(path), dataGetter(path, true)]
          )
        )
    } else {
      stream = stream
        .pipe(map(genPair))
    }

    if (onchange) {
      let subscription = stream
        .subscribe(function (arg) {
          onchange.apply(self, arg)
        }, onReject)

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
