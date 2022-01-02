const path = require('path');

const log = require('../../libs/logger')(module);

module.exports = async (req, res, next) => {
  try {
    const {
      query: {
        instrumentName,
      },
    } = req;

    let pathToFilesFolder = path.join(__dirname, '../../files/aggTrades');

    if (instrumentName) {
      pathToFilesFolder += `/${instrumentName}`;
    }

    res.download(pathToFilesFolder);
  } catch (error) {
    log.warn(error.message);

    return res.json({
      status: false,
      message: error.message,
    });
  }
};
