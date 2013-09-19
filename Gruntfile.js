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
            'src/js/indri.fsm.js',
            'src/js/indri.base.js',
            'src/js/indri.content.renderer.base.js',
            'src/js/indri.content.renderers.js',
            'src/js/indri.location.renderers.js',
            'src/js/indri.main.js'
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
