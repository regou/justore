'use strict';
var Immutable = require('immutable');
var EventEmitter = require('eventemitter3');
var clone = require('lodash/lang/clone');


var nextTick = require('next-tick');


//var Rx = require('rxjs/Rx');
var Observable = require('rxjs/Observable').Observable;
require('rxjs/add/operator/groupBy');
require('rxjs/add/operator/debounceTime');
require('rxjs/add/operator/filter');
require('rxjs/add/operator/do');
require('rxjs/add/operator/map');


var u = require('updeep');

function Justore(initData,storeName) {
	var self = this;

	self.name = storeName || 'Anonymous Store';

	self._getErrorMsg = function (msg) {
		return '[Store ' + self.name + '] ' + msg;
	}

	self.asyncEvents = false;
	self.bufferWrite = true;

	var data = Immutable.Map(initData || {});
	var previousData = data;
	function dataSetter(key,val){
		if(key==='*'){
			if(Immutable.Map.isMap(val)){
				data = val;
			}else{
				throw new TypeError(self._getErrorMsg('* setter must be a ImmutableJS Map'));
			}
		}else{
			data = data.set(key,val)
		}
		return data;
	}

	function dataGetter(key){
		if(key === undefined || key==='*'){
			return data;
		}else{
			return data.get(key)
		}
	}

	function emit(){
		var args = arguments;
		if(self.asyncEvents){
			nextTick(function(){
				self.change.emit.apply(self.change,args);
			})
		}else{
			self.change.emit.apply(self.change,args);
		}

	}

	function triggerChange(forceTriggerKey){

		var changed = [];

		data.forEach(function(itemData,key){
			var prevItemData = previousData.get(key);

			if(forceTriggerKey === key || itemData !== prevItemData){

				emit(key,itemData,prevItemData);
				changed.push(key);
				//return false;
			}
		});
		if(changed.length) {
			emit('*', changed);
		}
	}


	function updatePreviousData(){
		previousData = data;
	}






	this.writeObservable = Observable.create(function (ob) {
		self.write = function (key, d, opt) {
			ob.next({key:key,d:d,opt:opt});
			return self;
		}
	})

	this.writeObservable
		.groupBy(function(val){return val.key})
		.subscribe(function (g) {
			function triggerReject(reson){
				emit('Error:'+key,reson);
				console.warn('Justore write '+ self.name +' Error: ',reson);
			}


			function getGroupedObservable() {
				var ob = g
					.filter(function (conf) {
						if(conf.key === '*'){
							return true;
						}
						var itemData = conf.d;
						var prevItemData = previousData.get(conf.key);
						return itemData !== prevItemData
					})
					.do(function (conf) {
						dataSetter(conf.key,conf.d);
						return conf;
					})


				return self.bufferWrite ? ob.debounceTime(0) : ob;
			}

			return getGroupedObservable()
				.subscribe(function (conf) {
					if(!conf.mute){triggerChange(conf.key)}

					updatePreviousData()
					return conf;
				},triggerReject)
		})


	self.trigger = function(key){
		triggerChange(key);
	};

	self.read = function(key){
		return dataGetter(key);
	};



	self.readAsClone = function(key,isDeep){
		var isDeep = typeof(isDeep) === 'boolean' ? isDeep : true;
		var ret = self.read(key);
		if(!Immutable.Iterable.isIterable(ret)){
			ret = clone(ret,isDeep);
		}
		return ret;
	}

	self.update = function (updeepSchema) {

		function safetyRead(key) {
			var oriData = data.get(key);
			if(Immutable.Iterable.isIterable(oriData)){
				throw TypeError(self._getErrorMsg('Not support update Immutablejs Iterables, plain objects&arrays only.'))
			}else{
				return oriData;
			}
		}

		var val = arguments[1];
		if(typeof updeepSchema === 'string'){
			(function () {
				var path = updeepSchema.split('.');
				var key = path[0];
				var newVal = u.updateIn(path.slice(1,path.length),val,safetyRead(key));
				self.write(key,newVal);
			})();
		}else if(typeof updeepSchema === 'object'){
			(function () {
				var keys = Object.keys(updeepSchema);
				keys.forEach(function (key) {
					var newVal = u(updeepSchema[key],safetyRead(key));
					self.write(key,newVal);
				})
			})();
		}

		return self;
	}


	self.change = new EventEmitter();



};

Justore.prototype.createReactMixin = function(key){
	var self = this;
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

Justore.prototype.report = function(){
	return this.read('*').toJS();
};

Justore.Immutable = Immutable;

Justore.u = u;



module.exports = Justore;
