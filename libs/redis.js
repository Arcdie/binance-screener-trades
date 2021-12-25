const redis = require('redis');
const bluebird = require('bluebird');

const log = require('./logger')(module);

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const {
  redisConf,
} = require('../config');

const redisClient = redis.createClient({
  host: redisConf.host,
  port: redisConf.port,
});

redisClient.on('connect', () => log.info('Connection to Redis is successful'));
redisClient.on('error', err => log.error(err));

module.exports = redisClient;
