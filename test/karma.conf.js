module.exports = function (config) {
    config.set({
        basePath: '../',

        frameworks: [ 'jasmine' ],

        files: [ /* definition in gruntfile */ ],

        reporters: [ 'progress' ],
        colors: true,
        logLevel: config.LOG_INFO,

        port: 9876,
        autoWatch: false,
        
        browserNoActivityTimeout: 10e5,

        browsers: [ 'PhantomJS'/*, 'Chrome'*/ ],
        singleRun: true
    });
};