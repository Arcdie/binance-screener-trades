const path = require('path');

let fileEnv = '../config/envs/';

switch (process.env.PWD) {
  case '/home/ivalentyn/www/binance-screener-trades': fileEnv += 'development.env'; break;
  default: { fileEnv += 'localhost.env'; break; }
}

require('dotenv').config({
  path: path.join(__dirname, `../${fileEnv}`),
});
