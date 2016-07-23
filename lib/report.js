'use strict';

var Table     = require('cli-table');
var _         = require('lodash');
var chalk     = require('chalk');
var fs        = require('fs-extra');
var path      = require('path');
var Q         = require('Q');

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
 * @param {Object} style style to use
 * @return {Stirng} message to use
 */
var header = function (title, style) {
  // default statement
  return new Table({
    head      : [ [ '\n', title ].join(' ') ],
    style     : _.merge({ head : [ 'cyan' ], border : [ 'white' ] }, style || {}),
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

var reportTerminal = function (report, toFile) {
  // normalize toFile state
  toFile = _.isBoolean(toFile) ? toFile : false;
  // get correct value
  report = _.first(report);

  // final report
  var content = header('LOAD REPORT');
  // maybe here print a legende
  content += '\n' + header(report.title, { 'padding-left': 3 });

  // normalize report
  var normalized = _.flatten(report.result);

  // build
  _.every(normalized, function (item) {
  // build default table report
    var table = new Table({
      head  : [ 'Total Req.', 'Total err.', 'Total time (Sec)', 'RPS',
               'Mean lat. (Ms)', 'Max lat. (Ms)', 'Min lat. (Ms)', 'Percentiles',
               'Error codes', 'Status Code', 'Elap. time (Ms)' ],
      style : { head : [ 'cyan' ], border : [ 'white' ] } });
      
    // normalize percentiles
    item.percentiles = _.map(item.percentiles, function (v, k) {
      // default statement
      return [ k, v ].join(' : ');
    }).join('\n');

    // normalize errorCodes
    item.errorCodes = _.map(item.errorCodes, function (v, k) {
      // default statement
      return [ k, v ].join(' : ');
    }).join('\n')

    // maybe here print a legende
    content += [ '\n', header(item.url, { 'padding-left': 6 }), '\n' ].join('');

    // push items
    table.push([
      item.totalRequests,
      item.totalErrors,
      item.totalTimeSeconds,
      item.rps,
      item.meanLatencyMs,
      item.maxLatencyMs,
      item.minLatencyMs,
      item.percentiles,
      item.errorCodes,
      item.statusCode || '',
      item.requestElapsed || ''
    ]);
    // push item on table
    content += table.toString();
    // go next
    return true;
  });
  // not to a file ? so in terminal
  if (!toFile) {
    console.log('alE');
    // normal print
    console.log(content);
  }
  // return content
  return content;
};

var reportToFile = function (report, filePath) {
  // get content before write to file
  var content = reportTerminal(report, true);
  console.log(content);
  // create defere process
  var deferred = Q.defer();
  // write file
  fs.outputFileSync(path.resolve(filePath), content);
  /*, function (err) {
    // has error 
    if (err) {
      // log error message
      error([ 'An error occured during saving our report on', filePath,
              'error is :', err ].join(' '))
      // rejet
      deferred.reject();
    } else {
      // info message
      info([ 'Your report was saved on :', filePath ].join(' '));
      // resolve all is ok
      deferred.resolve();
    }
  });*/
  // default statement
  return deferred.promise;
}

// default export
module.exports = {
  report          : report,
  header          : header,
  error           : error,
  info            : info,
  reportTerminal  : reportTerminal,
  reportToFile    : reportToFile,  
};