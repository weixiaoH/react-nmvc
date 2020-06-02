import path from 'path'
import del from 'del'
import gulp from 'gulp'
import getConfig from '../config'
import { Option } from "node-notifier";
import { Options, Config } from '..'
import createGulpTask from './createGulpTask'
process.env.NODE_ENV = process.env.NODE_ENV || 'production'

export default function build(options: Option): Promise<Config | void> {
    let config = getConfig(options)
    let delPublicPgs = () => delPublish(path.join(config.root, config.publish))
    let startGulpPgs = () => startGulp(config)
    let startWebpackPgs = () =>
    Promise.all(
      [
        startWebpackForClient(config),
        config.useServerBundle && startWebpackForServer(config)
      ].filter(Boolean)
    )
}

function delPublish(folder: string): Promise<string[]> {
  console.log(`delete publish folder: ${folder}`)
  return del(folder)
}

function startGulp(config: Config): Promise<Config> {
  return new Promise((resolve, reject) => {
    gulp.task('default', createGulpTask(config))

    let taskFunction: gulp.TaskFunction = (error) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    }
    gulp.series('default')(taskFunction)
  })
}

function startWebpackForClient(config: Config): Promise<Config | boolean> {
  let webpackConfig = createWebpackConfig(config, false)
  return new Promise((resolve, reject) => {
    webpack(webpackConfig, (error, stats) => {
      if (error) {
        reject(error)
      } else {
        if (config.webpackLogger) {
          console.log(
            '[webpack:client:build]',
            stats.toString(config.webpackLogger)
          )
        }
        resolve()
      }
    })
  })
}