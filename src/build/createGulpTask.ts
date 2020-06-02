import path from 'path'
import chalk from 'chalk'
import gulp from 'gulp'
import log from 'fancy-log'
import plumber from 'gulp-plumber'
// @ts-ignore
import cleanCSS from 'gulp-clean-css'
import htmlmin from 'gulp-htmlmin'
import imagemin from 'gulp-imagemin'
import uglify from 'gulp-uglify'
import babel from 'gulp-babel'
import { Config, GulpTaskConfig } from '..'

function createConfig(options: Config): GulpTaskConfig {
  let root = options.root
  let src = path.join(root, options.src)
  let publish = path.join(root, options.publish)
  let staticPath = path.join(publish, options.static)
  let config: GulpTaskConfig = {
    css: {
      src: [src + '/**/*.css'],
      dest: staticPath
    },
    html: {
      src: [src + '/**/*.@(html|htm)'],
      dest: staticPath
    },
    img: {
      src: [src + '/**/*.@(jpg|jepg|png|gif|ico)'],
      dest: staticPath
    },
    js: {
      src: [
        src + '/lib/!(es5)/**/*.@(js|ts|jsx|tsx)',
        src + '/lib/*.@(js|ts|jsx|tsx)'
      ],
      dest: staticPath + '/lib'
    },
    es5: {
      src: [src + '/lib/es5/**/*.@(js|ts|jsx|tsx)'],
      dest: staticPath + '/lib/es5'
    },
    copy: {
      src: [src + '/**/!(*.@(html|htm|css|js|ts|jsx|tsx))'],
      dest: staticPath
    },
    publishCopy: {
      src: [
        root + (/^[a-zA-Z]+$/.test(options.publish) ? `/!(node_modules|${options.publish}|buildportal-script)/**/*`
          : `/!(node_modules|buildportal-script)/**/*`),
        root + (/^[a-zA-Z]+$/.test(options.publish) ? `/!(node_modules|${options.publish}|buildportal-script)`
          : `/!(node_modules|buildportal-script)`)
      ],
      dest: publish
    },
    publishBabel: {
      src: [
        root +
        `/!(node_modules|${
          /^[a-zA-Z]+$/.test(options.publish) ? options.publish + '|' : ''
        }buildportal-script)/**/*.@(js|ts|jsx|tsx)`,
        publish + '/*.@(js|ts|jsx|tsx)',
        root + '/*.@(js|ts|jsx|tsx)'
      ],
      dest: publish
    }
  }

  for (let key in options.gulp) {
    if (key in config) {
      // if options.gulp[key] === false, remove this task
      if (options.gulp[key] === false) {
        delete config[key]
      } else if (options.gulp[key]) {
        config[key].src = config[key].src.concat(options.gulp[key] as string[])
      }
    }
  }

  return config
}

export default function createGulpTask(options: Config): gulp.TaskFunction {
  let config: GulpTaskConfig = Object.assign(createConfig(options))

  let minifyCSS = () => {
    if (!config.css) {
      return
    }

    return gulp
      .src(config.css.src)
      .pipe(plumber())
      .pipe(
        cleanCSS(
          {},
          (details: Record<string, any>) => {
            let percent = (
              (details.stats.minifiedSize / details.stats.originalSize) *
              100
            ).toFixed(2)
            let message = `${details.name}(${chalk.green(percent)}%)`
            log('gulp-clean-css:', message)
          }
        )
      )
      .pipe(gulp.dest(config.css.dest))
  }

  let minifyHTML = () => {
    if (!config.html) {
      return
    }
    return gulp
      .src(config.html.src)
      .pipe(plumber())
      .pipe(
        htmlmin({
          collapseWhitespace: true
        })
      )
      .pipe(gulp.dest(config.html.dest))
  }

  let minifyImage = () => {
    if (!config.img) {
      return
    }
    return gulp
      .src(config.img.src)
      .pipe(plumber())
      .pipe(imagemin())
      .pipe(gulp.dest(config.img.dest))
  }

  let minifyES6 = () => {
    if (!config.js) {
      return
    }
    return gulp
      .src(config.js.src)
      .pipe(plumber())
      .pipe(babel(options.babel(false))) // , { babelrc: false }
      .pipe(uglify())
      .pipe(gulp.dest(config.js.dest))
  }

  let minifyES5 = () => {
    if (!config.es5) {
      return
    }
    return gulp
      .src(config.es5.src)
      .pipe(plumber())
      .pipe(uglify())
      .pipe(gulp.dest(config.es5.dest))
  }

  let publishCopy = () => {
    if (!config.publishCopy) {
      return
    }
    return gulp
      .src(config.publishCopy.src)
      .pipe(plumber())
      .pipe(gulp.dest(config.publishCopy.dest))
  }

  let publishBabel = () => {
    if (!config.publishBabel) {
      return
    }
    return gulp
      .src(config.publishBabel.src)
      .pipe(plumber())
      .pipe(babel(options.babel(true)))  // babelrc: false
      .pipe(gulp.dest(config.publishBabel.dest))
  }

  let copy = () => {
    if (!config.copy) {
      return
    }
    return gulp
      .src(config.copy.src)
      .pipe(plumber())
      .pipe(gulp.dest(config.copy.dest))
  }

  let parallelList = [
    config.html && minifyHTML,
    config.css && minifyCSS,
    config.es5 && minifyES5,
    config.js && minifyES6,
    config.img && minifyImage
  ].filter(Boolean)

  let seriesList  = [
    config.publishCopy && publishCopy,
    config.publishBabel && publishBabel,
    config.copy && copy,
  ].filter(Boolean)

  return gulp.series(...seriesList, gulp.parallel(...parallelList))
}
