const fetch = require('node-fetch')
const HyperionSocketClient = require('@eosrio/hyperion-stream-client').default

const EOS_ENDPOINT = 'https://testnet.telos.caleos.io'

async function run () {
  console.log('Enviroment vars: ', JSON.stringify(process.env, null, 4))

  const client = new HyperionSocketClient(EOS_ENDPOINT, { async: true, fetch })

  client.onConnect = () => {
    client.streamDeltas({
      code: 'proxycapusra',
      table: '*',
      account: 'proxycapusra',
      scope: '',
      payer: '',
      start_from: '2020-09-15T00:00:00.000Z',
      read_until: 0
    })
  }

  // see 3 for handling data
  client.onData = async (delta, ack) => {
    console.log(JSON.stringify(delta, null, 4))
    ack()
  }

  client.connect(() => {
    console.log('Connected to: ', EOS_ENDPOINT)
  })
}

function failureHandler (error) {
  console.log('Doc Listener failed:', error)
  process.exit(1)
}

function terminateHandler () {
  console.log('Terminating doc listener...')
  process.exit(1)
}

process.on('SIGINT', terminateHandler)
process.on('SIGTERM', terminateHandler)

process.on('uncaughtException', failureHandler)
process.on('unhandledRejection', failureHandler)

run()
