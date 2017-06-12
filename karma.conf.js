// Karma configuration

module.exports = function(config) {
  config.set({

    // base path, that will be used to resolve files and exclude
    basePath: '',

    client: {
        mocha: {
            timeout: 20000
        }
    },

    plugins: [
      'karma-mocha',
      'karma-chai',
      'karma-browserify',
      'karma-chrome-launcher',
      'karma-firefox-launcher'
      //,'karma-ievms'
      //,'karma-ios-launcher'
    ],

    // frameworks to use
    frameworks: ['browserify', 'mocha', 'chai'],

    // list of files / patterns to load in the browser
    files: [
      'test/**/*.spec.js'
    ],


    // list of files to exclude
    exclude: [

    ],

    // Browserify config (all optional)
    browserify: {
      // extensions: ['.coffee'],
      // ignore: [],
      // transform: ['coffeeify'],
      // debug: true,
      // noParse: ['jquery'],
      // watch: true
    },

    // Add browserify to preprocessors
    preprocessors: {'test/**/*.js': ['browserify']},


    // test results reporter to use
    // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    /* possible values:
    config.LOG_DISABLE
    config.LOG_ERROR
    config.LOG_WARN
    config.LOG_INFO
    config.LOG_DEBUG*/
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera (has to be installed with `npm install karma-opera-launcher`)
    // - Safari (only Mac; has to be installed with `npm install karma-safari-launcher`)
    // - PhantomJS
    // - IE (only Windows; has to be installed with `npm install karma-ie-launcher`)
    browsers: [
        //'iOS',
        'Chrome',
        'Firefox'
        //,'IE11 - Win7'
        //,'IE10 - Win7'
    ],


    // If browser does not capture in given timeout [ms], kill it
    captureTimeout: 60000,


    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: false
  });
};
