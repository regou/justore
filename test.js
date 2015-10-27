var should = require('should/as-function');
var justore = require('./index.js');
var EventEmitter = require('eventemitter3');

describe('JuStore', function () {

	var store = new justore({},'teststore');


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
		var cur = 'Fire';
		var activeKeys = [];
		store2.change.on('*',function(keys){


			var tar = store2.read(cur);
			try{
				if(cur=='Fire'){
					should(tar).be.exactly(1);
				}else{
					should(tar).be.exactly(2);
				}

				should(keys).be.instanceof(Array);
				should(keys.indexOf('Fire')>=0 || keys.indexOf('Water')>=0).be.exactly(true);

				activeKeys.push(cur);
				if(activeKeys.length == 2){
					done();
				}
			}catch(err){done(err);}
		});

		cur = 'Fire';
		store2.write(cur,1);
		cur = 'Water';
		store2.write(cur,2);
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



	it('Can pass waitforPromise', function (done) {

		store.change.on('pmstest',function(data){

			should(data).deepEqual([1,3,5,7,9,1,1,1]);
			done();


		});


		store.write('pmstest',[1,3,5,7,9],{
			waitFor:function(d){
				return new Promise(function(res){
					setTimeout(function(){
						res(d.concat([1,1,1]));
					},120);
				});
			}
		});

	});

	it('Clone read', function () {


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

});
