const { DataTypes } = require('../const')
const { Util } = require('../util')

const schema =
    `
      type Document {
          hash
          created_date
          creator
          content_groups
          certificates
      }
      
      type ContentGroup {
        content_group_sequence
        contents
      }
      
      type Content {
        label
        value
        type
        content_sequence
        document
      }
      
      type Certificate {
        certifier
        notes
        certification_date
        certification_sequence
      }
      
      hash: string @index(exact) .
      created_date: datetime .
      creator: string @index(term) .
      content_groups: [uid] .
      certificates: [uid] .
      
      content_group_sequence: int .
      contents: [uid] .
      
      label: string @index(term) .
      value: string @index(term) .
      type: string @index(term) .
      content_sequence: int .
      document: [uid] .
      
      certifier: string @index(term) .
      notes: string .
      certification_date: datetime .
      certification_sequence: int .
    `
const contentGroupsRequest = `
      content_groups (orderasc:content_group_sequence){
        content_group_sequence
        contents (orderasc: content_sequence){
          content_sequence
          label
          value
          type
          document{
            expand(_all_)
          }
        }
      },
    `

const certificatesRequest = `
      certificates (orderasc: certification_sequence){
        uid
        expand(_all_)
      },
    `

class Document {
  constructor (dgraph) {
    this.dgraph = dgraph
    this.documentTypeFieldMap = null
  }

  async setSchema () {
    return this.dgraph.updateSchema(schema)
  }

  async schemaExists () {
    return !await this.dgraph.typesExist(['Document', 'ContentGroup', 'Content', 'Certificate'])
  }

  async prepareSchema () {
    if (!await this.schemaExists()) {
      await this.setSchema()
    }
    this.documentTypeFieldMap = await this.getDocumentTypeFieldMap()
  }

  async updateDocumentTypeSchema (newField) {
    if (!this.documentTypeFieldMap[newField]) {
      const fields = Object.keys(this.documentTypeFieldMap).reduce((currentFields, field) => currentFields + `\n${field}`)

      await this.dgraph.updateSchema(`
        ${newField}: [uid] .
        type Document{
          ${fields}
          ${newField}
        }
      `)
      this.documentTypeFieldMap[newField] = { name: newField }
    }
  }

  async getDocumentTypeFieldMap () {
    return this.dgraph.getTypeFieldMap('Document')
  }

  async getByCreator (creator, opts) {
    const { documents } = await this.dgraph.query(
      `query documents ($creator: string){
        documents(func: eq(creator, $creator))
          ${this._configureRequest(opts || {})}
      }`,
      { $creator: creator }
    )
    return documents
  }

  async getByHash (docHash, opts) {
    const { documents } = await this.dgraph.query(
      ` 
        query documents($hash: string){
          documents(func: eq(hash, $hash))
            ${this._configureRequest(opts || {})}
        }
      `,
      { $hash: docHash }
    )
    return documents.length ? documents[0] : null
  }

  async getByUID (uid, opts) {
    const { documents } = await this.dgraph.query(
      ` 
        query documents($uid: string){
          documents(func: uid($uid))
            ${this._configureRequest(opts || {})}
        }
      `,
      { $uid: uid }
    )
    return documents.length ? documents[0] : null
  }

  async getByEdge (edge, opts) {
    const { documents } = await this.dgraph.query(
      ` 
        {
          var(func: has(${edge})){
            matched as ${edge}{}
          }
          documents(func: uid(matched))
          ${this._configureRequest(opts || {})}
        }
      `
    )
    return documents
  }

  _configureRequest ({
    contentGroups = true,
    certificates = true,
    edges = []
  }) {
    const predicates = `
        uid
        hash
        created_date
        ${contentGroups ? contentGroupsRequest : ''}
        ${certificates ? certificatesRequest : ''}
    `
    let edgeRequest = ''
    edges.forEach(edge => {
      edgeRequest += `
        ${edge} {
          ${predicates}  
        }
      `
    })
    return `
    {
      ${predicates}
      ${edgeRequest}
    }
    `
  }

  async getHashUIDMap (docHash) {
    docHash = Util.removeDuplicates(docHash)
    const { documents } = await this.dgraph.query(
      `
      {
        documents(func: eq(hash, [${docHash.join(',')}])){
          uid
          hash
        }
      }
      `,
      { $hash: docHash }
    )
    return Util.toKeyValue(documents, 'hash', 'uid')
  }

  async mutateDocument (chainDoc, deleteOp = false) {
    return deleteOp ? this.deleteDocument(chainDoc) : this.storeDocument(chainDoc)
  }

  async storeDocument (chainDoc) {
    const currentDoc = await this.getByHash(chainDoc.hash, { contentGroups: false })
    const dgraphDoc = await (currentDoc ? this._transformUpdate(chainDoc, currentDoc) : this._transformNew(chainDoc))
    if (dgraphDoc) {
      console.log(`${currentDoc ? 'Updating' : 'Creating'} doc: ${chainDoc.hash}`)
      return this.dgraph.update(dgraphDoc)
    } else {
      console.log(`Invalid doc: ${chainDoc.hash}`)
      return null
    }
  }

  async deleteDocument (chainDoc) {
    const {
      hash
    } = chainDoc
    const {
      [hash]: uid
    } = await this.getHashUIDMap([hash])
    if (uid) {
      console.log(`Deleting Node: <${uid}>${hash}`)
      await this.dgraph.deleteNode(uid)
    }
  }

  async mutateEdge (edge, deleteOp = false) {
    const {
      edge_name: edgeName,
      from_node: fromNodeHash,
      to_node: toNodeHash
    } = edge
    await this.updateDocumentTypeSchema(edgeName)
    const {
      [fromNodeHash]: fromUID,
      [toNodeHash]: toUID
    } = await this.getHashUIDMap([fromNodeHash, toNodeHash])
    if (fromUID && toUID) {
      console.log(`${deleteOp ? 'Deleting' : 'Adding'} edge: ${edgeName} between from:<${fromUID}>${fromNodeHash} to: <${toUID}>${toNodeHash}`)
      await this.dgraph.mutateEdge(fromUID, toUID, edgeName, deleteOp)
    } else {
      console.warn(`One or more of the docs in the relationship: ${edgeName} do not exist, fromDoc: ${fromNodeHash} exists: ${!!fromUID}, toDoc: ${toNodeHash} exists: ${!!toUID}`)
    }
  }

  async _transformNew (chainDoc) {
    const {
      hash,
      creator,
      created_date: createdDate,
      content_groups: contentGroups,
      certificates
    } = chainDoc

    // Invalid doc
    if (!contentGroups) {
      return null
    }

    return {
      hash,
      creator,
      created_date: createdDate,
      content_groups: await this._transformContentGroups(contentGroups),
      certificates: this._transformCertificates(certificates),
      'dgraph.type': 'Document'

    }
  }

  async _transformUpdate (chainDoc, currentDoc) {
    const {
      certificates: newCertificates
    } = chainDoc

    let {
      uid,
      certificates: oldCertificates
    } = currentDoc

    oldCertificates = oldCertificates || []

    return {
      uid,
      certificates: oldCertificates.concat(this._transformCertificates(newCertificates, oldCertificates.length)),
      'dgraph.type': 'Document'

    }
  }

  async _transformContentGroups (chainContentGroups) {
    const contentGroups = chainContentGroups.map((contentGroup, index) => {
      return {
        content_group_sequence: index,
        contents: this._transformContents(contentGroup),
        'dgraph.type': 'ContentGroup'
      }
    })
    await this._addDocumentEdges(contentGroups)
    return contentGroups
  }

  _transformContents (chainContents) {
    chainContents = chainContents || []
    const contents = chainContents.map((content, index) => {
      const {
        label,
        value: [type, value]
      } = content
      return {
        label,
        value,
        type,
        content_sequence: index,
        'dgraph.type': 'Content'
      }
    })
    return contents
  }

  _transformCertificates (chainCertificates, startIndex = 0) {
    chainCertificates = chainCertificates || []
    const certificates = []
    for (let i = startIndex; i < chainCertificates.length; i++) {
      certificates.push({
        ...chainCertificates[i],
        certification_sequence: i,
        'dgraph.type': 'Certificate'
      })
    }
    return certificates
  }

  async _addDocumentEdges (contentGroups) {
    const edges = []
    const hashes = []
    for (const contentGroup of contentGroups) {
      for (const content of contentGroup.contents) {
        const { type, value } = content
        if (type === DataTypes.CHECKSUM256) {
          edges.push(content)
          hashes.push(value)
        }
      }
    }
    if (hashes.length) {
      const hashUIDMap = await this.getHashUIDMap(hashes)
      edges.forEach(edge => {
        const uid = hashUIDMap[edge.value]
        if (uid) {
          edge.document = {
            uid
          }
        }
      })
    }
  }
}

module.exports = Document
