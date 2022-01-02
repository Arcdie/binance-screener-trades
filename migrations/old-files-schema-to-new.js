const fs = require('fs');
const path = require('path');
const moment = require('moment');

const {
  getActiveInstruments,
} = require('../controllers/instruments/utils/get-active-instruments');

const log = require('../libs/logger')(module);

module.exports = async () => {
  try {
    return;
    console.time('migration');
    console.log('Migration started');

    const resultRequestGetActiveInstruments = await getActiveInstruments({
      isOnlyFutures: true,
    });

    if (!resultRequestGetActiveInstruments || !resultRequestGetActiveInstruments.status) {
      log.warn(resultRequestGetActiveInstruments.message || 'Cant getActiveInstruments');
      return false;
    }

    const resultGetActiveInstruments = resultRequestGetActiveInstruments.result;

    if (!resultGetActiveInstruments || !resultGetActiveInstruments.status) {
      log.warn(resultGetActiveInstruments.message || 'Cant getActiveInstruments');
      return false;
    }

    const instrumentsDocs = (resultGetActiveInstruments.result || []);

    if (!instrumentsDocs || !instrumentsDocs.length) {
      return false;
    }

    const targetDates = [];

    const startDate = moment(1640563200 * 1000).utc();
    const endDate = moment(1640908800 * 1000).utc();

    const tmpDate = moment(startDate);
    const incrementProcessedInstruments = processedInstrumentsCounter(instrumentsDocs.length);

    while (1) {
      targetDates.push({
        day: moment(tmpDate).format('DD'),
        month: moment(tmpDate).format('MM'),
        year: moment(tmpDate).format('YYYY'),
      });

      tmpDate.add(1, 'days');

      if (tmpDate.unix() === endDate.unix()) {
        break;
      }
    }

    const pathToNewFilesFolder = path.join(__dirname, '../files/aggTrades');
    const pathToOldFilesFolder = path.join(__dirname, '../files/aggTradesOld');

    targetDates.forEach(date => {
      const validDate = `${date.day}-${date.month}-${date.year}`;
      const dateFolderName = `${pathToNewFilesFolder}/${validDate}`;

      if (!fs.existsSync(dateFolderName)) {
        fs.mkdirSync(dateFolderName);
      }
    });

    console.log('targetDates', targetDates);

    for await (const instrumentDoc of instrumentsDocs) {
      log.info(`Started ${instrumentDoc.name}`);

      const pathToOldFolder = `${pathToOldFilesFolder}/${instrumentDoc.name}`;

      const filesNames = [];

      fs
        .readdirSync(pathToOldFolder)
        .forEach(fileName => {
          filesNames.push(fileName);
        });

      for await (const fileName of filesNames) {
        if (!fileName.includes('.json')) {
          continue;
        }

        const fileDate = fileName.replace('.json', '').split('-');
        const dateFolderName = `${fileDate[0]}-${fileDate[1]}-${fileDate[2]}`;

        const oldPath = `${pathToOldFilesFolder}/${instrumentDoc.name}/${fileName}`;
        const newPath = `${pathToNewFilesFolder}/${dateFolderName}/${instrumentDoc.name}.json`;

        fs.renameSync(oldPath, newPath);
      }

      incrementProcessedInstruments();
      log.info(`Ended ${instrumentDoc.name}`);
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
