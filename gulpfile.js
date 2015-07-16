'use strict';

var browserify = require('browserify'),
    browserSync = require('browser-sync'),
    buffer = require('vinyl-buffer'),
    chalk = require('chalk'),
    collapse = require('bundle-collapser/plugin'),
    derequire = require('gulp-derequire'),
    exorcist = require('exorcist'),
    gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    rename = require('gulp-rename'),
    source = require('vinyl-source-stream'),
    strip = require('gulp-strip-debug'),
    uglify = require('gulp-uglify'),
    watchify = require('watchify');

var standaloneName = 'assetsLoader',
    entryFileName = 'index.js',
    bundleFileName = 'assets-loader.js';

// log
function logError(msg) {
  console.log(chalk.bold.red('[ERROR] ' + msg.toString()));
}

// bundler
var bundler = watchify(browserify({
  entries: ['./src/' + entryFileName],
  standalone: standaloneName,
  debug: true
}, watchify.args));

function bundle() {
  return bundler
    .bundle()
    .pipe(exorcist('./dist/' + bundleFileName + '.map'))
    .on('error', logError)
    .pipe(source(bundleFileName))
    .pipe(buffer())
    .pipe(derequire())
    .pipe(gulp.dest('./dist/'))
    .pipe(rename({ extname: '.min.js' }))
    .pipe(strip())
    .pipe(uglify())
    .pipe(gulp.dest('./dist/'));
}

bundler.on('update', bundle); // on any dep update, runs the bundler
gulp.task('bundle', ['jshint'], bundle);

// release bundle with extra compression (can't get collapse to work with watchify)
function bundleRelease(minify) {
  var bundler = browserify({
    entries: ['./src/' + entryFileName],
    standalone: standaloneName,
    debug: !minify
  });

  if(minify) {
    bundler = bundler.plugin(collapse);
  }

  var stream = bundler.bundle()
    .on('error', logError);

  if(!minify) {
    stream = stream.pipe(exorcist('./dist/' + bundleFileName + '.map'));
  }

  stream = stream.pipe(source(bundleFileName))
    .pipe(buffer())
    .pipe(derequire())
    .pipe(strip());

  if(minify) {
    return stream.pipe(rename({extname: '.min.js'}))
      .pipe(uglify())
      .pipe(gulp.dest('./dist/'));
  } else {
    return stream.pipe(gulp.dest('./dist/'));
  }
}

gulp.task('release', function() {
  bundleRelease(true);
  bundleRelease(false);
});

// connect browsers
gulp.task('connect', function() {
  browserSync.init({
    server: {
      baseDir: ['./', 'examples']
    },
    files: [
      'dist/*',
      'examples/**/*'
    ],
    reloadDebounce: 500
  });
});

// reload browsers
gulp.task('reload', function() {
  browserSync.reload();
});

// js hint
gulp.task('jshint', function() {
  return gulp.src([
      './gulpfile.js',
      'src/**/*.js',
      'test/**/*.js',
      'examples/**/*.js',
      '!examples/js/highlight.pack.js'
  ])
  .pipe(jshint())
  .pipe(jshint.reporter('jshint-stylish'));
});

// watch
gulp.task('watch', function() {
  gulp.watch('test/**/*.js', ['jshint']);
  gulp.watch('examples/**/*.js', ['jshint']);
});

// default
gulp.task('default', ['connect', 'watch', 'bundle']);
