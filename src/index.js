const {Command, flags} = require('@oclif/command')
const {cli} = require('cli-ux')
const execa = require('execa')
const HTMLParser = require('node-html-parser')
const fs = require('fs')
const templates = require('./templates')

const changeTitle = (html, appName) => {
  const title = html.querySelector('title')
  title.set_content(appName)
}

const changeDescription = (html, description) => {
  const metaTags = html.querySelectorAll('meta')
  metaTags.forEach(tag => {
    if (tag.rawAttrs.includes('description')) {
      tag.rawAttrs = 'name="description" content="' + description + '" '
    }
  })
}

const changeThemeColor = (html, color) => {
  const metaTags = html.querySelectorAll('meta')
  metaTags.forEach(tag => {
    if (tag.rawAttrs.includes('theme-color')) {
      tag.rawAttrs = 'name="theme-color" content="' + color + '" '
    }
  })
}

const htmlWithNoscript = html => {
  return html.toString().replace('<noscript></noscript>', templates.noscript)
}

const appendFavicons = (html, name, themeColor) => {
  const head = html.querySelector('head')
  head.insertAdjacentHTML('beforeend', templates.favicons(name, themeColor))
}

class SveltePwaCommand extends Command {
  async run() {
    const {args} = this.parse(SveltePwaCommand)
    if (!args.path) {
      this.error('Please specify a path')
      return
    }

    const name = await cli.prompt('App name')
    const description = await cli.prompt('App description')
    const themeColor = await cli.prompt('Theme color (hex)')
    const backgroundColor = await cli.prompt('Theme background color (hex)')
    const routify = await cli.confirm('Do you want to include routify? n/y')
    this.log('https://favicomatic.com/')
    const usingFavicomatic = await cli.confirm('Are you using favicomatic for your icons? n/y')
    cli.action.start('Creating project', 'initializing', {stdout: true})
    if (routify) {
      this.log(`npx degit jenaro94/routify-pwa-starter ${args.path}`)
      await execa('npx', ['degit', 'jenaro94/routify-pwa-starter', args.path])
    } else {
      this.log(`npx degit tretapey/svelte-pwa ${args.path}`)
      await execa('npx', ['degit', 'tretapey/svelte-pwa', args.path])
    }
    const packageJS = await execa('cat', [`${args.path}/package.json`])
    const packageObj = JSON.parse(packageJS.stdout)
    packageObj.name = args.path
    this.log('Overriding files...')
    const manifest = await execa('cat', [`${args.path}/public/manifest.json`])
    const manifestObj = JSON.parse(manifest.stdout)
    manifestObj.name = name
    manifestObj.short_name = name
    manifestObj.theme_color = themeColor
    manifestObj.background_color = backgroundColor
    const indexCat = await execa('cat', [`${args.path}/public/index.html`])
    const offlineCat = await execa('cat', [`${args.path}/public/offline.html`])
    let indexHTML = HTMLParser.parse(indexCat.stdout, {script: true})
    let offlineHTML = HTMLParser.parse(offlineCat.stdout, {script: true})
    changeTitle(indexHTML, name)
    changeTitle(offlineHTML, name)
    changeDescription(indexHTML, description)
    changeDescription(offlineHTML, description)
    changeThemeColor(indexHTML, themeColor)
    changeThemeColor(offlineHTML, themeColor)
    if (usingFavicomatic) {
      manifestObj.icons = templates.favicomatic.map(size => ({
        src: `images/icons/mstile-${size}.png`,
        sizes: size,
        type: 'image/png',
      }))
      appendFavicons(indexHTML, name, themeColor)
      appendFavicons(offlineHTML, name, themeColor)
    }
    await fs.appendFile(`${args.path}/public/global.css`, templates.css(themeColor, backgroundColor),
      err => {
        if (err) {
          this.error(err)
        } else {
          this.log('Added css variables')
        }
      }
    )
    await fs.writeFile(`${args.path}/package.json`, JSON.stringify(packageObj, null, 2), err => {
      if (err) {
        this.error(err)
      } else {
        this.log('Succesfully overwrote package.json')
      }
    })
    await fs.writeFile(`${args.path}/public/manifest.json`, JSON.stringify(manifestObj, null, 2), err => {
      if (err) {
        this.error(err)
      } else {
        this.log('Succesfully overwrote manifest.json')
      }
    })
    await fs.writeFile(`${args.path}/public/index.html`, htmlWithNoscript(indexHTML), err => {
      if (err) {
        this.error(err)
      } else {
        this.log('Succesfully overwrote index.html')
      }
    })
    await fs.writeFile(`${args.path}/public/offline.html`, htmlWithNoscript(offlineHTML), err => {
      if (err) {
        this.error(err)
      } else {
        this.log('Succesfully overwrote offline.html')
      }
    })
    cli.action.stop()
    this.log('*-----------------------------------*')
    this.log('Svelte PWA starter template is ready')
    this.log(`run cd ${args.path} && npm install`)
    this.log('npm run dev for hot reloading')
    this.log('if you chose to use favicomatic just replace')
    this.log('all the icons in images/icons without changing their names')
    this.log('*-----------------------------------*')
    this.log(`Developed by https://github.com/jenaro94
              using https://github.com/tretapey/svelte-pwa
              and my own https://github.com/jenaro94/routify-pwa-starter`)
  }
}

SveltePwaCommand.description = `This is a CLI to automate some of the svelte pwa starting process
...
After finishing, cd into your folder, install dependencies and npm run dev to start developing
`

SveltePwaCommand.args = [{name: 'path'}]

SveltePwaCommand.flags = {
  // add --version flag to show CLI version
  version: flags.version({char: 'v'}),
  // add --help flag to show CLI version
  help: flags.help({char: 'h'}),
}

module.exports = SveltePwaCommand
