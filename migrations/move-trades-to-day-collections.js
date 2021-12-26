const moment = require('moment');
const mongoose = require('mongoose');

const {
  getQueue,
} = require('../libs/support');

const {
  modelSchemasForInstruments,
} = require('../controllers/models/constants');

const { modelSchema } = require('../models/Trade');

module.exports = async () => {
  return;
  console.time('migration');
  console.log('Migration started');

  const collectionNames = Object
    .keys(mongoose.connection.collections)
    .filter(collectionName => collectionName !== 'trades')
    .filter(collectionName => {
      const splitted = collectionName.split('-');
      return splitted.length === 2;
    });

  const startDate = moment('2021-12-20 00:00:00.000Z').utc();
  const endDate = moment().utc().startOf('day').add(-1, 'days');

  const endDateUnix = endDate.unix();

  const targetDatesUnix = [];
  const tmpDate = moment(startDate);
  const incrementProcessedInstruments = processedInstrumentsCounter(130);

  while (1) {
    const tmpDateUnix = tmpDate.unix();
    targetDatesUnix.push(tmpDateUnix);

    tmpDate.add(1, 'days');

    if (tmpDateUnix === endDateUnix) {
      break;
    }
  }

  const modelsMapper = new Map();

  targetDatesUnix.forEach(dateUnix => {
    collectionNames.forEach(collectionName => {
      const instrumentName = collectionName.split('-')[0].toUpperCase();

      const Trade = new mongoose.Schema(modelSchema, { versionKey: false });

      const mongooseModel = mongoose.model(
        `Trade${instrumentName}${dateUnix}`,
        Trade,
        `${instrumentName.toLowerCase()}-trades-${dateUnix}`,
      );

      modelsMapper.set(`${instrumentName}_${dateUnix}`, mongooseModel);
    });
  });

  for await (const collectionName of collectionNames) {
    const instrumentName = collectionName.split('-')[0].toUpperCase();
    const Trade = modelSchemasForInstruments.get(instrumentName);

    console.log(`Started ${collectionName}`);

    for await (const dateUnix of targetDatesUnix) {
      const startOfDayDate = moment.unix(dateUnix);
      const endOfDayDate = moment.unix(dateUnix + 86400);

      const match = {
        $and: [{
          time: { $gte: startOfDayDate },
        }, {
          time: { $lt: endOfDayDate },
        }],
      };

      const periodTrades = await Trade
        .find(match, { _id: 0, data: 1, time: 1 })
        .sort({ time: 1 })
        .exec();

      const queues = getQueue(periodTrades, 10000);
      const TargetTradeModel = modelsMapper.get(`${instrumentName}_${dateUnix}`);

      for await (const newTrades of queues) {
        await TargetTradeModel.insertMany(newTrades);
      }

      await Trade.deleteMany(match).exec();

      console.log(`Ended ${dateUnix}`);
    }

    incrementProcessedInstruments();
    console.log(`Ended ${collectionName}`);
  }

  console.timeEnd('migration');
};

const processedInstrumentsCounter = function (numberInstruments = 0) {
  let processedInstruments = 0;

  return function () {
    processedInstruments += 1;
    console.log(`${processedInstruments} / ${numberInstruments}`);
  };
};
