var proxyquire = require('proxyquireify')(require);

var PropertyStore = proxyquire('../lib/property-store', { });

describe('PropertyStore class test', function() {

    it('Should be a function and should be instantiated', function() {
        expect(typeof PropertyStore).toBe('function');

        expect(function() {
            new PropertyStore({ });
        }).not.toThrow();
    });

    it('Should throw an error if the first argument is not an object', function() {
        expect(function() {
            new PropertyStore();
        }).toThrow();

        expect(function() {
            new PropertyStore('');
        }).toThrow();

        expect(function() {
            new PropertyStore(4);
        }).toThrow();

        expect(function() {
            new PropertyStore(Infinity);
        }).toThrow();

        expect(function() {
            new PropertyStore(NaN);
        }).toThrow();

        expect(function() {
            new PropertyStore(null);
        }).toThrow();
    });

});


describe('PropertyStore instance test', function() {
    var store;

    beforeEach(function() {
        store = new PropertyStore({ });
    });

    afterEach(function() {
        store = null;
    });


    it('Should be an object with a bunch of methods', function() {
        expect(typeof store).toBe('object');

        expect(store.store).toBeDefined();
        expect(typeof store.store).toBe('function');

        expect(store.restore).toBeDefined();
        expect(typeof store.restore).toBe('function');

        expect(store.clear).toBeDefined();
        expect(typeof store.clear).toBe('function');

        expect(store.destroy).toBeDefined();
        expect(typeof store.destroy).toBe('function');
    });

});


describe('PropertyStore destroying test', function() {
    var store;

    beforeEach(function() {
        store = new PropertyStore({ });
    });

    afterEach(function() {
        store = null;
    });

    it('Should allow to clean things by destroy method', function() {
        expect(function() {
            store.destroy();
        }).not.toThrow();
    });

    it('Should prevent calling any public method after destroying', function() {
        store.destroy();

        expect(function() {
            store.store('prop');
        }).toThrow();

        expect(function() {
            store.restore('prop');
        }).toThrow();

        expect(function() {
            store.clear();
        }).toThrow();

        expect(function() {
            store.destroy();
        }).toThrow();
    });

});