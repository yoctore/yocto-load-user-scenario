'use strict';

var chalk     = require('chalk');
var joi       = require('joi');
var usage     = require('command-line-usage');
var fs        = require('fs');
var report    = require('./report');

// default constants
var DEFAULT_USER            = 1;
var DEFAULT_TIME            = 2000;
var DEFAULT_TIMEOUT         = 10000;
var REQUEST_PER_SECOND      = 1;

/**
 * Utility method to show required options
 *
 * @return {String} message with required message
 */
var required = function () {
  // default statement
  return chalk.red('[bold]{(Required)}');
};

/**
 * Utility method to show optional options
 *
 * @return {String} message with required message
 */
var optional = function () {
  // default statement
  return chalk.green('[bold]{(Optional)}');
};

/**
 * Utility method to show default options
 *
 * @return {String} message with required message
 */
var byDefault = function (value) {
  // default statement
  return chalk.yellow([ '[bold]{(Default : ', value, ')}' ].join(''));
};

// Default options
var options = [
  // Scenario property
  {
    name          : 'scenario',
    alias         : 's',
    type          : String,
    group         : 'config',
    description   : [ 'Path file of scenario to use.\n',
                      'This file must be a HAR file exported by Chrome.', required() ].join(' ')
  },
  // Logging property
  {
    name          : 'verbose',
    alias         : 'v',
    type          : Boolean,
    group         : 'logging',
    description   : [ 'Display all request on verbose mode.', optional() ].join(' ')
  },
  // Request property
  {
    name          : 'user',
    alias         : 'u',
    type          : Number,
    group         : 'request',
    description   : [ 'Define how many simultaneous user must be process.',
                      byDefault(DEFAULT_USER), optional() ].join(' ')
  },
  {
    name          : 'wait',
    alias         : 'w',
    type          : Number,
    group         : 'request',
    description   : [ 'Define time between each request (Ms)',
                      byDefault(DEFAULT_TIME), optional() ].join(' ')
  },
  {
    name          : 'timeout',
    alias         : 't',
    type          : Number,
    group         : 'request',
    description   : [ 'Define timeout for each request (Ms)',
                      byDefault(DEFAULT_TIMEOUT), optional() ].join(' ')
  },
  {
    name          : 'request',
    alias         : 'r',
    type          : Number,
    group         : 'request',
    description   : [ 'Define how many requests each client will send per second.',
                      byDefault(REQUEST_PER_SECOND), optional() ].join(' ')
  },
  // Output property
  {
    name          : 'output',
    alias         : 'o',
    type          : Boolean,
    group         : 'output',
    description   : [ 'Type of output to use. If disable print on terminal.',
                      'Otherwise print your file on /tmp directory.',
                      byDefault('terminal'), optional() ].join(' ')
  },
  // Security / Mode property
  {
    name          : 'daemon',
    alias         : 'd',
    type          : Boolean,
    group         : 'mode',
    description   : [ 'Start script on daemon mode with pm2 otherwise on classic fork mode.',
                      optional() ].join(' ')
  },
  {
    name          : 'insecure',
    alias         : 'i',
    type          : Boolean,
    group         : 'mode',
    description   : [ 'Allow invalid and self-signed certificates over https.',
                      byDefault('No'), optional() ].join(' ')
  },
  {
    name          : 'progressive',
    alias         : 'p',
    type          : Boolean,
    group         : 'mode',
    description   : [ 'Define if load must be progressive.',
                      byDefault('No'), optional() ].join(' ')
  },
  // Help property
  {
    name        : 'help',
    alias       : 'h',
    type        : Boolean,
    group       : 'help',
    description : 'Display current help.'
  }
];

// Default section list
var sections = [
  {
    content     : report.header(fs.readFileSync('lib/ascii/tank-ascii.txt').toString()),
    raw         : true
  },
  {
    header      : 'Overview',
    content     : [ 'Welcome to "yocto load scenario" help.',
                  'Please read properly each options before start your test' ].join(' ')
  },
  {
    header      : 'Help options',
    optionList  : options,
    group       : [ 'help' ]
  },
  {
    header      : 'Scenario options',
    optionList  : options,
    group       : [ 'config' ]
  },
  {
    header      : 'Logging options',
    optionList  : options,
    group       : [ 'logging' ]
  },
  {
    header      : 'Request options',
    optionList  : options,
    group       : [ 'request' ]
  },
  {
    header      : 'Security / Mode options',
    optionList  : options,
    group       : [ 'mode' ]
  },
  {
    header      : 'Output/Report options',
    optionList  : options,
    group       : [ 'output' ]
  }
];

// default schema to use for validation
var schema = joi.object().required().keys({
  config    : joi.object().required().keys({
    scenario  : joi.string().required().empty()
  }),
  logging   : joi.object().optional().keys({
    verbose : joi.boolean().optional().default(false)
  }).default({ verbose : false }),
  request   : joi.object().optional().keys({
    user        : joi.number().optional().default(DEFAULT_USER).min(1),
    wait        : joi.number().optional().default(DEFAULT_TIME).min(0),
    timeout     : joi.number().optional().min(0).default(DEFAULT_TIMEOUT),
    request     : joi.number().optional().min(REQUEST_PER_SECOND).default(REQUEST_PER_SECOND),
  }).default({
    user        : DEFAULT_USER,
    time        : DEFAULT_TIME,
    limit       : DEFAULT_TIMEOUT,
    request     : REQUEST_PER_SECOND
  }),
  output    : joi.object().optional().keys({
    output  : joi.boolean().optional().default(false)
  }).default({ output : false }),
  mode      : joi.object().optional().keys({
    daemon      : joi.boolean().optional().default(false),
    progressive : joi.boolean().optional().default(false),
    insecure    : joi.boolean().optional().default(false)
  }).default({ daemon : false, progressive : false, insecure : false })
}).unknown(['_all', 'help' ]);

/**
 * Display usage on current terminal
 */
var showUsage = function () {
  console.log(usage(sections));
};

/**
 * Validate current configuration for given options
 *
 * @param {Object} value default config to validate
 * @return {Object} result to process
 */
var validate = function (value) {
  // default statement
  return joi.validate(value, schema);
};

// Default exports
module.exports = {
  usage     : showUsage,
  validate  : validate,
  options   : options
};
