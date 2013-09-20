module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %>-<%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
        mangle: false,
        preserveComments: false
      },
      build: {
        files: {
          'build/<%= pkg.name %>-<%= pkg.version %>/indri.min.js': [
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
        files: {
          'css/indri.css': 'css/indri.scss'
        }
      }
    },
    cssmin: {
      add_banner: {
        options: {
          banner: '/* <%= pkg.name %>-<%= pkg.version %> minified css file */'
        },
        files: {
          'build/<%= pkg.name %>-<%= pkg.version %>/indri.min.css': ['css/indri.css']
        }
      }
    },
    copy: {
      main: {
        files: [{
          src: [
            'templates/*.html',
            'fonts/*',
            'img/*'
          ],
          dest: 'build/<%= pkg.name %>-<%= pkg.version %>/', filter: 'isFile'}
        ]}
    },
    clean: ["build"]
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('default', ['sass']);
  grunt.registerTask('release', ['clean', 'sass', 'cssmin', 'uglify', 'copy']);
};
