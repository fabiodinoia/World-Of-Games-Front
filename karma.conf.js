// Karma configuration for @angular/build:karma
// https://karma-runner.github.io/latest/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-mocha-reporter'),
      require('karma-coverage'),
    ],
    client: {
      clearContext: false, // leave Jasmine Spec Runner output visible in browser
    },
    jasmineHtmlReporter: {
      suppressAll: true, // removes the duplicated traces
    },
    coverageReporter: {
      dir: require('path').join(__dirname, 'coverage/'),
      subdir: '.',
      reporters: [{ type: 'text-summary' }, { type: 'lcov' }, { type: 'json-summary' }],
    },
    reporters: ['mocha', 'kjhtml'],
    customLaunchers: {
      // Chrome's own sandbox cannot start inside restricted/CI environments;
      // this launcher is required for headless runs there.
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
      },
    },
    browsers: ['Chrome'],
    restartOnFileChange: true,
  });
};
