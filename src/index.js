const {Command, flags} = require('@oclif/command')
const {cli} = require('cli-ux')
const execa = require('execa')

class SveltePwaCommand extends Command {
  async run() {
    const routify = await cli.confirm('Do you want to include routify? n/y')
    const name = await cli.prompt('App name')
    cli.action.start('starting a process', 'initializing', {stdout: true})
    this.log(`npx degit tretapey/svelte-pwa ${name}`)
    await execa('npx', ['degit', 'tretapey/svelte-pwa', name])
    cli.action.stop()
  }
}

SveltePwaCommand.description = `Describe the command here
...
Extra documentation goes here
`

SveltePwaCommand.flags = {
  // add --version flag to show CLI version
  version: flags.version({char: 'v'}),
  // add --help flag to show CLI version
  help: flags.help({char: 'h'}),
}

module.exports = SveltePwaCommand
