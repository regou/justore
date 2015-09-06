Pvar Immutable = require('immutable');
var EventEmitter = require('eventemitter3');

var isPromise = require('is-promise');

function Justore(initData,storeName) {
	var self = this;

	self.name = storeName || 'Anonymous Store';

	var data = Immutable.Map(initData || {});
	var previousData = data;

	function triggerChange(){

		var somethingChanged = null;

		data.forEach(function(itemData,key){
			var prevItemData = previousData.get(key);
			if(itemData !== prevItemData){
				self.change.emit(key,itemData,prevItemData);
				somethingChanged = key;
				return false;
			}
		});
		if(somethingChanged) {
			updatePreviousData();
			self.change.emit('*', somethingChanged);
		}
	}


	function updatePreviousData(){
		previousData = data;
	}


	this.write = function (key, d, opt) {
		var opt = opt || {};
		var waitFor = opt.waitFor || function(){};
		var mute = opt.mute;

		function triggerHandler(d){
			if(!mute){triggerChange()}
			return d;
		}

		function triggerReject(reson){
			self.change.emit('Error:'+key,reson);
			console.warn('Justore write '+ self.name +' Error: ',reson);
                        return Promise.reject(reson);
		}

		var setData = function(d){

			data = data.set(key, d);
			return Promise.resolve(data);
		};


		var waitForPromise = waitFor(d);
		if(isPromise(waitForPromise)){
			return waitForPromise
				.then(setData)
				.then(triggerHandler,triggerReject);
		}else{
			return setData(d)
				.then(triggerHandler,triggerReject)
		}



	};

	this.read = function(key){
		return key ? data.get(key) : data;
	}




}

Justore.prototype.change = new EventEmitter();



module.exports = Justore;
