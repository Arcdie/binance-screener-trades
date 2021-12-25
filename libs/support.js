const crypto = require('crypto');
const mongodb = require('mongodb');

const randStr = limit => crypto.randomBytes(20).toString('hex').substring(0, limit);

const getUnix = targetDate =>
  parseInt((targetDate ? new Date(targetDate) : new Date()).getTime() / 1000, 10);

const sleep = ms => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const getQueue = (arr, limiter) => {
  const queues = [];
  const lArr = arr.length;

  let targetIndex = 0;
  const numberIterations = Math.ceil(lArr / limiter);

  for (let i = 0; i < numberIterations; i += 1) {
    const newQueue = [];

    let conditionValue = limiter;

    if (i === (numberIterations - 1)) {
      conditionValue = lArr - targetIndex;
    }

    for (let j = 0; j < conditionValue; j += 1) {
      newQueue.push(arr[targetIndex]);
      targetIndex += 1;
    }

    queues.push(newQueue);
  }

  return queues;
};

const generateMongoId = () => {
  return new mongodb.ObjectID();
};

module.exports = {
  sleep,
  randStr,
  getUnix,
  getQueue,
  generateMongoId,
};
