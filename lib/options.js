'use strict';

var chalk     = require('chalk');
var joi       = require('joi');
var report    = require('./report');
var usage   = require('command-line-usage');

// default constants
const DEFAULT_USER    = 1;
const DEFAULT_TIME    = 2000;
const DEFAULT_OUTPUT = 'terminal';
const DEFAULT_LIMIT_EXECUTION_TIME = 10000;

var required = function () {
  // default statement
  return chalk.red('[bold]{(Required)}');
};

var optionnal = function () {
  // default statement
  return chalk.green('[bold]{(Optionnal)}');
};

var byDefault = function (value) {
  return chalk.yellow([ '[bold]{(Default : ', value, ')}' ].join(''));
};

// Default options
const options = [
  // Scenario property
  {
    name          : 'scenario',
    alias         : 's',
    type          : String,
    group         : 'config',
    description   : [ 'Path file of scenario to use. ', required() ].join('')
  },
  // Logging property
  {
    name          : 'verbose',
    alias         : 'v',
    type          : Boolean,
    group         : 'logging',
    description   : [ 'Display all request on verbose mode.', optionnal() ].join('')
  },
  // Request property
  {
    name          : 'user',
    alias         : 'u',
    type          : Number,
    group         : 'request',
    description   : [ 'Define how many simultaneous user must be emulate.',
                      byDefault(DEFAULT_USER), optionnal() ].join(' ')
  },
  {
    name          : 'time',
    alias         : 't',
    type          : Number,
    group         : 'request',
    description   : [ 'Define time between each request.',
                      byDefault(DEFAULT_TIME), optionnal() ].join(' ')
  },
  {
    name          : 'limit',
    alias         : 'l',
    type          : Number,
    group         : 'request',
    description   : [ 'Define limit execution time for each request.',
                      byDefault(DEFAULT_LIMIT_EXECUTION_TIME), optionnal() ].join(' ')
  },
  {
    name          : 'progressive',
    alias         : 'p',
    type          : Boolean,
    group         : 'request',
    description   : [ 'Define if load must be progressive ',
                      byDefault('No'), optionnal() ].join(' ')
  },
  // Output property
  {
    name          : 'output',
    alias         : 'o',
    type          : String,
    group         : 'output',
    description   : [ 'Type of output to use.',
                      byDefault(DEFAULT_OUTPUT),
                      'In case of file a path must be provide.', optionnal() ].join(' ')
  },
  // Help property
  {
    name          : 'daemon',
    alias         : 'd',
    type          : Boolean,
    group         : 'mode',
    description   : [ 'Start script on daemon mode with pm2 otherwise on default classic mode',
                      optionnal() ].join(' ')
  },
  // Help property
  {
    name        : 'help',
    alias       : 'h',
    type        : Boolean,
    group       : 'help',
    description : 'Display current help'
  }
];


// Default section list
const sections = [
  {
    content     : report.header('YOCTO LOAD SCENARIO HELP'),
    raw         : true
  },
  {
    header      : 'Overview',
    content     : [ 'Welcome to "yocto load scenario" help.',
                  'Please read properly each argument before start' ].join(' ')
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
    header      : 'Output/Report options',
    optionList  : options,
    group       : [ 'output' ]
  },
  {
    header      : 'Mode options',
    optionList  : options,
    group       : [ 'mode' ]
  }  
];

// default schema to use for validation
const schema = joi.object().required().keys({
  config    : joi.object().required().keys({
    scenario  : joi.string().required().empty()
  }),
  logging   : joi.object().optional().keys({
    verbose : joi.boolean().optional().default(false)
  }).default({ verbose : false }),
  request   : joi.object().optional().keys({
    user        : joi.number().optional().default(DEFAULT_USER).min(1),
    time        : joi.number().optional().default(DEFAULT_TIME).min(0),
    progressive : joi.boolean().optional().default(false),
    limit       : joi.number().optional().min(0).default(DEFAULT_LIMIT_EXECUTION_TIME)
  }).default({
    user        : DEFAULT_USER,
    time        : DEFAULT_TIME,
    progressive : false,
    limit       : DEFAULT_LIMIT_EXECUTION_TIME
  }),
  output    : joi.object().optional().keys({
    output  : joi.string().optional().empty().default(DEFAULT_OUTPUT)
  }).default({ output : DEFAULT_OUTPUT }),
  mode      : joi.object().optional().keys({
    daemon  : joi.boolean().optional().default(false)
  }).default( { daemon : false })
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