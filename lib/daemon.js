'use strict';

var daemons   = require('yocto-daemon')();
var Q         = require('Q');
var _         = require('lodash');
var async     = require('async');
var loadtest  = require('loadtest');
var utils     = require('yocto-utils');
var Spinner   = require('cli-spinner').Spinner;
var sleep     = require('sleep');
var report    = require('./report');
var chalk     = require('chalk');

// disable daemons logs
daemons.logger.disableConsole();

// default scenario storage
var storeConfig = {};
// default report
var storeReport = [];

var endingProcess = function (data) {
  // internal method to exit current process
  var exit = function (state) {
    // request an exit process ?
    if (state) {
      // stop daemon before exit
      daemons.stop();
      // exit tools
      process.exit(0);
    }
  }

  // has succeed ?
  if (data.success) {
    // get result
    var result = data.message;
    // push item into storage array to normalize current process
    storeReport.push(result.report);

    // is not terminal terminal ?
    if (result.output !== 'terminal') {
      //var d = Q.defer();
      // proces report to file
      report.reportToFile(storeReport, result.output).then(function () {
        // exit process
        exit(result.exit);
      }, function () {
        // exit process
        exit(result.exit);
      });
      //return d.promise;
    } else {
      // build report
      if (result.exit) {
        // process report for terminal
        report.reportTerminal(storeReport);
        // exit process
        exit(result.exit);
      } else {
        console.log('need to save report before build');
      }
    }
  } else {
    // log before exit
    report.error('An error occured during process. report cannot be processed\n');
    // exit process
    exit();
  }
};

/**
 * Populate queue method
 *
 * @return {Object} promise to catch
 */
var populate = function () {
  // create defer process
  var deferred = Q.defer();
  // has valid value ?
  if (_.has(storeConfig, 'config') && !_.isEmpty(storeConfig.config)) {
    // resolve with correct data
    deferred.resolve({
      priority  : 1,
      callback  : function (data) {
        // endn process
        endingProcess(data);
      },
      data      : storeConfig
    });
  } else {
    // reject with properly message
    deferred.reject('Cannot process this scenario. Data seems to be empty');
  }

  // default statement
  return deferred.promise;
};

/**
 * Build a snipper message object for display
 *
 * @param {String} message message to display
 * @return {Object} spinner object
 */
var spin = function (message) {
  // Create Spinner
  var spinner = new Spinner([ message, '%s' ].join(' '));
  spinner.setSpinnerString('|/-\\');

  // return spinner
  return spinner;
};

/**
 * Process verbosity logging
 *
 * @param {String} message message to display
 * @param {Boolean} enable tru to enable verbose state
 * @param {Boolean} if true add chariot on begin of line
 */
var verbose = function (message, enable, chariot) {
  // only if verbosity is enable
  if (enable) {
    report.info(message, chariot);
  }
};

/**
 * Main execute method, to provide load testing on given config
 *
 * @param {Object} items items to process
 * @return {Object} default promise catched by daemon
 */
var execute = function (items) {
  // create defer process
  var deferred = Q.defer();
  // default result
  var report = { title : '', result  : [] };

  // default internal process for progressive load
  var internalProcess = function (items) {
    // data is not undefined ?
    if (!_.isUndefined(items)) {
      // process each series for page
      async.eachSeries(items.config, function (pages, nextPage) {
        // verbose process
        verbose([ 'Procesing request for [', pages.id, '] - [',
                  pages.title, ']' ].join(' '), items.verbose);
        // process each entries
        async.eachSeries(pages.entries, function (entry, nextEntry) { 
          // process snipper
          var sp = spin([ chalk.cyan('>'), 'Processing request for [', entry.url, ']' ].join(' '));
          sp.start();

          // verbose process
          verbose([ 'Load for [', pages.id, '] - [',
                    entry.url, '] was started' ].join(' '), items.verbose);
          // build pre report object format
          report.title = [ 'Request for', items.users, 'simmultaneous users' ].join(' ');
          // load test
          loadtest.loadTest(_.extend(entry, {
            // status callback for each request
            statusCallback : function (latency, result, error) {
              report.result.push(_.extend({ url : entry.url }, _.merge(latency,
                _.omit(result, [ 'body', 'headers', 'instanceIndex', 'requestIndex' ]))
              ));
            },
            maxRequests : items.users,
            timeout     : items.limit
          }), function (error) {
            // verbose process
            verbose([ 'Load for [', pages.id, '] - [',
                    entry.url, '] was ending' ].join(' '), items.verbose, true);
            verbose([ 'Sleeping', items.latency, 'Ms before next request' ].join(' '),
                      items.verbose);
            // process request with config latency
            sleep.usleep(items.latency);
            // stop snipper
            sp.stop(false);
            // go to the next entry
            nextEntry();
          });
        }, function () {
          // verbose process
          verbose('Going to process next page.', items.verbose);
          // go to next page
          nextPage();
        });
      }, function () {
        // state for exit process
        var exit = true;
        // verbose process
        verbose('Going to build reporting.', items.verbose);
        // if progressive mode ?
        if (items.progressive) {
          // verbose mode
          verbose('Progressive mode is enabled grow up to reach max users limit');
          // has reach max uers ?
          if (storeConfig.users < storeConfig.limitUser) {
            // verbose mode
            verbose([ 'Grow up max users to reach ',
              (storeConfig.users + 1), 'simultaneous users' ].join(' '));
            // change value
            storeConfig.users++;
            // not exit process must be continue with next populate
            exit = false;
          } else {
            // verbose mode
            verbose('Max users limit was reach');
          }
        }
        // resolve response
        deferred.resolve({ exit : exit, report : report, output : items.output });
      });
    } else {
      // reject
      deferred.reject();
    }
  }
  // start process
  internalProcess(items);
  // default statement
  return deferred.promise;
};

var process = function (config) {
  // save config before set populate method
  storeConfig = config;
  // set populate method
  daemons.use(populate);
  // set execute method
  daemons.use(execute, true);
  // set default value
  daemons.lessWorkers(8);
  // set retry and delay config
  daemons.retry(0);
  daemons.delay(5);
  // start process
  if (daemons.isReady(true)) {
    // start daemon
    daemons.start();
  } else {
    // to do someting here before do other things
    console.log('failed');
  }
};

module.exports = {
  process : process
};