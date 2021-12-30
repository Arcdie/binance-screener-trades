const moment = require('moment');
const mongoose = require('mongoose');

const {
  modelSchemasForInstruments,
} = require('../controllers/models/constants');

module.exports = async () => {
  return;
  console.time('migration');
  console.log('Migration started');

  const collectionNames = Object.keys(mongoose.connection.collections);

  const startDate = moment('2021-12-20 00:00:00.000Z').utc();
  const endDate = moment().utc().startOf('day');

  const deleteMatch = {
    $and: [{
      time: { $gte: startDate },
    }, {
      time: { $lt: endDate },
    }],
  };

  for await (const collectionName of collectionNames) {
    if (collectionName === 'trades') {
      continue;
    }

    const modelName = collectionName.split('-')[0].toUpperCase();
    const Trade = modelSchemasForInstruments.get(modelName);

    console.log('started', collectionName);
    await Trade.deleteMany(deleteMatch).exec();
  }

  console.timeEnd('migration');
};
