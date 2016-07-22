'use strict';

var _       = require('lodash');
var request = require('request');
var args    = require('command-line-args');
var options = require('./lib/options');
var report  = require('./lib/report');
var config  = require('./lib/config');
var daemon  = require('./lib/daemon');

// get args
const command = args(options.options);

// validate args
var validate = options.validate(command);

// has error ?
if (!_.isNull(validate.error)) {
  // is no help ?
  if (!validate.value.help.help) {
    // show error
    report.error(validate.error.toString());
  }
  // show help
  options.usage();
} else {
  // valid config before continue
  config.isValid(validate.value).then(function (ready) {
    // process
    daemon.process(ready);
  }, function (error) {
    // is not cacel by user code ?
    if (error !== 900) {
      // log error
      report.error(error);
    } else {
        console.log(error);
    }
  });
};
