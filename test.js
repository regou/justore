var should = require('should/as-function');
var justore = require('./index.js');
var EventEmitter = require('eventemitter3');
var Immutable = require('immutable');

function validateStore(store,d) {
	should(store.read('*').toJS()).deepEqual(d);
}

describe('JuStore', function () {

	var store = new justore({},'teststore');
	store.bufferWrite = false;


	it('eventemitter3 working', function (done) {
		    var ee = new EventEmitter();

		ee.on('hi',function(){
			done();
		});
		ee.emit('hi');
	});

	it('Creates an empty store', function () {

		should(store).have.property('write');
		should(store).have.property('change');
		should(store.read()).have.property('size',0);
		should(store).have.property('name','teststore');
	});

	it('Can write some data', function () {

		store.write('name','wx');

		should(store.read('name')).be.exactly('wx');
	});

	it('Can buffer write 1', function (done) {
		var store = new justore({
			name:'wx'
		},'buffered store');
		var results = [];
		store.change.on('name',function (val) {
			results.push(val)
		})

		store.write('name','wx');
		store.write('name','wx');
		store.write('name','wx');
		store.write('name','22');
		store.write('name','wx');
		store.write('name','22');

		setTimeout(function () {
			should(store.read('name')).be.exactly('22');
			should(results).deepEqual(['22']);
			done()
		},50)

	});


	it('Can buffer write 2', function (done) {
		var store = new justore({
			name:'wx'
		},'buffered store');
		var results = [];
		store.change.on('name',function (val) {
			results.push(val)
		})

		store.write('name','wx');
		store.write('name','wx');
		store.write('name','wx');
		store.write('name','22');
		store.write('name','wx');
		store.write('name','22');
		setTimeout(()=>store.write('name','qq'),0);

		setTimeout(function () {
			should(store.read('name')).be.exactly('qq');
			should(results).deepEqual(['22','qq']);
			done()
		},50)

	});


	it('Can get previous data', function (done) {

		store.write('historyTest','wow');


		setTimeout(function(){
			store.change.on('historyTest',function(newData,prevData){

				should(prevData).be.exactly('wow');
				should(newData).be.exactly('starcraft');
				done();

			});
			store.write('historyTest','starcraft');
		},100);


	});


	it('Trigger events working', function (done) {
		var store3 = new justore({age:3},'store3');
		store3.change.on('age',function(data){
			var age = store3.read('age');
			should(age).be.exactly(3);
			should(age).be.exactly(data);
			done();
		});

		store3.trigger('age');
	});

	it('Event "*" working', function (done) {
		var store2 = new justore({},'teststore2');
		var activeKeys = new Set();
		store2.change.on('*',function(keys){


			should(keys).be.instanceof(Array);
			should(keys.indexOf('Fire')>=0 || keys.indexOf('Water')>=0).be.exactly(true);

			keys.forEach(function (key) {
				var tar = store2.read(key);
				if(key=='Fire'){
					should(tar).be.exactly(1);
				}else{
					should(tar).be.exactly(2);
				}
				activeKeys.add(key)
			})

			if(activeKeys.size == 2){
				done();
			}
		});

		store2.write('Fire',1);
		store2.write('Water',2);
	});


	it('Trigger events working with js mutable data', function (done) {



		store.change.on('arr',function(data){

			var compareable = [1,3,5,7,9];
			var arr = store.read('arr');
			should(arr).deepEqual(compareable);
			should(arr).be.exactly(data);
			done();

		});


		store.write('arr',[1,3,5,7,9]);

	});



	it('Can clone read', function () {


		var d = [1,3,5,7,9];

		store.write('d',d);

		var temp = store.readAsClone('d');
		temp.push(88);

		should(temp).deepEqual([1,3,5,7,9,88]);
		should(d).deepEqual([1,3,5,7,9]);



	});

	it('Can create mixin', function () {
		var mixin = store.createReactMixin('d');
		should(mixin).have.properties(['componentWillMount','componentWillUnmount']);
	});

	it('No call loop', function (done) {
		var store = new justore({
			vis:false,
			dom:null
		},'loopstore');
		store.asyncEvents = true;
		store.change.on('vis',function(){
			store.write('dom',11);
			done();
		});


		store.write('vis',true);
	});


	it('Can read all data', function () {
		var store = new justore({
			vis:false,
			dom:null
		},'allteststore');
		var allData = store.read('*');

		var bol = allData.equals(Immutable.Map({
			vis:false,
			dom:null
		}));

		should(bol).be.exactly(true);

	});

	it('Can write all data', function (done) {
		var store = new justore({
			vis:false,
			dom:null
		},'allteststore2');
		var allData = store.read('*');


		store.change.on('*',function(changedKeys){
			validate();
			should(changedKeys).deepEqual(['vis']);
			done();
		});
		store.write('*',allData.set('vis',true));

		function validate(){
			var bol = store.read('*').equals(Immutable.Map({
				vis:true,
				dom:null
			}));
			should(bol).be.exactly(true);
		};




	});




	it('Can update data by string schema', function (done) {
		var store = new justore({
			scoreboard:{
				scores: {
					team1: 0,
					team2: 0
				}
			}
		},'updatestore1');

		store.change.on('scoreboard',function(newVal){
			should(newVal).be.exactly(store.read('scoreboard'));
			should(newVal).deepEqual({
				scores: {
					team1: 2,
					team2: 0
				}
			});

			validateStore(store,{
				scoreboard:{
					scores: {
						team1: 2,
						team2: 0
					}
				}
			});
			done();
		});

		store.update('scoreboard.scores.team1',2);
	});


	it('Can update data by object schema', function (done) {
		var store = new justore({
			scoreboard:{
				scores: {
					team1: 0,
					team2: [15]
				}
			}
		},'updatestore2');

		var times = 0;
		store.change.on('*',function(keys){
			times++;
			if(times == 2){
				validateStore(store,{
					total:2,
					scoreboard:{
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
			total:2,
			scoreboard:{
				scores:{
					team1:2
				}
			}
		});
	});


	it('Can update array by object schema', function (done) {
		var store = new justore({
			todos:[{text:'a',done:false},{text:'b',done:false}]
		},'updatestore3');


		store.change.on('*',function(keys){
			validateStore(store,{
				todos:[{text:'a',done:false},{text:'b',done:true}]
			});
			done();
		});


		store.update({todos:{1:{done:true}}});

	});

	it('Can buffer update', function (done) {
		var store = new justore({
			target:{name:'wx',bol:true}
		},'update buffered store');
		var results = [];
		store.change.on('target',function (val) {
			results.push(val.name);
		})

		store.update('target.name','wx');
		store.update('target.name','wx');
		store.update('target.name','wx');
		store.update('target.name','22');
		store.update('target.name','wx');
		store.update('target.bol',false);
		store.update('target.name','22');
		setTimeout(()=>store.update('target.name','qq'),0);

		setTimeout(function () {
			should(store.read('target')).deepEqual({name:'qq',bol:false});
			should(results).deepEqual(['22','qq']);
			done()
		},50)

	});



});
