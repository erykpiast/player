module.exports = function (grunt) {

    grunt.registerTask('default', [ 'demo' ]);

    grunt.registerTask('demo', [
        'jshint',
        'clean:demo',
        'browserify:demo',
        'autoprefixer:demo',
        'notify:build',
        'http-server:demo',
        'watch:demo',
        'clean:demo'
    ]);

    grunt.registerMultiTask('test', simpleMultiTaskRunner);


    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        config: {
            demo: {
                server: {
                    port: process.env.PORT || 8080,
                    host: process.env.IP || '127.0.0.1'
                },
                dir: 'demo',
                files: [
                    'demo/**/*',
                    '!demo/index.html',
                    '!demo/demo.bundle.js',
                    '!demo/demo.bundle.css'
                ],
                js: {
                    index: 'demo/index.js',
                    bundle: 'demo/demo.bundle.js'
                },
                css: {
                    index: 'demo/index.css',
                    bundle: 'demo/demo.bundle.css'
                }
            },
            src: {
                js: {
                    dir: '.',
                    files: [
                        'index.js',
                        'lib/**/*.js',
                    ],
                    index: 'index.js'
                }
            },
            spec: {
                dir: 'test',
                bundle: 'test/<%= pkg.name %>.bundle.js',
                files: 'test/**/*.spec.js'
            }
        },
        clean: {
            demo: [ '<%= config.demo.js.bundle %>', '<%= config.demo.css.bundle %>'  ],
            test: [ '<%= config.spec.bundle %>' ]
        },
        test: {
            dev: [
                'jshint',
                'clean:test',
                'browserify:test-dev',
                'notify:build',
                'karma:unit',
                'notify:test',
                'watch:test',
                'clean:test'
            ],
            dist: [
                'jshint',
                'clean:test',
                'browserify:test-dist',
                'notify:build',
                'karma:unit',
                'notify:test',
                'clean:test'
            ]
        },
        browserify: {
            options: {
                browserifyOptions: {
                    debug: true
                },
                transform: [ 'brfs' ]
            },
            demo: {
                files: [{
                    src: '<%= config.demo.js.index %>',
                    dest: '<%= config.demo.js.bundle %>'
                }]
            },
            'test-dev': {
                files: [{
                    src: '<%= config.spec.files %>',
                    dest: '<%= config.spec.bundle %>'
                }],
                options: {
                    plugin: [ 'proxyquireify/plugin' ]
                }
            },
            'test-dist': {
                files: [{
                    src: '<%= config.spec.files %>',
                    dest: '<%= config.spec.bundle %>'
                }],
                options: {
                    browserifyOptions: {
                        debug: false
                    },
                    plugin: [ 'proxyquireify/plugin' ]
                }
            }
        },
        autoprefixer: {
            options: {
                browsers: [ 'last 2 version' ]
            },
            demo: {
                options: {
                    cascade: true,
                    map: {
                        inline: true
                    }
                },
                src: '<%= config.demo.css.index %>',
                dest: '<%= config.demo.css.bundle %>'
            }
        },
        watch: {
            demo: {
                options: {
                    livereload: true
                },
                files: [
                    '<%= config.src.js.files %>',
                    '<%= config.demo.files %>'
                ],
                tasks: [
                    'jshint',
                    'clean:demo',
                    'browserify:demo',
                    'autoprefixer:demo',
                    'notify:build'
                ]
            },
            test: {
                files: [
                    '<%= config.src.js.files %>',
                    '<%= config.spec.files %>'
                ],
                tasks: [
                    'jshint',
                    'clean:test',
                    'browserify:test-dev',
                    'notify:build',
                    'karma:unit',
                    'notify:test'
                ]
            }
        },
        jshint: {
            files: [
                'gruntfile.js',
                '<%= config.spec.files %>',
                '<%= config.src.js.files %>'
            ]
        },
        'http-server': {
            demo: {
                root: '.',
                port: '<%= config.demo.server.port %>',
                host: '<%= config.demo.server.host %>',
                cache: -1,
                showDir : true,
                autoIndex: true,
                defaultExt: 'html',
                runInBackground: true
            }
        },
        karma: {
            unit: {
                options: {
                    configFile: '<%= config.spec.dir %>/karma.conf.js',
                    files: [
                        '<%= config.spec.dir %>/phantomjs-extensions.js',
                        '<%= config.spec.bundle %>'
                    ]
                }
            }
        },
        notify: {
            test: {
                options: {
                    title: 'Tests completed',
                    message: 'All tests passed successfully'
                }
            },
            build: {
                options: {
                    title: 'Building completed',
                    message: 'Enjoy new version of your app!'
                }
            }
        }
    });

    require('load-grunt-tasks')(grunt);


    function simpleMultiTaskRunner() {
        grunt.task.run(this.data);
    }

};
