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

    instrumentsDocs.splice(0, 3);

    const targetDates = [];

    const startDate = moment(1639958400 * 1000).utc();
    const endDate = moment(1640304000 * 1000).utc();

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
        if (fileName.includes('.json')) {
          continue;
        }

        const pathToFile = `${pathToFolder}/${fileName}`;

        let resultGetFile = await parseCSVToJSON({
          pathToFile,
        });

        if (!resultGetFile || !resultGetFile.status) {
          log.warn(resultGetFile.message || 'Cant parseCSVToJSON');
          continue;
        }

        const newTrades = [];

        resultGetFile.result.forEach(elem => {
          const [tradeId, price, quantity, firstTradeId, lastTradeId, timestamp, direction] = elem;

          newTrades.push({
            price: parseFloat(price),
            quantity: parseFloat(quantity),
            isLong: direction !== 'true',
            time: new Date(parseInt(timestamp, 10)),
          });
        });

        resultGetFile = false;

        console.log('numberTrades', newTrades.length);
        const queues = getQueue(newTrades, 10000);

        let isSuccess = true;

        for await (const newTrades of queues) {
          const resultCreate = await createTrades({
            instrumentName: instrumentDoc.name,
            trades: newTrades,
          });

          if (!resultCreate || !resultCreate.status) {
            isSuccess = false;
            log.warn(resultCreate.message || 'Cant createTrades');
            break;
          }
        }

        if (isSuccess) {
          fs.unlinkSync(pathToFile);
        }
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
