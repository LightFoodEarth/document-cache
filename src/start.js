const path = require('path')
const Store = require('data-store')
const fetch = require('node-fetch')
const HyperionSocketClient = require('@eosrio/hyperion-stream-client').default
const { Document } = require('./model')
const { DGraph } = require('./service')

const {
  CONTRACT_NAME,
  DOC_TABLE_NAME,
  EDGE_TABLE_NAME,
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
  console.log('Enviroment vars: ', JSON.stringify(process.env, null, 4))
  const addr = `${DGRAPH_ALPHA_HOST}:${DGRAPH_ALPHA_EXTERNAL_PORT}`
  const startFrom = store.get('lastProcessedBlock') || START_FROM
  console.log(`Connecting to DGraph on: ${addr}, Starting from: ${startFrom}`)
  const dgraph = new DGraph({ addr })
  const document = new Document(dgraph)
  let docDeletes = []
  let edgeCreates = []
  let currentBlock = null

  await document.prepareSchema()

  const client = new HyperionSocketClient(EOS_ENDPOINT, { async: true, fetch })

  client.onConnect = () => {
    client.streamDeltas({
      code: CONTRACT_NAME,
      table: '*',
      account: CONTRACT_NAME,
      scope: '',
      payer: '',
      start_from: startFrom,
      read_until: 0
    })
  }

  // see 3 for handling data
  client.onData = async (delta, ack) => {
    console.log(JSON.stringify(delta, null, 4))
    const {
      content: {
        data,
        block_num: blockNum,
        table,
        present
      }
    } = delta
    lastProcessedBlock = blockNum
    if (!currentBlock || currentBlock !== blockNum) {
      for (const docDelete of docDeletes) {
        await document.mutateDocument(docDelete, true)
      }
      for (const edgeCreate of edgeCreates) {
        await document.mutateEdge(edgeCreate, false)
      }
      docDeletes = []
      edgeCreates = []
      currentBlock = blockNum
    }
    // console.log(JSON.stringify(doc, null, 4))
    if (data) {
      if (table === DOC_TABLE_NAME) {
        if (present) {
          await document.mutateDocument(data, false)
        } else {
          console.log('Queueing document delete')
          docDeletes.push(data)
        }
      } else if (table === EDGE_TABLE_NAME) {
        if (present) {
          console.log('Queueing edge creation')
          edgeCreates.push(data)
        } else {
          await document.mutateEdge(data, true)
        }
      }
    }
    ack()
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
  process.exit(1)
}

process.on('SIGINT', terminateHandler)
process.on('SIGTERM', terminateHandler)

process.on('uncaughtException', failureHandler)
process.on('unhandledRejection', failureHandler)

run()
