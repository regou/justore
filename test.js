var should = require('should/as-function');
var justore = require('./index.js');

describe('JuStore', function () {

	var store = new justore();

	it('Creates an empty store', function () {

		should(store).have.property('write');
		should(store).have.property('read');
		should(store.read()).have.property('size',0);
	});

	it('Can write some data', function () {

		store.write('name','wx');

		should(store.read('name')).be.exactly('wx');
	});


});
