'use strict';

var logger    = require('yocto-logger');

// disable logger before use on daemon
logger.disableConsole();

var daemons   = require('yocto-daemon')(logger);
var Q         = require('Q');
var _         = require('lodash');
var async     = require('async');
var loadtest  = require('loadtest');
var Spinner   = require('cli-spinner').Spinner;
var sleep     = require('sleep');
var report    = require('./report');
var chalk     = require('chalk');

// default scenario storage
var storeConfig = {};
// default report
var storeReport = [];

var endingProcess = function (result) {
  // create async process
  var deferred = Q.defer();
  // push item into storage array to normalize current process
  storeReport.push(result.report);

  // proces report to file
  report.exportReport(storeReport,
    result.output !== 'terminal', result.output).then(function (success) {
    // resolve with conten
    deferred.resolve(success);
  }, function (error) {
    // resolve with error
    deferred.reject(error);
  });

  // default statement
  return deferred.promise;
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
        // internal method to exit current process
        if (_.has(data, 'message.exit') && data.message.exit) {
          // stop daemon before exit
          daemons.stop();
          // exit tools
          process.exit(0);
        }
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
 * @param {Boolean} chariot if true add chariot on begin of line
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
            statusCallback  : function (latency, result, error) {
              // push data on storage array
              report.result.push(_.extend({ url : entry.url }, _.merge(latency,
                _.omit(error ? error : result, [ 'body', 'headers', 'instanceIndex', 'requestIndex' ]))
              ));
            },
            maxRequests       : items.users,
            timeout           : items.timeout,
            concurrency       : items.users,
            requestsPerSecond : items.requestsPerSecond,
            insecure          : items.insecure
          }), function () {
            // verbose process
            verbose([ 'Load for [', pages.id, '] - [',
                    entry.url, '] was ending' ].join(' '), items.verbose, true);
            verbose([ 'Sleeping', items.wait, 'Ms before next request' ].join(' '),
                      items.verbose);
            // process request with config latency
            sleep.usleep(items.wait);
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

        // if progressive mode ?
        if (items.progressive) {
          // verbose mode
          verbose('Progressive mode is enabled grow up to reach max users limit', items.verbose);
          // has reach max uers ?
          if (storeConfig.users < storeConfig.limitUser) {
            // verbose mode
            verbose([ 'Grow up max users to reach',
              (storeConfig.users + 1), 'simultaneous users' ].join(' '), items.verbose);
            // change value
            storeConfig.users++;
            // not exit process must be continue with next populate
            exit = false;
            // resolve to continue to normal process
            deferred.resolve({ exit : exit });
          } else {
            // verbose mode
            verbose('Max users limit was reach.', items.verbose);
            // verbose process
            verbose('Going to build reporting.', items.verbose);
            // build reporting here
            endingProcess({ report : report, output : items.output }).then(function () {
              // resolve to continue to normal process
              deferred.resolve({ exit : exit });
            }, function (err) {
              // log error
              report.error(err);
              // resolve response
              deferred.reject({ exit : exit });
            });
          }
        } else {
          // verbose process
          verbose('Going to build reporting.', items.verbose);
          // build reporting here
          endingProcess({ report : report, output : items.output }).then(function () {
            // resolve to continue to normal process
            deferred.resolve({ exit : exit });
          }, function (err) {
            // log error
            report.error(err);
            // resolve response
            deferred.reject({ exit : exit });
          });
        }
      });
    } else {
      // reject
      deferred.reject();
    }
  };
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
  daemons.delay(0);
  // start process
  if (daemons.isReady(true)) {
    // start daemon
    daemons.start();
  } else {
    // to do someting here before do other things
    report.error('Cannot start internal process. Daemon is not ready.');
  }
};

// Default export
module.exports = {
  process : process
};
