'use strict';

module.exports = function (grunt) {
  // init config
  grunt.initConfig({
    // default package
    pkg       : grunt.file.readJSON('package.json'),

    // hint our app
    yoctohint : {
      options  : {},
      all      : [
        'src/***',
        'Gruntfile.js'
      ]
    }
  });

  // load tasks
  grunt.loadNpmTasks('yocto-hint');

  // register tasks
  grunt.registerTask('hint', [ 'yoctohint' ]);
  grunt.registerTask('default', [ 'hint' ]);
};
