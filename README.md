# Justore

[![Build Status via Travis CI](https://travis-ci.org/regou/justore.svg?branch=master)](https://travis-ci.org/regou/justore)
[![NPM version](https://img.shields.io/npm/v/justore.svg)](https://www.npmjs.com/package/justore)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com)

We don't need flux , just the store!


### Installation

```sh
npm install justore --save
```

### Basic Usage

```js
var justore = require("justore");
var initData = {};
var store = new justore(initData,'Store Name');


//Write or change data to store, return a Promise
store.write('todos',['drink','cook']);

//Subscribe to change
let subscription = store.sub('todos.0',function(newVal,prevVal){
  store.read('todos') === newVal //true, 'drink'
});
//Remember to clean up
subscription.unsubscribe();
```


### Advanced usage

- `store.batchWrite([keyPaths], manipulateFunction);`
    Batch write multiple data to the store, only emit event if listed on the 1st param
```js
    store.batchWrite(['vtext', 'enable'], draft => {
      draft.vtext.i = 10
      draft.enable = true
      draft.pos = 12 // works, but no event emit
    });
```

- `store.write(keyPath, data [,options])`

    Write data to the store, return store
```js
    store.write('todos',['drink','cook'],{
      //Boolean. If true, change the store without trigger any events
      mute:false
    });
```
        
- `store.sub(keyPath,onNext[,immediate])`

    Subscribe to the store, return Rx Subscription
```js
    store.sub('todos.1',function (newVal, oldVal) {
  	  //do tings
    });
```

- `store.read(keyPath)`

    Get value for attribute by passing the key.
```js
    store.read("todos.0") //--> 'drink'
```

- `store.delete(keyPath)`

    Useful when you want to delete a root key and it's data
```js
    store.delete("todos")
    store.report()  //--> {}
```

- `store.report()`

    return the full store data. You cannot manipulate it
    
- `store.debugOn`
    
   if a key in this array, will toggle JS breakpoints when writing that key



### React Mixin helper
- `store.createReactMixin(key)`
 
    Return a mixin. Will call `onStoreChange` method on a React component when store change.

### Auto unsubscibe

    If the subscribed data has been deleted (not set to undefined), the subscription will unsubscribe automatically

### Browser support

    IE11 or higher
