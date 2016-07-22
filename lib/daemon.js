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

// disable daemons logs
daemons.logger.disableConsole();

// default scenarion storage
var storeConfig = [];

var populate = function () {
  // create defer process
  var deferred = Q.defer();
  // has valid value ?
  if (_.has(storeConfig, 'config') && !_.isEmpty(storeConfig.config)) {
    // resolve with correct data
    deferred.resolve({
      priority  : 1,
      callback  : function (data) {
        console.log('data =>', data); 
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
  var report = [];

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
          var sp = spin([ 'Processing request for [', entry.url, ']' ].join(' '));
          sp.start();

          // verbose process
          verbose([ 'Load for [', pages.id, '] - [',
                    entry.url, '] was started' ].join(' '), items.verbose);
          // load test
          loadtest.loadTest(_.extend(entry, {
            // status callback for each request
            statusCallback : function (latency, result, error) {
              report.push(_.extend({ url : entry.url }, _.merge(latency,
                _.omit(result, [ 'body', 'headers', 'instanceIndex', 'requestIndex' ]))));
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
        // verbose process
        verbose('Going to process reporting.', items.verbose);

        //console.log('check here if is progressive or finish');
        //console.log(utils.obj.inspect(report));
        // need to build report maybe ?
        deferred.resolve(report);
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
  daemons.delay(10);
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