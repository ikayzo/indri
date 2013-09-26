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
    /*combine:{
      single:{
        input: "build/<%= pkg.name %>-<%= pkg.version %>/<%= pkg.name %>.min.css",
        output: "build/<%= pkg.name %>-<%= pkg.version %>/<%= pkg.name %>.min.css",
        tokens:[{
          token: "\.\.\/fonts",
          string: "fonts"
        }]
      }
    },*/
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
        }
        ]}
    },
    clean: ['build', 'examples/<%= pkg.name %>-*/']
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks("grunt-combine");
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-uglify');


  grunt.registerTask('default', ['sass']);
  grunt.registerTask('release', ['clean', 'sass', 'cssmin', 'uglify', 'copy', 'copy']);
};
