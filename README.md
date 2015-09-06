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
var store = new justore({},'Store Name');


//write or change data to store
store.write('todos',['drink','cook']);

//read data
store.read('todos');

//Listen change
store.change.on('todos',function(newVal,prevVal){
  store.read('todos') === newVal //true
});

```

### Advanced usage

`store.write(key,data [,options])`
will write data to the store, return a Promise

    options:{
      mute:false, //Boolean if true,change the store without trigger change events 
      waitFor: function(data){ //Wait for other actions, such as http request, MUST return a Promise 
        return new Promise(function(res){
          resolve(data.concat['eat'])
        }) 
      }
    }
    
```js
options:{
      waitFor: function(data){ //You can wait for other stores to change, remember store.write is a Promise too! 
        return store2.write('exampleKey',2);
      }
    }
```
    
    
`store.change`
The [EventEmiter](https://nodejs.org/api/events.html#events_class_events_eventemitter) of the store

`store.trigger(key)`
Just trigger the events

```js
store.trigger('todos');
```

`store.read(key)`
get value for attribute by passing the key.
```js
store.get("todos") --> ['drink','cook','eat']
```

`store.readAsClone(key,isDeep)`
same as `store.read(key)` ,but return a [DeepCloned](https://lodash.com/docs#clone) value ;


### Why change event not fired?
You read the JavaScript Mutable objects (Array , Object),and change them without clone.
Clone before mutate it Or try these:

- Trigger events by your self.  `store.trigger(key)`

- Read the data as clone.  `store.readAsClone(key)`

- Use [Immutable](https://facebook.github.io/immutable-js/) data structures

