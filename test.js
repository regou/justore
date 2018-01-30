'use strict';
var should = require('should/as-function');
var Justore = require('./index.js');
const Subject = require('rxjs/Subject').Subject

describe('Justore', function () {
  var store = new Justore({}, 'teststore');

  it('Creates an empty store', function () {
    should(store).have.property('write');
    should(store).have.property('sub')
    should(store).have.property('name', 'teststore');
  });

  it('Can write some data', function () {
    store.write('name', 'wx');
    should(store.read('name')).be.exactly('wx');
  });

  it('Write is sync', function () {
    var store = new Justore({
      val: 'aa'
    }, 'sync test');

    should(store.read('val')).be.exactly('aa');

    store.write('val', 'bb');
    should(store.read('val')).be.exactly('bb');

    store.write('val', 'cc');
    should(store.read('val')).be.exactly('cc');

    store.write('val', 'dd');
    should(store.read('val')).be.exactly('dd');
  });


  it('Bach writing', function (done) {
    var store = new Justore({
      val: 'aa'
    });

    let results = [];
    store.sub('val', function (newData, prevData) {
      results.push(newData)
    });

    setTimeout(function () {
      should(results).deepEqual(['dd']);
      done()
    },50)

    store.write('val', 'bb')
      .write('val', 'cc')
      .write('val', 'dd');

    should(store.read('val')).be.exactly('dd');
  });


  it('Multi writing', function (done) {
    var store = new Justore({
      ww: 'aa',
      val2:'',
      val4:{a:11}
    });

    let results = [];
    store.sub('ww', function (newData, prevData) {
      results.push(newData)
    });

    store.sub('val2', function (newData, prevData) {
      results.push(newData)
    });

    store.sub('val4', function (newData, prevData) {
      results.push(newData)
    });

    setTimeout(function () {
      should(results).deepEqual(['cc',{a:12},'re']);
      done()
    },50)

    store.write('ww', 'bb')
      .write('ww', 'cc')
      .write('val2', 'dd')
      .write('val4.a', 12)
      .write('val2', 're');

  });



  it('Can get previous data', function (done) {
    store.write('historyTest', 'wow');

    setTimeout(function () {
      store.sub('historyTest', function (newData, prevData) {
        should(prevData).be.exactly('wow');
        should(newData).be.exactly('starcraft');
        done();
      });
      store.write('historyTest', 'starcraft');
    }, 100);
  });

  it('Array is ok', function (done) {
    var store = new Justore({
      val: ['aa']
    }, 'arr test');

    store.write('val', ['aa', 'bb']);
    store.sub('val.1', function (val) {
      should(val).be.exactly('bb')
      done()
    });
  });

  it('Can delete root', function (done) {
    var store = new Justore({
      val: {
        file:'15.5',
        local:{
          en:'111'
        }
      }
    }, 'delete');

    store.sub('val', function (val) {
      should(val).deepEqual({
        local:{
          en:'111'
        }
      });
      done();
    });
    store.delete('val.file');

  });


  it('Can auto unsub when key deleted', function (done) {
    var store = new Justore({
      val: {
        cc:'12'
      }
    }, 'auto unsub');

    store.sub('val.cc', function (val) {
      done(new Error('should not trigger'))
    });
    store.write('val',{a:11});
    setTimeout(function () {
      done()
    },200)
  });


  it('Can create mixin', function () {
    var mixin = store.createReactMixin('d');
    should(mixin).have.properties(['componentWillMount', 'componentWillUnmount']);
  });

  it('No call loop', function (done) {
    var store = new Justore({
      vis: false,
      dom: null
    }, 'loopstore');

    store.sub('vis', function () {
      store.write('dom', 11);
      should(store.read('dom')).be.exactly(11)
      done();
    });

    store.write('vis', true);
  });

  it('Can report', function () {
    var store = new Justore({
      target: {name: 'wx', bol: true}
    }, 'report store');

    should(store.report()).deepEqual({
      target: {name: 'wx', bol: true}
    });
  });

  it('Use original stream', function (done) {
    var store = new Justore({
      val: {
        cc:'12'
      }
    });

    store.write('val',{cc:14});

    let stream = store.sub('val.cc');
    stream.subscribe(function (valuePair) {
        should(valuePair[0]).be.exactly(14);
        should(stream).be.instanceof(Subject)
        done()
      })
  });



});
