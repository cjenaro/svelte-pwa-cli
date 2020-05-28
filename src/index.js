const {Command, flags} = require('@oclif/command')
const {cli} = require('cli-ux')
const execa = require('execa')
const HTMLParser = require('node-html-parser')
const fs = require('fs')

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

class SveltePwaCommand extends Command {
  async run() {
    const name = await cli.prompt('App name')
    const description = await cli.prompt('App description')
    const themeColor = await cli.prompt('Theme color (hex)')
    const backgroundColor = await cli.prompt('Theme background color (hex)')
    const routify = await cli.confirm('Do you want to include routify? n/y')
    cli.action.start('Creating project', 'initializing', {stdout: true})
    this.log(`npx degit tretapey/svelte-pwa ${name}`)
    await execa('npx', ['degit', 'tretapey/svelte-pwa', name])
    const packageJS = await execa('cat', [`${name}/package.json`])
    const packageObj = JSON.parse(packageJS.stdout)
    packageObj.name = name
    if (routify) {
      this.log('Installing routify...')
      packageObj.scripts.dev = 'routify -c server'
      packageObj.scripts.server = 'rollup -c -w'
      packageObj.scripts.start = 'sirv public --single'
      packageObj.scripts.build = 'routify -b && rollup -c'
      packageObj.devDependencies['@sveltech/routify'] = '^1.7.12'
      await execa('mkdir', [`${name}/src/pages/`])
      await execa('mv', [`${name}/src/App.svelte`, `${name}/src/pages/index.svelte`])
      await fs.writeFile(`${name}/src/App.svelte`,
        `<script>
            import { Router } from "@sveltech/routify";
            import { routes } from "@sveltech/routify/tmp/routes";
          </script>

          <Router {routes} />`,
        err => {
          if (err) {
            this.error(err)
          } else {
            this.log('Successfully created file structure for routify')
          }
        }
      )
      this.log('Routify installed.')
    }
    this.log('Overriding files...')
    const manifest = await execa('cat', [`${name}/public/manifest.json`])
    const manifestObj = JSON.parse(manifest.stdout)
    manifestObj.name = name
    manifestObj.short_name = name
    manifestObj.theme_color = themeColor
    manifestObj.background_color = backgroundColor
    const indexCat = await execa('cat', [`${name}/public/index.html`])
    const offlineCat = await execa('cat', [`${name}/public/offline.html`])
    let indexHTML = HTMLParser.parse(indexCat.stdout)
    let offlineHTML = HTMLParser.parse(offlineCat.stdout)
    changeTitle(indexHTML, name)
    changeTitle(offlineHTML, name)
    changeDescription(indexHTML, description)
    changeDescription(offlineHTML, description)
    changeThemeColor(indexHTML, themeColor)
    changeThemeColor(offlineHTML, themeColor)
    await fs.appendFile(`${name}/public/global.css`,
      `
      root: {
        --theme-color: ${themeColor};
        --background-color: ${backgroundColor};
      }
      `,
      err => {
        if (err) {
          this.error(err)
        } else {
          this.log('Added css variables')
        }
      }
    )
    await fs.writeFile(`${name}/package.json`, JSON.stringify(packageObj, null, 2), err => {
      if (err) {
        this.error(err)
      } else {
        this.log('Succesfully overwrote package.json')
      }
    })
    await fs.writeFile(`${name}/public/manifest.json`, JSON.stringify(manifestObj, null, 2), err => {
      if (err) {
        this.error(err)
      } else {
        this.log('Succesfully overwrote manifest.json')
      }
    })
    await fs.writeFile(`${name}/public/index.html`, indexHTML.toString(), err => {
      if (err) {
        this.error(err)
      } else {
        this.log('Succesfully overwrote index.html')
      }
    })
    await fs.writeFile(`${name}/public/offline.html`, offlineHTML.toString(), err => {
      if (err) {
        this.error(err)
      } else {
        this.log('Succesfully overwrote offline.html')
      }
    })
    cli.action.stop()
    this.log('*-----------------------------------*')
    this.log('Svelte PWA starter template is ready')
    this.log(`run cd ${name} && npm run install`)
    this.log('npm run dev for hot reloading')
    this.log('*-----------------------------------*')
    this.log('Developed by https://github.com/jenaro94 using https://github.com/tretapey/svelte-pwa')
  }
}

SveltePwaCommand.description = `This is a CLI to automate some of the svelte pwa starting process
...
After finishing, cd into your folder, install dependencies and npm run dev to start developing
`

SveltePwaCommand.flags = {
  // add --version flag to show CLI version
  version: flags.version({char: 'v'}),
  // add --help flag to show CLI version
  help: flags.help({char: 'h'}),
}

module.exports = SveltePwaCommand
