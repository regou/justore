/**
 * Created by wx on 10/23/15.
 */
var justore = require('./index.js');

var store = new justore({
	vis:false,
	dom:null
},'loopstore');
var n = 0;
store.change.on('vis',function(val){
	console.log(val);
	if(n<=10){
		n=n+1;
		//store.write('dom',11);

	}

});


store.write('vis',true);
store.write('vis',3);
store.write('vis',4);
store.write('vis',5);
store.write('vis',6);
store.write('bb',7);
store.write('vis',8);


setTimeout(function () {
	store.write('bb','bb');
},1000)

setTimeout(function () {
	store.write('dom',new Date());

	store.write('vis',9);
	store.write('bb','bb');
},3000)

