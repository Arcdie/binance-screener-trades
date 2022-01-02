const fs = require('fs');
const path = require('path');
const axios = require('axios');
const moment = require('moment');
const AdmZip = require('adm-zip');

const {
  sleep,
  getQueue,
} = require('../libs/support');

const {
  createTrades,
} = require('../controllers/trades/utils/create-trades');

const {
  parseCSVToJSON,
} = require('../controllers/files/utils/parse-csv-to-json');

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
    const endDate = moment(1640822400 * 1000).utc();

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

    const pathToFilesFolder = path.join(__dirname, '../files/aggTrades');

    for await (const instrumentDoc of instrumentsDocs) {
      log.info(`Started ${instrumentDoc.name}`);

      const typeInstrument = 'futures/um';
      const instrumentName = instrumentDoc.name.replace('PERP', '');

      const pathToFolder = `${pathToFilesFolder}/${instrumentDoc.name}`;

      if (!fs.existsSync(pathToFolder)) {
        fs.mkdirSync(pathToFolder);
      }

      const links = targetDates.map(date => `data/${typeInstrument}/daily/aggTrades/${instrumentName}/${instrumentName}-aggTrades-${date.year}-${date.month}-${date.day}.zip`);

      for await (const link of links) {
        try {
          const resultGetFile = await axios({
            method: 'get',
            url: `https://data.binance.vision/${link}`,
            responseType: 'arraybuffer',
          });

          const zip = new AdmZip(resultGetFile.data);
          zip.extractAllTo(pathToFolder, true);
        } catch (error) {
          console.log(`${link}: `, error);
        }

        await sleep(2000);
      }

      const filesNames = [];

      fs
        .readdirSync(pathToFolder)
        .forEach(fileName => {
          filesNames.push(fileName);
        });

      for await (const fileName of filesNames) {
        if (!fileName.includes('.csv')) {
          continue;
        }

        const pathToFile = `${pathToFolder}/${fileName}`;
        const fileDate = fileName.replace('.csv', '').split('-');
        const pathToJsonFile = `${pathToFolder}/${fileDate[4]}-${fileDate[3]}-${fileDate[2]}.json`;

        let resultGetFile = await parseCSVToJSON({
          pathToFile,
        });

        if (!resultGetFile || !resultGetFile.status) {
          log.warn(resultGetFile.message || 'Cant parseCSVToJSON');
          continue;
        }

        const fileData = [];

        resultGetFile.result.forEach(elem => {
          const [tradeId, price, quantity, firstTradeId, lastTradeId, timestamp, direction] = elem;

          fileData.push([
            parseFloat(price),
            parseFloat(quantity),
            new Date(parseInt(timestamp, 10)).toISOString(),
            direction !== 'true',
          ]);
        });

        resultGetFile = false;
        fs.writeFileSync(pathToJsonFile, JSON.stringify(fileData));
        fs.unlinkSync(pathToFile);
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
