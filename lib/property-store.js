module.exports = (function() {

    var extend = require('extend');


    function PropertyStore(context, conf) {
        if('object' !== typeof context || (context === null)) {
            throw new TypeError('context must be an object');
        }

        this._context = context;

        this.conf = extend({ }, this.defaults, conf);

        this._store = { };
    }


    PropertyStore.prototype = {
        defaults: {
            propertiesSeparator: ',',
            levelSeparator: '.',
            expand: true
        },
        destroy: function() {
            if(this._isDestroyed) {
                throw new Error('instance was destroyed and it is useless now');
            }

            this.clear();

            delete this._store;
            delete this._context;
            delete this._conf;

            this._isDestroyed = true;
        },
        store: function(name) {
            if(this._isDestroyed) {
                throw new Error('instance was destroyed and it is useless now');
            }

            return this._expand(name, this._store);
        },
        _store: function(obj, name, path) {
            return (this._store[path] = {
                value: obj[name]
            });
        },
        restore: function(name) {
            if(this._isDestroyed) {
                throw new Error('instance was destroyed and it is useless now');
            }

            return this._expand(name, this._restore);
        },
        _restore: function(obj, name, path) {
            if(this._store[path]) {
                return (obj[name] = this._store[path].value);
            }
        },
        clear: function() {
            if(this._isDestroyed) {
                throw new Error('instance was destroyed and it is useless now');
            }

            Object.keys(this._store).forEach(function(key) {
                delete this._store[key];
            }, this);
        },
        _expand: function(name, fn) {
            var splitted = name.split(this.conf.propertiesSeparator);

            if(splitted.length > 1) {
                return this._expand(splitted, fn);
            } else if(Array.isArray(name)) {
                return name.map(function(name) {
                    fn.call(this, context, name);
                }, this);
            } else {
                var context = this._context;
                var prop = name;

                if(this.conf.expand) {
                    splitted = name.splitted(this.conf.levelSeparator).slice(1);

                    while(splitted.length) {
                        prop = splitted.shift();

                        if(context.hasOwnProperty(prop)) {
                            context = context[prop];
                        } else {
                            throw new Error('path "' + name + '" is not valid for object ', this._context);
                        }
                    }
                }

                return fn(context, prop, name);
            }
        }
    };


    return PropertyStore;

})();