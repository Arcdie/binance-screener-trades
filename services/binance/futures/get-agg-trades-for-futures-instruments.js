const WebSocketClient = require('ws');

const log = require('../../../libs/logger')(module);

const {
  sendMessage,
} = require('../../../controllers/telegram/utils/send-message');

const {
  createTrades,
} = require('../../../controllers/trades/utils/create-trades');

const CONNECTION_NAME = 'Futures:aggTrades';

class InstrumentQueue {
  constructor(instrumentName) {
    this.queue = [];
    this.isActive = false;
    this.instrumentName = instrumentName;

    this.LIMITER = 50;
  }

  addIteration(element) {
    this.queue.push(element);

    if (!this.isActive) {
      this.isActive = true;
      this.nextStep();
    }
  }

  async nextStep() {
    const lQueue = this.queue.length;

    if (lQueue > 0) {
      const targetSteps = this.queue.splice(0, this.LIMITER);

      const resultCreate = await createTrades({
        trades: targetSteps,
        instrumentName: this.instrumentName,
      });

      if (!resultCreate || !resultCreate.status) {
        log.warn(resultCreate.message || 'Cant createTrades');
      }

      this.nextStep();
    } else {
      this.isActive = false;
    }
  }
}

module.exports = async (instrumentsDocs = []) => {
  try {
    if (!instrumentsDocs || !instrumentsDocs.length) {
      return true;
    }

    let sendPongInterval;
    let connectStr = 'wss://fstream.binance.com/stream?streams=';

    const instrumentsQueues = [];

    instrumentsDocs.forEach(doc => {
      instrumentsQueues[doc.name] = new InstrumentQueue(doc.name);
      const cutName = doc.name.toLowerCase().replace('perp', '');
      connectStr += `${cutName}@aggTrade/`;
    });

    connectStr = connectStr.substring(0, connectStr.length - 1);

    setInterval(() => {
      let count = 0;

      instrumentsQueues.forEach(instrument => {
        count += instrument.queue.length;
      });

      console.log('count', count);
    }, 10 * 1000);

    const websocketConnect = () => {
      const client = new WebSocketClient(connectStr);

      client.on('open', () => {
        log.info(`${CONNECTION_NAME} was opened`);

        sendPongInterval = setInterval(() => {
          client.pong();
        }, 1000 * 60); // 1 minute
      });

      client.on('ping', () => {
        client.pong();
      });

      client.on('close', (message) => {
        log.info(`${CONNECTION_NAME} was closed`);

        if (message !== 1006) {
          sendMessage(260325716, `${CONNECTION_NAME} was closed (${message})`);
        }

        clearInterval(sendPongInterval);
        websocketConnect();
      });

      client.on('message', async bufferData => {
        const parsedData = JSON.parse(bufferData.toString());

        if (!parsedData.data || !parsedData.data.s) {
          log.warn(`${CONNECTION_NAME}: ${JSON.stringify(parsedData)}`);
          return true;
        }

        const {
          data: {
            s: instrumentName,
            p: price,
            q: quantity,
            T: timestamp,
            m: direction,
          },
        } = parsedData;

        const validInstrumentName = `${instrumentName}PERP`;

        instrumentsQueues[validInstrumentName].addIteration({
          price: parseFloat(price),
          quantity: parseFloat(quantity),
          time: new Date(timestamp),
          isLong: direction !== 'true',
        });
      });
    };

    websocketConnect();
  } catch (error) {
    log.error(error.message);
    console.log(error);
    return false;
  }
};
