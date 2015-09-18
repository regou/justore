var Immutable = require('immutable');
var EventEmitter = require('eventemitter3');
var clone = require('lodash/lang/clone');

var isPromise = require('is-promise');

function Justore(initData,storeName) {
	var self = this;

	self.name = storeName || 'Anonymous Store';

	var data = Immutable.Map(initData || {});
	var previousData = data;

	function triggerChange(forceTriggerKey){

		var changed = [];

		data.forEach(function(itemData,key){
			var prevItemData = previousData.get(key);

			if(forceTriggerKey === key || itemData !== prevItemData){

				self.change.emit(key,itemData,prevItemData);
				changed.push(key);
				return false;
			}
		});
		if(changed.length) {
			updatePreviousData();
			self.change.emit('*', changed);
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

	self.trigger = function(key){
		triggerChange(key);
	};

	self.read = function(key){
		return key ? data.get(key) : data;
	}



	self.readAsClone = function(key,isDeep){
		var isDeep = typeof(isDeep) === 'boolean' ? isDeep : true;
		var ret = self.read(key);
		if(!Immutable.Map.isMap(ret)){
			ret = clone(ret,isDeep);
		}
		return ret;
	}


	self.change = new EventEmitter();


	self.createReactMixin = function(key){
		return {
			componentWillMount: function(){
				var comp = this;
				self.change.on(key,comp.onStoreChange);
			},
			componentWillUnmount:function(){
				var comp = this;
				self.change.removeListener(key,comp.onStoreChange);
			}
		}
	};

}




module.exports = Justore;
