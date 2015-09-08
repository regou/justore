# Justore


We don't need flux , just the store please!


**The library itself require a Promise supported environment.**


### Installation


```sh
npm install justore --save
```

### Basic Usage

```js
var justore = require("justore");
var initData = {};
var store = new justore(initData,'Store Name');


//write or change data to store, return a Promise
store.write('todos',['drink','cook']);

//read data (Writing data into store is synchronous,so you can read & write in a same block)
store.read('todos');

//Listen change
store.change.on('todos',function(newVal,prevVal){
  store.read('todos') === newVal //true
});
//Listen all changes
store.change.on('*',function(changedKeys){
  changedKeys.length == 1 //true
});
```


### Advanced usage

`store.write(key,data [,options])`
will write data to the store, return a Promise
```js
store.write('todos',['drink','cook'],{
      //Boolean if true.Change the store without trigger change events
      mute:false, 
      
      //Wait for other actions, such as http request, MUST return a Promise 
      waitFor: function(data){ 
        return new Promise(function(res){
          resolve(data.concat['eat']);//Overwrite corresponding store value with resolved data  
        }) 
      }
});
```    
  
You can wait for other stores to change, remember `store.write` return a Promise too!  
```js
options:{
      waitFor: function(data){ 
        return store2.write('exampleKey',2);
      }
}
```
    
    
`store.change`
The [EventEmiter](https://nodejs.org/api/events.html#events_class_events_eventemitter) of the store

`store.trigger(key)`
Just trigger the events.*Normally you don't need to do this.*
```js
store.trigger('todos');
```

`store.read(key)`
Get value for attribute by passing the key.
```js
store.get("todos") --> ['drink','cook','eat']
```

`store.readAsClone(key,isDeep)`
Similar to `store.read(key)` ,but return a [DeepCloned](https://lodash.com/docs#clone) value ;

[Full Example](https://github.com/regou/justore-todo)

### Why change event not fired?
You may read the JavaScript Mutable objects (Array , Object),and change them directly without cloning.
Clone before mutate it Or try these:

- Trigger events by your self.  `store.trigger(key)`

- Read the data as clone.  `store.readAsClone(key)`

- Use [Immutable](https://facebook.github.io/immutable-js/) data structures

