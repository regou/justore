# Justore


We don't need flux , just the store!


**The library itself require a Promise supported environment.**

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
	
**Read & write `'*'` won't affect performance and they are recommended usage.**

	

- `store.write(key,data [,options])`

    Write data to the store, return store
    ```js
    store.write('todos',['drink','cook'],{
          //Boolean. If true, change the store without trigger any events
          mute:false
    });
    ```
    Note use '*' as key can overwrite all value by passing an ImmutableJS Map
        
- `store.change`

    The [EventEmiter](https://nodejs.org/api/events.html#events_class_events_eventemitter) of the store

- `store.trigger(key)`

    Just trigger the events.*Normally you don't need to do this.*
    ```js
    store.trigger('todos');
    ```

- `store.bufferWrite = false` (Default is true)

	As default, write data is asynchronous and multiple write actions trigger event only once, set `bufferWrite` to `false` to disable it.

- `store.read(key)`

    Get value for attribute by passing the key.
    ```js
    store.read("todos") --> ['drink','cook','eat']
    ```

- `store.readAsClone(key,isDeep)`

    Similar to `store.read(key)` ,but return a [DeepCloned](https://lodash.com/docs#clone) value
    

### React Mixin helper
- `store.createReactMixin(key)`
 
    Return a mixin. Will call `onStoreChange` method on a React component when store change.



### Why sometimes change event not fired?
You may read the JavaScript Mutable objects (Array , Object),and change them directly without cloning.
Clone before mutate it or try one of these:

- Use [Immutable](https://facebook.github.io/immutable-js/) data structures (Recommend)

- Trigger events by your self.  `store.trigger(key)`

- Read the data as clone.  `store.readAsClone(key)`

