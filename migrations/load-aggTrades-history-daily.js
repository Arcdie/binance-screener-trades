const fs = require('fs');
const path = require('path');
const axios = require('axios');
const moment = require('moment');
const AdmZip = require('adm-zip');

const {
  sleep,
} = require('../libs/support');

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

    let instrumentsDocs = (resultGetActiveInstruments.result || []);
      // .filter(d => d.name === 'IOTXUSDTPERP');

    // instrumentsDocs = instrumentsDocs.slice(73, instrumentsDocs.length);

    if (!instrumentsDocs || !instrumentsDocs.length) {
      return false;
    }

    const targetDates = [];

    // 1 december 2021 - 1 january 2022
    const startDate = moment.unix(1638316800).utc();
    const endDate = moment.unix(1640995200).utc();

    const tmpDate = moment(startDate);
    const incrementProcessedInstruments = processedInstrumentsCounter(instrumentsDocs.length);

    while (1) {
      targetDates.push({
        date: moment(tmpDate),
        dateUnix: moment(tmpDate).unix(),
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

    for await (const instrumentDoc of instrumentsDocs) {
      log.info(`Started ${instrumentDoc.name}`);

      const typeInstrument = 'futures/um';
      const instrumentName = instrumentDoc.name.replace('PERP', '');

      for await (const targetDate of targetDates) {
        const fileName = `${instrumentName}-aggTrades-${targetDate.year}-${targetDate.month}-${targetDate.day}`;
        const link = `data/${typeInstrument}/daily/aggTrades/${instrumentName}/${fileName}.zip`;

        const validDate = `${targetDate.day}-${targetDate.month}-${targetDate.year}`;
        const pathToDateFolder = `${pathToFilesAggTradesFolder}/${validDate}`;

        try {
          const resultGetFile = await axios({
            method: 'get',
            url: `https://data.binance.vision/${link}`,
            responseType: 'arraybuffer',
          });

          const zip = new AdmZip(resultGetFile.data);
          zip.extractAllTo(pathToDateFolder, true);
        } catch (error) {
          console.log(`${link}: `, error);
        }

        const pathToCsvFile = `${pathToDateFolder}/${fileName}.csv`;

        let resultGetFile = await parseCSVToJSON({
          pathToFile: pathToCsvFile,
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
        fs.writeFileSync(`${pathToDateFolder}/${instrumentDoc.name}.json`, JSON.stringify(fileData));
        fs.unlinkSync(pathToCsvFile);

        log.info(`Ended ${validDate}`);
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
