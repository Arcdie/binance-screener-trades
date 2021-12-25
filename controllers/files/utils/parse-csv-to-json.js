const fs = require('fs');
const csv = require('fast-csv');

const log = require('../../../libs/logger')(module);

const parseCSVToJSON = ({
  pathToFile,
}) => {
  return new Promise((resolve, reject) => {
    const data = [];

    try {
      fs.createReadStream(pathToFile)
        .pipe(csv.parse())
        .on('error', error => ({
          status: false,
          message: error,
        }))
        .on('data', row => data.push(row))
        .on('end', () => resolve({
          status: true,
          result: data,
        }));
    } catch (error) {
      log.error(error.message);

      reject({
        status: false,
        message: error.message,
      });
    }
  });
};

module.exports = {
  parseCSVToJSON,
};
