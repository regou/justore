var Immutable = require('immutable');
var EventEmitter = require('eventemitter3');
var clone = require('lodash/lang/clone');
var nextTick = require('next-tick');


//var Rx = require('rxjs/Rx');
var Observable = require('rxjs/Observable').Observable;
require('rxjs/add/operator/groupBy');
require('rxjs/add/operator/debounceTime');
require('rxjs/add/operator/filter');

function Justore(initData,storeName) {
	var self = this;

	self.name = storeName || 'Anonymous Store';

	self.asyncEvents = false;
	self.bufferWrite = true;

	var data = Immutable.Map(initData || {});
	var previousData = data;
	function dataSetter(key,val){
		if(key==='*'){
			if(Immutable.Map.isMap(val)){
				data = val;
			}else{
				throw new TypeError('* setter must be a ImmutableJS data map');
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
				return false;
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
		.groupBy(val => val.key)
		.subscribe(function (g) {
			function triggerReject(reson){
				emit('Error:'+key,reson);
				console.warn('Justore write '+ self.name +' Error: ',reson);
			}


			function getGroupedObservable() {
				return self.bufferWrite ? g.debounceTime(0) : g;
			}

			return getGroupedObservable()
				.filter(function (conf) {
					if(conf.key === '*'){
						return true;
					}
					var itemData = conf.d;
					var prevItemData = previousData.get(conf.key);
					return itemData !== prevItemData
				})
				.subscribe(function (conf) {
					var opt = conf.opt || {};
					var mute = opt.mute;

					dataSetter(conf.key,conf.d);
					if(!mute){triggerChange(conf.key)}

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
		if(!Immutable.Map.isMap(ret)){
			ret = clone(ret,isDeep);
		}
		return ret;
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

Justore.Immutable = Immutable;



module.exports = Justore;
