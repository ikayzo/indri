module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
        mangle: false,
        preserveComments: false
      },
      build: {
        files: {
          'build/<%= pkg.name %>.min.js': [
            'js/indri.fsm.js',
            'js/indri.base.js',
            'js/indri.content.renderer.base.js',
            'js/indri.content.renderers.js',
            'js/indri.location.renderers.js',
            'js/indri.main.js'
          ]
        }
      }
    },
    sass: {
      dist: {
        files: [{
          expand: true,
          cwd: 'styles',
          src: ['css/*.scss'],
          dest: 'css/',
          ext: '.css'
        }]
      }
    }
  });

  //grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('default', ['uglify']);
};
