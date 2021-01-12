const sleep = require('await-sleep')
const { Lock } = require('../../src/service')

async function run () {
  const lock = new Lock()

  const syncedfn = async (name) => {
    console.log('Starting to sleep...', name)
    await sleep(5000)
    console.log('Finished sleeping', name)
  }

  // see 3 for handling data
  const triggeredFn = async () => {
    const syncedFnTrigger = async () => {
      await lock.acquire()
      try {
        await syncedfn('SYNCED')
      } finally {
        lock.release()
      }
    }
    syncedFnTrigger()
    await lock.acquire()
    try {
      await syncedfn('TRIGGERED')
    } finally {
      lock.release()
    }
  }

  triggeredFn()
}

run()
