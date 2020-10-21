const {
  DgraphClient,
  DgraphClientStub,
  Operation,
  Mutation,
  Request
} = require('dgraph-js')

const { Util } = require('../util')

const grpc = require('grpc')

const MUTATE_OPS = {
  json: 'setSetJson',
  jsonDel: 'setDeleteJson',
  nquads: 'setSetNquads',
  nquadsDel: 'setDelNquads'
}

class DGraph {
  constructor ({
    addr = null,
    credentials = null
  }) {
    addr = addr || 'localhost:9080'
    credentials = credentials || grpc.credentials.createInsecure()
    this.clientStub = new DgraphClientStub(addr, credentials)
    this.client = new DgraphClient(this.clientStub)
    this.client.setDebugMode(false)
  }

  async updateSchema (schema, runInBackground = false) {
    const op = new Operation()
    op.setSchema(schema)
    op.setRunInBackground(runInBackground)
    return this.client.alter(op)
  }

  async getTypes (typeList) {
    const { types } = await this.query(
      `schema(type:[${typeList.join(',')}]){}`
    )
    return types
  }

  async getType (typeName) {
    const types = await this.getTypes([typeName])
    return types && types.length ? types[0] : null
  }

  async getTypeFieldMap (typeName) {
    const type = await this.getType(typeName)
    if (!type) {
      return null
    }
    const { fields } = type
    const fieldMap = {}
    fields.forEach(field => {
      fieldMap[field.name] = field
    })
    return fieldMap
  }

  async typesExist (typeList) {
    const types = await this.getTypes(typeList)
    if (!types) {
      return typeList
    }
    const existing = types.map(type => type.name)
    const missing = Util.arrayDiff(typeList, existing)
    return missing.length ? missing : null
  }

  async dropAll () {
    const op = new Operation()
    op.setDropAll(true)
    return this.client.alter(op)
  }

  /**
   * Updates data in the database
   *
   * @param {*} mutation can be an object in wich case it is assumed its a json mutation
   * or a string in wich case it is assumed it is a nquad mutation
   */
  async update (mutation) {
    return this.mutate(mutation)
  }

  /**
   * Deletes data in the database
   *
   * @param {*} mutation can be an object in wich case it is assumed its a json mutation
   * or a string in wich case it is assumed it is a nquad mutation
   */
  async delete (mutation) {
    return this.mutate(mutation, true)
  }

  async mutate (update, deleteOp = false) {
    const txn = this.newTxn()
    try {
      const mutation = new Mutation()
      const opKey = `${Util.isString(update) ? 'nquads' : 'json'}${deleteOp ? 'Del' : ''}`
      mutation[MUTATE_OPS[opKey]](update)
      const response = await txn.mutate(mutation)
      await txn.commit()
      return response
    } finally {
      await txn.discard()
    }
  }

  async mutateEdge (uidFrom, uidTo, edgeName, deleteOp = false) {
    return this.mutate(this._getEdgeTriplet(uidFrom, uidTo, edgeName), deleteOp)
  }

  _getEdgeTriplet (uidFrom, uidTo, edgeName) {
    return `<${uidFrom}> <${edgeName}> <${uidTo}> .`
  }

  async upsert (query, update, condition = null) {
    const txn = this.newTxn()
    try {
      const mutation = new Mutation()
      mutation.setSetJson(update)
      if (condition) {
        mutation.setCond(condition)
      }
      const req = new Request()
      req.setQuery(query)
      req.addMutations(mutation)
      const response = await txn.doRequest(req)
      await txn.commit()
      return response
    } finally {
      await txn.discard()
    }
  }

  async query (queryStr, vars = null) {
    const txn = this.newTxn(true)
    const results = await (vars ? txn.queryWithVars(queryStr, vars) : txn.query(queryStr))
    return results.getJson()
  }

  newTxn (readOnly = false) {
    return this.client.newTxn({
      readOnly
    })
  }

  close () {
    this.clientStub.close()
  }
}

module.exports = DGraph
