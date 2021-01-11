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
  STORE_NAME,
  PROMETHEUS_PORT
} = process.env

let lastProcessedBlock = null
const store = new Store({
  path: path.join(DATA_PATH, STORE_NAME)
})

const express = require('express')
const prom_express_app = express()
const prom_client = require('prom-client')
const port = PROMETHEUS_PORT || 9090;

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

  client.onData = async (delta, ack) => {
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
        mutateDocument.inc(); 
        await document.mutateDocument(docDelete, true)
      }
      for (const edgeCreate of edgeCreates) {
        mutateEdge.inc(); 
        await document.mutateEdge(edgeCreate, false)
      }
      docDeletes = []
      edgeCreates = []
      currentBlock = blockNum
      blockNumber.set(blockNum)
    }

    if (data) {
      if (table === DOC_TABLE_NAME) {
        if (present) {
          mutateEdge.inc(); 
          await document.mutateDocument(data, false)
        } else {
          queueDocumentDeletion.inc()
          docDeletes.push(data)
        }
      } else if (table === EDGE_TABLE_NAME) {
        if (present) {
          queueEdgeCreation.inc()
          edgeCreates.push(data)
        } else {
          mutateEdge.inc()
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

// instrumentation 
prom_client.collectDefaultMetrics({
  labels: { APP: "document-cache" },
});

const mutateEdge = new prom_client.Counter({
  name: 'hypha_graph_documentcache_mutatededges',
  help: '# of edges integrated into the graph',
});

const mutateDocument = new prom_client.Counter({
  name: 'hypha_graph_documentcache_mutateddocs',
  help: '# of documents integrated into the graph',
});

const queueEdgeCreation = new prom_client.Counter({
  name: 'hypha_graph_documentcache_queueedgecreate',
  help: '# of edges queued for creation',
});

const queueDocumentDeletion = new prom_client.Counter({
  name: 'hypha_graph_documentcache_queuedocdelete',
  help: '# of documents queued for deletion',
});

const blockNumber = new prom_client.Gauge({ 
  name: 'hypha_graph_documentcache_blocknum', 
  help: 'block number' 
});

prom_express_app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prom_client.register.contentType);
  res.end(await prom_client.register.metrics()); 
});

prom_express_app.use((err, req, res, next) => {
  res.statusCode = 500
  res.json({ error: err.message })
  next()
})

const prom_server = prom_express_app.listen(port, () => {
  console.log(`prometheus endpoint listening on port ${port}`)
})

function terminateHandler () {
  console.log('Terminating doc listener...')
  saveLastProcessedBlock()
  prom_server.close((err) => {
    if (err) {
      console.error(err)
    }
  })
  process.exit(1)
}

process.on('SIGINT', terminateHandler)
process.on('SIGTERM', terminateHandler)

process.on('uncaughtException', failureHandler)
process.on('unhandledRejection', failureHandler)

run()

