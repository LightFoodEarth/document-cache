const promClient = require('prom-client')

class Prometheus {
  constructor () {
    promClient.collectDefaultMetrics({
      labels: { APP: 'document-cache' }
    })
    this._setupMetrics()
  }

  register () {
    return promClient.register
  }

  contentType () {
    return this.register().contentType
  }

  async metrics () {
    return this.register().metrics()
  }

  createDocument () {
    this._createDocument.inc()
  }

  createEdge () {
    this._createEdge.inc()
  }

  deleteDocument () {
    this._deleteDocument.inc()
  }

  deleteEdge () {
    this._deleteEdge.inc()
  }

  queueDocumentDeletion () {
    this._queueDocumentDeletion.inc()
  }

  queueEdgeCreation () {
    this._queueEdgeCreation.inc()
  }

  blockNumber (number) {
    this._blockNumber.set(number)
  }

  _setupMetrics () {
    this._createEdge = new promClient.Counter({
      name: 'hypha_graph_documentcache_createedges',
      help: '# of edges created'
    })

    this._deleteEdge = new promClient.Counter({
      name: 'hypha_graph_documentcache_deleteedges',
      help: '# of edges deleted'
    })

    this._createDocument = new promClient.Counter({
      name: 'hypha_graph_documentcache_createdocs',
      help: '# of documents created'
    })

    this._deleteDocument = new promClient.Counter({
      name: 'hypha_graph_documentcache_deletedocs',
      help: '# of documents deleted'
    })

    this._queueEdgeCreation = new promClient.Counter({
      name: 'hypha_graph_documentcache_queueedgecreate',
      help: '# of edges queued for creation'
    })

    this._queueDocumentDeletion = new promClient.Counter({
      name: 'hypha_graph_documentcache_queuedocdelete',
      help: '# of documents queued for deletion'
    })

    this._blockNumber = new promClient.Gauge({
      name: 'hypha_graph_documentcache_blocknum',
      help: 'block number'
    })
  }
}

module.exports = Prometheus
