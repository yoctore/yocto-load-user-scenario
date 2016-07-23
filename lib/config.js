'use strict';

var inquirer = require('inquirer');
var Q        = require('q');
var report   = require('./report');
var fs       = require('fs-extra');
var joi      = require('joi');
var _        = require('lodash');
var Spinner  = require('cli-spinner').Spinner;
var chalk    = require('chalk');
var uuid     = require('uuid');
var path     = require('path');

/**
 * Check if givent config is valid
 *
 * @param {Object} command options list to valid
 * @return {Boolean} true in case of valid config otherwise false
 */
var isValid = function (command) {
  // create async process here for validation
  var deferred = Q.defer();

  // get domain name
  var domain  = path.basename(command.config.scenario).replace('.har', '');
  // build output path file name
  var output  = command.output.output ? [ '/tmp', [
    [ domain, uuid.v4() ].join('-'), 'report' ].join('.')
  ].join('/') : 'terminal';

  // change output value
  command.output.output = output;

  // build resume config
  var config = [
    { 'Scenario path : ' : command.config.scenario },
    { 'Verbosity mode : ' : command.logging.verbose ? 'Enabled' : 'Disabled' },
    { 'Simultaneous users : ' : command.request.user },
    { 'Request wait delay : ' : [ command.request.wait,  'Ms' ].join(' ') },
    { 'Request timeout : ' : [ command.request.timeout, 'Ms' ].join(' ') },
    { 'Request per second : ' : command.request.request },
    { 'Report output : ' : command.output.output },
    { 'Progressive mode : ' : command.mode.progressive ? 'Enabled' : 'Disabled' },
    { 'Insecure Mode : ' : command.mode.insecure ? 'Yes' : 'No' },
    { 'Script mode : ' : command.mode.daemon ? 'Daemonized' : 'fork' }
  ];
  // Create Spinner
  var spinner = new Spinner([ chalk.green('>'), 'Reading and validating your given scenario [',
                              command.config.scenario, '] %s' ].join(' '));
  spinner.setSpinnerString('|/-\\');
  // start spinner
  spinner.start();
  // need to process a timeout to display properly the spinner process
  var timeout = setTimeout(function () {
    // remove timeout
    clearTimeout(timeout);
    // checkif configuration file exists and if format is valid
    fs.stat(command.config.scenario, function (error, stats) {
      // has error ?
      if (error) {
        // reject with error
        deferred.reject([ 'Config file seems to be invalid' , error.toString() ].join(' => '));
      } else {
        // is file ?
        if (!stats.isFile()) {
          // remove spinner
          spinner.stop(false);
          // reject with error
          deferred.reject([ 'Config file',
            [ '[', command.config.scenario, ']' ].join(' '), 'is not a json file' ].join(' '));
        } else {
          // is a valid json file
          try {
            // load given config to check if a valid json format
            var json = JSON.parse(fs.readFileSync(command.config.scenario));
            // stop snipper
            spinner.stop(false);
            // show confirmation
            console.log(report.header('\nSCENARIO CONFIRMATION'));
            console.log([ '\n', 'Find below your given configuration,',
                          'please confirm these values before to continue', '\n' ].join(' '));
            console.log(report.report([ 'Parameters', 'Value' ], config));

            // validate here
            var validate = validator(json);

            // is a valid file ?
            if (_.isNull(validate.error)) {
              // here build correct config file
              var scenario = build(validate.value);

              // prompt confirmation
              inquirer.prompt({
                type    : 'confirm',
                name    : 'ready',
                message : 'Really want to start load process ?'
              }).then(function (response) {
                // ready ?
                if (response.ready) {
                  // resolve
                  deferred.resolve({
                    config            : scenario,
                    verbose           : command.logging.verbose,
                    // change user value if is progressive mode
                    // need to set at 1 if this mode is enable
                    users             : command.mode.progressive ? 1 : command.request.user,
                    wait              : command.request.wait,
                    timeout           : command.request.timeout,
                    output            : command.output.output,
                    mode              : command.mode.daemon,
                    progressive       : command.mode.progressive,
                    limitUser         : command.request.user,
                    insecure          : command.mode.insecure,
                    requestPerSecond  : command.request.request
                  });
                } else {
                  // reject with not ready error code
                  deferred.reject(900);
                }
              });
            } else {
              // has error reject
              deferred.reject(validate.error.toString());
            }
          } catch (e) {
            // is invalid json format
            deferred.reject('Config file is not json or HAR file. Exception =>', e.message);
          }
        }
      }
    });
  }, 2000);
  // default statement
  return deferred.promise;
};

// default schema to use for validation
var schema = joi.object().required().keys({
  log : joi.object().required().keys({
    pages   : joi.array().required().items(joi.object().keys({
      id    : joi.string().required().empty(),
      title : joi.string().required().empty()
    }).unknown()),
    entries : joi.array().required().items(joi.object().keys({
      request : joi.object().required().keys({
        method      : joi.string().required().empty().valid([
          'OPTIONS', 'HEAD', 'GET', 'POST', 'PUT', 'DELETE', 'TRACE', 'CONNECT', 'PATCH'
        ]),
        url         : joi.string().required().empty(),
        headers     : joi.array().items({
          name  : joi.string().required().empty(),
          value : joi.string().required().empty()
        }),
        queryString : joi.array().items({
          name  : joi.string().required().empty(),
          value : joi.string().required().empty('')
        })
      }).unknown(),
      pageref : joi.string().required().empty()
    }).unknown())
  }).unknown()
});

/**
 * Valid current given json
 *
 * @param {Object} json default json to validate
 * @return {Object} validate result
 */
var validator = function (json) {
  // default statement
  return joi.validate(json, schema);
};

/**
 * Build list of request to process
 *
 * @param {String} json json to use for request building
 * @return {Array} list of request to process page by page
 */
var build = function (json) {
  // get pages
  var pages   = _.map(json.log.pages, function (page) {
    return _.pick(page, [ 'id', 'title' ]);
  });

  // get entries
  var entries = _.flatten(_.map(json.log.entries, function (entry) {
    // default statement
    return {
      ref   : entry.pageref,
      entry : _.map(_.pick(entry, [ 'request' ]), function (request) {
        // for headers building
        var headers = {};
        // normalize headers
        _.map(request.headers, function (header) {
          // build properly header object for loadtest
          _.set(headers, header.name, header.value);
        });

        // set headers
        request.headers = headers;

        // default statement
        return _.pick(request, [ 'method', 'url', 'headers', 'queryString' ]);
      })
    };
  }));

  // return builded entries
  return _.map(pages, function (page) {
    // default statement
    return _.extend(page, {
      entries : _.flatten(_.map(entries, function (entry) {
        return entry.ref === page.id ? entry.entry : false;
      }))
    });
  });
};

// default export
module.exports = {
  isValid : isValid
};
