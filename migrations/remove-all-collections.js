const mongoose = require('mongoose');

const log = require('../libs/logger')(module);

module.exports = async () => {
  try {
    return;
    console.time('migration');
    console.log('Migration started');

    Object.keys(mongoose.connection.collections).forEach(collectionName => {
      mongoose.connection.collections[collectionName].drop((err) => {
        if (err) { console.log(err); }
      });
    });

    console.timeEnd('migration');
  } catch (error) {
    console.log(error);
  }
};
