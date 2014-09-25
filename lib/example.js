module.exports = (function() {

    var util = require('util');
    var EventEmitter = require('events').EventEmitter;


    function Example() {

    }


    util.inherits(Example, EventEmitter);

    Example.prototype.doSomething = function(maxDuration) {
    	setTimeout(function() {
    		this.emit('done', Math.random());
    	}.bind(this), Math.floor(Math.random() * maxDuration));
    };


    return Example;

})();