# Justore

[![Build Status via Travis CI](https://travis-ci.org/regou/justore.svg?branch=master)](https://travis-ci.org/regou/justore)
[![NPM version](https://img.shields.io/npm/v/justore.svg)](https://www.npmjs.com/package/justore)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com)

We don't need flux , just the store!


~~**The library itself requires a Promise supported environment.**~~

[TodoList Example](https://github.com/regou/justore-todo)

### Installation

```sh
npm install justore --save
```

### Basic Usage

```js
var justore = require("justore");
var initData = {};
var store = new justore(initData,'Store Name');


//Listen change
//Add event listeners before change
store.change.on('todos',function(newVal,prevVal){
  store.read('todos') === newVal //true
});

//Write or change data to store, return a Promise
store.write('todos',['drink','cook']);

//Listen all changes
store.change.on('*',function(changedKeys){
  changedKeys.length == 1 //true
});
```


### Advanced usage

- `store.read('*')`

	Read all value (As an ImmutableJS Map)

- `store.write('*',ImmutablejsMap)`

	Overwrite store by passing an ImmutableJS Map (most likely read and modified from `store.read('*')`)
	
	Note:Read & write `'*'` won't affect performance.

- `store.update(updeepSchema[,value])`

	Update store by passing an [updeepSchema](https://github.com/substantial/updeep/tree/37cf81dd8377bd4f6fbd196407d0ac452cd6f825)
	```js
	//Update by string schema
	var store1 = new justore({
      scoreboard: {
        scores: {
          team1: 0,
          team2: 0
        }
      }
    }, 'updatestore1');
    store1.update('scoreboard.scores.team1', 2);
    
    //Update by object schema
    var store2 = new justore({
      todos: [{text: 'a', done: false}, {text: 'b', done: false}]
    }, 'updatestore2');
    store2.update({todos: {1: {done: true}}});
	```


- `store.write(key,data [,options])`

    Write data to the store, return store
    ```js
    store.write('todos',['drink','cook'],{
      //Boolean. If true, change the store without trigger any events
      mute:false
    });
    ```
    Note use '*' as key can overwrite all value by passing an ImmutableJS Map
        
- `store.sub(key,onNext[,immediate])`

    Subscribe to the store, return Rx Subscription
    ```js
    store.sub('target',function (data) {
  	  //do tings
    });
    ```
- `store.sub(key,onNext[,immediate])`

    Subscribe to the store, return Rx Subscription
    ```js
    store.sub('target',function (data) {
  	  //do tings
    });
    ```

- `store.change`

    The [EventEmiter](https://nodejs.org/api/events.html#events_class_events_eventemitter) of the store
    
    *Please use `store.sub` instead*

- `store.trigger(key)`

    Just trigger the events on `store.change`.
     *Normally you don't need to do this.*
    ```js
    store.trigger('todos');
    ```

- `store.bufferWrite = false` (Default is true)

	As default, write/update data multiple times trigger event only once, set `bufferWrite` to `false` to disable it.

- `store.read(key)`

    Get value for attribute by passing the key.
    ```js
    store.read("todos") --> ['drink','cook','eat']
    ```

- `store.readAsClone(key,isDeep)`

    Similar to `store.read(key)` ,but return a [DeepCloned](https://lodash.com/docs#clone) value

- `store.report()`

    return the full store data as equivalent pure JavaScript Object
    
- `store.debugOn`
    
   if a key in this array, will toggle JS breakpoints when writing that key



### React Mixin helper
- `store.createReactMixin(key)`
 
    Return a mixin. Will call `onStoreChange` method on a React component when store change.



### Why sometimes change event not fired?
You may read the JavaScript Mutable objects (See video detail: [Avoiding Array Mutations](https://egghead.io/lessons/javascript-redux-avoiding-array-mutations-with-concat-slice-and-spread) , [Avoiding Object Mutations](https://egghead.io/lessons/javascript-redux-avoiding-object-mutations-with-object-assign-and-spread)), and change them directly without cloning.
Clone before mutate them or try one of these:

- Use [Immutable](https://facebook.github.io/immutable-js/) data structures (Recommend)

- Use `store.update` to manipulate deep nested objects or arrays (Recommend)

- Consider Redux's suggestions about '[Handing more actions](http://redux.js.org/docs/basics/Reducers.html#handling-more-actions)'

- Trigger events by your self.  `store.trigger(key)`

- Read the data as clone.  `store.readAsClone(key)`

