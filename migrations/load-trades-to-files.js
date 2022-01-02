const fs = require('fs');
const path = require('path');
const moment = require('moment');
const mongoose = require('mongoose');

const log = require('../libs/logger')(module);

const {
  modelSchemasForInstruments,
} = require('../controllers/models/constants');

const DIVIDER = 500000;

module.exports = async () => {
  try {
    return;
    console.time('migration');
    console.log('Migration started');

    const targetDates = [];

    const collectionNames = Object
      .keys(mongoose.connection.collections)
      .filter(collectionName => collectionName !== 'trades');

    const startDate = moment('2021-12-31 00:00:00.780Z').utc().startOf('day');
    const endDate = moment().utc().startOf('day');

    const tmpDate = moment(startDate);
    const incrementProcessedInstruments = processedInstrumentsCounter(collectionNames.length);

    while (1) {
      targetDates.push({
        date: moment(tmpDate),
        day: moment(tmpDate).format('DD'),
        month: moment(tmpDate).format('MM'),
        year: moment(tmpDate).format('YYYY'),
      });

      tmpDate.add(1, 'days');

      if (tmpDate.unix() === endDate.unix()) {
        break;
      }
    }

    const pathToFilesAggTradesFolder = path.join(__dirname, '../files/aggTrades');

    targetDates.forEach(date => {
      const validDate = `${date.day}-${date.month}-${date.year}`;
      const dateFolderName = `${pathToFilesAggTradesFolder}/${validDate}`;

      if (!fs.existsSync(dateFolderName)) {
        fs.mkdirSync(dateFolderName);
      }
    });

    for await (const collectionName of collectionNames) {
      log.info(`Started ${collectionName}`);

      const instrumentName = collectionName.split('-')[0].toUpperCase();
      const Trade = modelSchemasForInstruments.get(instrumentName);

      for await (const targetDate of targetDates) {
        const startOfDayDate = moment(targetDate.date).startOf('day');
        const endOfDayDate = moment(targetDate.date).add(1, 'days');

        const validDate = `${targetDate.day}-${targetDate.month}-${targetDate.year}`;

        const dateFolderName = `${pathToFilesAggTradesFolder}/${validDate}`;
        const pathToFile = `${dateFolderName}/${instrumentName}.json`;

        const match = {
          $and: [{
            time: { $gte: startOfDayDate },
          }, {
            time: { $lt: endOfDayDate },
          }],
        };

        const total = await Trade.count(match).exec();

        const numberIterations = Math.ceil(total / DIVIDER);

        const arrForLoop = [];

        for (let i = 0; i < numberIterations; i += 1) {
          arrForLoop.push(i);
        }

        fs.writeFileSync(pathToFile, '[');

        for await (const i of arrForLoop) {
          let periodTrades = await Trade
            .find(match, { _id: 0, data: 1, time: 1 })
            .sort({ time: 1 })
            .limit(DIVIDER)
            .skip(DIVIDER * i)
            .exec();

          if (!periodTrades || !periodTrades.length) {
            console.log(`No trades; ${collectionName}, ${startOfDayDate.format()}`);
            continue;
          }

          let fileData = periodTrades.map(trade => ([
            trade.data[0], trade.data[1], trade.time, trade.data[2],
          ]));

          periodTrades = false;

          fileData = JSON.stringify(fileData).substring(1).slice(0, -1);

          if (i !== numberIterations - 1) {
            fileData += ',';
          } else {
            fileData += ']';
          }

          fs.appendFileSync(pathToFile, fileData);
        }

        await Trade.deleteMany(match).exec();

        console.log(`Ended ${startOfDayDate.format()}`);
      }

      incrementProcessedInstruments();
    }

    console.timeEnd('migration');
  } catch (error) {
    console.log(error);
  }
};

const processedInstrumentsCounter = function (numberInstruments = 0) {
  let processedInstruments = 0;

  return function () {
    processedInstruments += 1;
    log.info(`${processedInstruments} / ${numberInstruments}`);
  };
};
