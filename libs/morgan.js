const chalk = require('chalk');
const morgan = require('morgan');

module.exports = morgan((tokens, req, res) => {
  return [
    chalk.green.bold(tokens.method(req, res)),
    chalk.red.bold(tokens.status(req, res)),
    chalk.white(tokens.url(req, res)),
    chalk.yellow(`${tokens['response-time'](req, res)} ms`),
  ].join(' ');
});
