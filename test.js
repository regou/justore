'use strict';
var should = require('should/as-function');
var Justore = require('./index.js');
var EventEmitter = require('eventemitter3');
var Immutable = require('immutable');

function validateStore (store, d) {
  should(store.read('*').toJS()).deepEqual(d);
}

function allDone(callback,num) {
  let pms = [];
  let calls = []
  for (let i=0;i<num;i++){
    pms.push(
      new Promise((res,rej)=>{
        calls.push((o)=> o instanceof Error ? rej(o) : res(o) );
      })
    )
  }
  callback(...calls);
  return Promise.all(pms)
}

describe('Justore', function () {
  var store = new Justore({}, 'teststore');
  store.bufferWrite = false;

  it('eventemitter3 working', function (done) {
    var ee = new EventEmitter();

    ee.on('hi', function () {
      done();
    });
    ee.emit('hi');
  });

  it('Creates an empty store', function () {
    should(store).have.property('write');
    should(store).have.property('change');
    should(store.read('*')).have.property('size', 0);
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

  it('Can buffer write 1', function (done) {
    var store = new Justore({
      name: 'wx'
    }, 'buffered store');
    var results = [];
    store.change.on('name', function (val) {
      results.push(val)
    })

    store.write('name', 'wx');
    store.write('name', 'wx');
    store.write('name', 'wx');
    store.write('name', '22');
    store.write('name', 'wx');
    store.write('name', '22');

    setTimeout(function () {
      should(store.read('name')).be.exactly('22');
      should(results).deepEqual(['22']);
      done()
    }, 50)
  });

  it('Can buffer write 2', function (done) {
    var store = new Justore({
      name: 'wx'
    }, 'buffered store');
    var results = [];
    store.change.on('name', function (val) {
      results.push(val)
    })

    store.write('name', 'wx');
    store.write('name', 'wx');
    store.write('name', 'wx');
    store.write('name', '22');
    store.write('name', 'wx');
    store.write('name', '22');
    setTimeout(() => store.write('name', 'qq'), 0);

    setTimeout(function () {
      should(store.read('name')).be.exactly('qq');
      should(results).deepEqual(['22', 'qq']);
      done()
    }, 50)
  });

  it('Can get previous data', function (done) {
    store.write('historyTest', 'wow');

    setTimeout(function () {
      store.change.on('historyTest', function (newData, prevData) {
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
    store.change.on('val', function (arr) {
      should(arr).deepEqual(['aa', 'bb']);
      done()
    });
  });

  it('Trigger events working', function (done) {
    var store3 = new Justore({age: 3}, 'store3');
    store3.change.on('age', function (data) {
      var age = store3.read('age');
      should(age).be.exactly(3);
      should(age).be.exactly(data);
      done();
    });

    store3.trigger('age');
  });

  it('Event "*" working', function (done) {
    var store2 = new Justore({}, 'teststore2');
    var activeKeys = new Set();
    var called = false;
    store2.change.on('*', function (keys) {
      should(keys).be.instanceof(Array);
      // should(keys.indexOf('Fire')>=0 || keys.indexOf('Water')>=0).be.exactly(true);

      keys.forEach(function (key) {
        var tar = store2.read(key);
        if (key === 'Fire') {
          should(tar).be.exactly(1);
        } else {
          should(tar).be.exactly(2);
        }
        activeKeys.add(key)
      })

      if (activeKeys.has('Fire') && activeKeys.has('Water') && !called) {
        done();
        called = true
      }
    });

    store2.write('Fire', 1);
    store2.write('Water', 2);
  });

  it('Trigger events working with js mutable data', function (done) {
    store.change.on('arr', function (data) {
      var compareable = [1, 3, 5, 7, 9];
      var arr = store.read('arr');
      should(arr).deepEqual(compareable);
      should(arr).be.exactly(data);
      done();
    });

    store.write('arr', [1, 3, 5, 7, 9]);
  });

  it('Can clone read', function () {
    var d = [1, 3, 5, 7, 9];

    store.write('d', d);

    var temp = store.readAsClone('d');
    temp.push(88);

    should(temp).deepEqual([1, 3, 5, 7, 9, 88]);
    should(d).deepEqual([1, 3, 5, 7, 9]);
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
    store.asyncEvents = true;
    store.change.on('vis', function () {
      store.write('dom', 11);
      done();
    });

    store.write('vis', true);
  });

  it('Can read all data', function () {
    var store = new Justore({
      vis: false,
      dom: null
    }, 'allteststore');
    var allData = store.read('*');

    var bol = allData.equals(Immutable.Map({
      vis: false,
      dom: null
    }));

    should(bol).be.exactly(true);
  });

  it('Can write all data', function (done) {
    var store = new Justore({
      vis: false,
      dom: null
    }, 'allteststore2');
    var allData = store.read('*');

    store.change.on('*', function (changedKeys) {
      validate();
      should(changedKeys).deepEqual(['vis']);
      done();
    });
    store.write('*', allData.set('vis', true));

    function validate () {
      var bol = store.read('*').equals(Immutable.Map({
        vis: true,
        dom: null
      }));
      should(bol).be.exactly(true);
    };
  });

  it('Can update data by string schema', function (done) {
    var store = new Justore({
      scoreboard: {
        scores: {
          team1: 0,
          team2: 0
        }
      }
    }, 'updatestore1');

    store.change.on('scoreboard', function (newVal) {
      should(newVal).be.exactly(store.read('scoreboard'));
      should(newVal).deepEqual({
        scores: {
          team1: 2,
          team2: 0
        }
      });

      validateStore(store, {
        scoreboard: {
          scores: {
            team1: 2,
            team2: 0
          }
        }
      });
      done();
    });

    store.update('scoreboard.scores.team1', 2);
  });

  it('Can update data by object schema', function (done) {
    var store = new Justore({
      scoreboard: {
        scores: {
          team1: 0,
          team2: [15]
        }
      }
    }, 'updatestore2');

    var times = 0;
    store.change.on('*', function (keys){
      times++;
      if (times === 2) {
        validateStore(store, {
          total: 2,
          scoreboard: {
            scores: {
              team1: 2,
              team2: [15]
            }
          }
        });
        done();
      }
    });

    store.update({
      total: 2,
      scoreboard: {
        scores: {
          team1: 2
        }
      }
    });
  });

  it('Can update array by object schema', function (done) {
    var store = new Justore({
      todos: [{text: 'a', done: false}, {text: 'b', done: false}]
    }, 'updatestore3');

    store.change.on('*', function (keys) {
      validateStore(store, {
        todos: [{text: 'a', done: false}, {text: 'b', done: true}]
      });
      done();
    });

    store.update({todos: {1: {done: true}}});
  });

  it('Can buffer update', function (done) {
    var store = new Justore({
      target: {name: 'wx', bol: true}
    }, 'update buffered store');
    var results = [];
    store.change.on('target', function (val) {
      results.push(val.name);
    })

    store.update('target.name', 'wx');
    store.update('target.name', 'wx');
    store.update('target.name', 'wx');
    store.update('target.name', '22');
    store.update('target.name', 'wx');
    store.update('target.bol', false);
    store.update('target.name', '22');
    setTimeout(() => store.update('target.name', 'qq'), 0);

    setTimeout(function () {
      should(store.read('target')).deepEqual({name: 'qq', bol: false});
      should(results).deepEqual(['22', 'qq']);
      done()
    }, 50)
  });

  it('Can report', function () {
    var store = new Justore({
      target: {name: 'wx', bol: true}
    }, 'report store');

    should(store.report()).deepEqual({
      target: {name: 'wx', bol: true}
    });
  });


  it('Sub immediate ok', function (done) {
    var store = new Justore({
      target: {name: 'aa', bol: true}
    }, 'sub store');

    store.sub('target',function (data) {
      should(data).deepEqual({name: 'aa', bol: true});
      done();
    },true);
  });

  it('Sub normal ok', function () {
    return allDone(function (a,b,c) {

      var store = new Justore({
        bb:'c',
        target: {name: 'aa', bol: true}
      }, 'sub store');

      store.sub('target',function (data) {
        should(data).be.exactly('q');
        a()
      });

      store.sub('*',function (data) {
        should(data.toJS()).deepEqual({bb:'c',target:'q'});
        b();
      });

      store.sub('bb',function (data) {
        c(new Error('should not emmit'));
      });

      setTimeout(()=>c(),500);

      store.write('target','c');
      store.write('target','q');

    },3)
  });



});
