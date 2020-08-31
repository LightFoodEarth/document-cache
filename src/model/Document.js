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
  }

  async setSchema () {
    return this.dgraph.updateSchema(schema)
  }

  async schemaExists () {
    return this.dgraph.typesExist(['Document', 'ContentGroup', 'Content', 'Certificate'])
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

  _configureRequest ({
    contentGroups = true,
    certificates = true
  }) {
    return `
      {
        uid,
        hash,
        created_date,
        ${contentGroups ? contentGroupsRequest : ''}
        ${certificates ? certificatesRequest : ''}
      }
    `
  }

  async getHashUIDMap (docHash) {
    docHash = Util.removeDuplicates(docHash)
    const { documents } = await this.dgraph.query(
      `
      {
        documents(func: eq(hash, [${docHash.join(',')}])){
          uid,
          hash
        }
      }
      `,
      { $hash: docHash }
    )
    return Util.toKeyValue(documents, 'hash', 'uid')
  }

  async store (chainDoc) {
    const currentDoc = await this.getByHash(chainDoc.hash, { contentGroups: false })
    const dgraphDoc = await (currentDoc ? this._transformUpdate(chainDoc, currentDoc) : this._transformNew(chainDoc))
    return dgraphDoc ? this.dgraph.updateData(dgraphDoc) : null
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
