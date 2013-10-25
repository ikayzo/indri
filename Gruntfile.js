module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);
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
        files: {
          'src/css/indri.css': 'src/css/indri.scss'
        }
      }
    },
    cssmin: {
      add_banner: {
        options: {
          banner: '/* <%= pkg.name %>-<%= pkg.version %> minified css file */'
        },
        files: {
          'build/<%= pkg.name %>-<%= pkg.version %>/indri.min.css': ['src/css/indri.css']
        }
      }
    },
    concat: {
      options: {
        banner: '/*! <%= pkg.name %>-<%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
        separator: ';'
      },
      dist: {
        src: [
          'src/js/indri.fsm.js',
          'src/js/indri.base.js',
          'src/js/indri.content.renderer.base.js',
          'src/js/indri.content.renderers.js',
          'src/js/indri.location.renderers.js',
          'src/js/indri.main.js'
        ],
        dest: 'build/<%= pkg.name %>-<%= pkg.version %>/indri.js'
      }
    },
    copy: {
      main: {
        files: [{
          cwd: 'src',
          expand: true,
          filter: 'isFile',
          src: ['templates/*.html', 'img/*'],
          dest: 'build/<%= pkg.name %>-<%= pkg.version %>/',
          filter: 'isFile'
        },{
          cwd: 'src/css',
          expand: true,
          filter: 'isFile',
          src: ['indri.css'],
          dest: 'build/<%= pkg.name %>-<%= pkg.version %>/',
          filter: 'isFile'
        },{
          cwd: 'src/css',
          expand: true,
          filter: 'isFile',
          src: ['fonts/*'],
          dest: 'build/<%= pkg.name %>-<%= pkg.version %>/',
          filter: 'isFile'
        },{
          cwd: 'build',
          expand: true,
          src: [
            '<%= pkg.name %>-<%= pkg.version %>/*',
            '<%= pkg.name %>-<%= pkg.version %>/fonts/*',
            '<%= pkg.name %>-<%= pkg.version %>/img/*',
            '<%= pkg.name %>-<%= pkg.version %>/templates/*'
          ],
          dest: 'examples/'
        }]
      },
      update_filesystem: {
        files: [{
          cwd: 'src/filesystems',
          expand: true,
          filter: 'isFile',
          src: ['*'],
          filter: 'isFile',
          dest: '../indri-filesystem/'
        }],
      }
    },
    clean: ['build', 'examples/<%= pkg.name %>-*/']
  });

  grunt.registerTask('default', ['sass']);
  grunt.registerTask('release', ['clean', 'sass', 'cssmin', 'uglify', 'concat', 'copy:main', 'copy:main']);
  grunt.registerTask('update-filesystem', ['copy:update_filesystem']);
};
