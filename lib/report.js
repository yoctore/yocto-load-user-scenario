'use strict';

var Table     = require('cli-table');
var _         = require('lodash');
var chalk     = require('chalk');

/**
 * Default help utility method to provide table representation for report
 *
 * @param {String} title default title to use on message
 * @param {Array} values values to build
 * @return {String} message to use
 */
var build = function (titles, values) {

  // build tables
  var table = new Table({
    head      : titles,
    style     : { head : [ 'cyan' ], border : [ 'white' ] },
  });

  // build values  
  values = _.every(values, function (value) {
    table.push(value);
    return true;
  });

  // default statement
  return table.toString();
}

/**
 * Default help utility method to provide header for message
 *
 * @param {String} title default title to use on message
 * @return {Stirng} message to use
 */
var header = function (title) {
  // default statement
  return new Table({
    head      : [ [ '\n', title ].join(' ') ],
    style     : { head : [ 'cyan' ], border : [ 'white' ] },
    colWidths : [ 100 ],
    chars     : {
      'top'           : '',
      'top-mid'       : '',
      'top-left'      : '',
      'top-right'     : '',
      'bottom'        : '═',
      'bottom-mid'    : '╧',
      'bottom-left'   : '╚',
      'bottom-right'  : '',
      'left'          : '',
      'left-mid'      : '',
      'mid'           : '',
      'mid-mid'       : '',
      'right'         : '',
      'right-mid'     : '',
      'middle'        : ''
    }
  }).toString();
};

/**
 * Default help utility method to provide report content
 *
 * @param {String} titles default titles to use on report
 * @param {Array} values values to use on report
 * @param {String} mode default mode to use for report, terminal or to a file
 * @return {Stirng} builded report a specific message
 */
var report = function (titles, values, mode) {
  // normalize mode
  mode = mode || 'terminal';
  // default statement
  return mode === 'terminal' ? build(titles, values) : 'Not impleted Yet for file';
};

/**
 * Display on error given message
 * @param {String} message default message to display
 */
var error = function (message) {
  console.log(header('OCCURED ERRORS'));
  console.error([ '\n', chalk.red('>') ].join(''), message);
};

/**
 * Display on info message
 * @param {String} message default message to display
 * @param {Boolean} if true add chariot on begin of line
 */
var info = function (message, chariot) {
  console.log([ chariot ? '\n' : '', chalk.green('>') ].join(''), message);
};

// default export
module.exports = {
  report  : report,
  header  : header,
  error   : error,
  info    : info
};