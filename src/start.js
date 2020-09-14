const path = require('path')
const Store = require('data-store')
const fetch = require('node-fetch')
const HyperionSocketClient = require('@eosrio/hyperion-stream-client').default
const { Document } = require('./model')
const { DGraph } = require('./service')

const {
  EOS_ENDPOINT,
  DGRAPH_ALPHA_HOST,
  DGRAPH_ALPHA_EXTERNAL_PORT,
  START_FROM,
  DATA_PATH,
  STORE_NAME
} = process.env

let lastProcessedBlock = null
const store = new Store({
  path: path.join(DATA_PATH, STORE_NAME)
})

async function run () {
  console.log('Enviroment variables: ', JSON.stringify(process.env, null, 4))
  const addr = `${DGRAPH_ALPHA_HOST}:${DGRAPH_ALPHA_EXTERNAL_PORT}`
  const startFrom = store.get('lastProcessedBlock') || START_FROM
  console.log(`Connecting to DGraph on: ${addr}, Starting from: ${startFrom}`)
  const dgraph = new DGraph({ addr })
  const document = new Document(dgraph)

  await document.setSchema()

  const client = new HyperionSocketClient(EOS_ENDPOINT, { async: true, fetch })

  client.onConnect = () => {
    client.streamDeltas({
      code: 'docs.hypha',
      table: 'documents',
      account: 'docs.hypha',
      scope: '',
      payer: '',
      start_from: startFrom,
      read_until: 0
    })
  }

  // see 3 for handling data
  client.onData = async (delta, ack) => {
    console.log('Delta: ', delta)
    const {
      content: {
        data: doc,
        block_num: blockNum
      }
    } = delta
    lastProcessedBlock = blockNum
    console.log(JSON.stringify(doc, null, 4))
    if (doc) {
      await document.store(doc)
      ack()
    }
  }

  client.connect(() => {
    console.log('Connected to: ', EOS_ENDPOINT)
  })
}

function saveLastProcessedBlock () {
  console.log('Last processed block:', lastProcessedBlock)
  if (lastProcessedBlock) {
    console.log('Saving last processed block:', lastProcessedBlock)
    store.set('lastProcessedBlock', lastProcessedBlock)
  }
}

function failureHandler (error) {
  console.log('Doc Listener failed:', error)
  saveLastProcessedBlock()
  process.exit(1)
}

function terminateHandler () {
  console.log('Terminating doc listener...')
  saveLastProcessedBlock()
}

process.on('SIGINT', terminateHandler)
process.on('SIGTERM', terminateHandler)

process.on('uncaughtException', failureHandler)
process.on('unhandledRejection', failureHandler)

run()
