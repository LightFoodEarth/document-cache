/* eslint-disable no-undef */
const DGraph = require('../../src/service/DGraph')
const Document = require('../../src/model/Document')

jest.setTimeout(20000)

let dgraph = null
let document = null

beforeAll(async () => {
  
  dgraph = new DGraph({
  })
  await dgraph.dropAll()
  document = new Document(dgraph)
})

describe('Test store', () => {
  test('store', async () => {
    await document.setSchema()
    const missingTypes = await document.schemaExists()
    expect(missingTypes).toBeNull()
    await document.store(
      {
        id: 9,
        hash: '7b5755ce318c42fc750a754b4734282d1fad08e52c0de04762cb5f159a253c24',
        creator: 'alice',
        content_groups: [
          [
            {
              label: 'content_group_name',
              value: [
                'string',
                'My Content Group #1'
              ]
            },
            {
              label: 'salary_amount',
              value: [
                'asset',
                '130.00 USD'
              ]
            }
          ]
        ],
        created_date: '2020-08-25T03:02:10.000'
      }
    )

    const documents = await document.getByCreator('alice')
    expect(documents).not.toBeNull()
    expect(documents).toBeInstanceOf(Array)
    expect(documents).toHaveLength(1)

    const hashUIDMap = await document.getHashUIDMap('7b5755ce318c42fc750a754b4734282d1fad08e52c0de04762cb5f159a253c24')

    expect(hashUIDMap['7b5755ce318c42fc750a754b4734282d1fad08e52c0de04762cb5f159a253c24']).not.toBeNull()

    await document.store(
      {
        id: 10,
        hash: 'c0b0e48a9cd1b73ac924cf58a430abd5d3091ca7cbcda6caf5b7e7cebb379327',
        creator: 'johnnyhypha1',
        content_groups: [
          [
            {
              label: 'content_group_name',
              value: [
                'string',
                'My Content Group #1'
              ]
            },
            {
              label: 'salary_amount',
              value: [
                'asset',
                '130.00 USD'
              ]
            },
            {
              label: 'referrer',
              value: [
                'name',
                'friendacct'
              ]
            },
            {
              label: 'vote_count',
              value: [
                'int64',
                67
              ]
            },
            {
              label: 'reference_link',
              value: [
                'checksum256',
                '7b5755ce318c42fc750a754b4734282d1fad08e52c0de04762cb5f159a253c24'
              ]
            }
          ],
          [
            {
              label: 'content_group_name',
              value: [
                'string',
                'My Content Group #2'
              ]
            },
            {
              label: 'salary_amount',
              value: [
                'asset',
                '130.00 USD'
              ]
            },
            {
              label: 'referrer',
              value: [
                'name',
                'friendacct'
              ]
            },
            {
              label: 'vote_count',
              value: [
                'int64',
                67
              ]
            },
            {
              label: 'reference_link',
              value: [
                'checksum256',
                '7b5755ce318c42fc750a754b4734282d1fad08e52c0de04762cb5f159a253c24'
              ]
            }
          ]
        ],
        certificates: [
          {
            certifier: 'alice',
            notes: "Alice's notes",
            certification_date: '2020-08-26T03:02:10.000'
          },
          {
            certifier: 'maria',
            notes: "Marias's notes",
            certification_date: '2020-08-26T03:02:15.000'
          }
        ],
        created_date: '2020-08-25T03:02:10.000'
      }
    )

    let doc = await document.getByHash('c0b0e48a9cd1b73ac924cf58a430abd5d3091ca7cbcda6caf5b7e7cebb379327')
    expect(doc).not.toBeNull()
    let {
      content_groups: contentGroups,
      certificates
    } = doc
    expect(contentGroups).toBeInstanceOf(Array)
    expect(contentGroups).toHaveLength(2)
    const {
      contents
    } = contentGroups[0]
    expect(contents).toBeInstanceOf(Array)
    expect(contents).toHaveLength(5)
    const docEdge = contents[4].document[0]
    expect(docEdge.hash).toBe('7b5755ce318c42fc750a754b4734282d1fad08e52c0de04762cb5f159a253c24')

    expect(certificates).toBeInstanceOf(Array)
    expect(certificates).toHaveLength(2)
    expect(certificates[1].certifier).toBe('maria')
    const originalCertificates = certificates
    await document.store(
      {
        id: 10,
        hash: 'c0b0e48a9cd1b73ac924cf58a430abd5d3091ca7cbcda6caf5b7e7cebb379327',
        creator: 'johnnyhypha1',
        content_groups: [
          [
            {
              label: 'content_group_name',
              value: [
                'string',
                'My Content Group #1'
              ]
            },
            {
              label: 'salary_amount',
              value: [
                'asset',
                '130.00 USD'
              ]
            },
            {
              label: 'referrer',
              value: [
                'name',
                'friendacct'
              ]
            },
            {
              label: 'vote_count',
              value: [
                'int64',
                67
              ]
            },
            {
              label: 'reference_link',
              value: [
                'checksum256',
                '7b5755ce318c42fc750a754b4734282d1fad08e52c0de04762cb5f159a253c24'
              ]
            }
          ],
          [
            {
              label: 'content_group_name',
              value: [
                'string',
                'My Content Group #2'
              ]
            },
            {
              label: 'salary_amount',
              value: [
                'asset',
                '130.00 USD'
              ]
            },
            {
              label: 'referrer',
              value: [
                'name',
                'friendacct'
              ]
            },
            {
              label: 'vote_count',
              value: [
                'int64',
                67
              ]
            },
            {
              label: 'reference_link',
              value: [
                'checksum256',
                '7b5755ce318c42fc750a754b4734282d1fad08e52c0de04762cb5f159a253c24'
              ]
            }
          ]
        ],
        certificates: [
          {
            certifier: 'alice',
            notes: "Alice's notes",
            certification_date: '2020-08-26T03:02:10.000'
          },
          {
            certifier: 'maria',
            notes: "Marias's notes",
            certification_date: '2020-08-26T03:02:15.000'
          },
          {
            certifier: 'bob',
            notes: "Bob's notes",
            certification_date: '2020-08-26T03:02:16.000'
          }
        ],
        created_date: '2020-08-25T03:02:10.000'
      }
    )

    doc = await document.getByHash('c0b0e48a9cd1b73ac924cf58a430abd5d3091ca7cbcda6caf5b7e7cebb379327')
    expect(doc).not.toBeNull();
    ({
      content_groups: contentGroups,
      certificates
    } = doc)
    expect(contentGroups).toBeInstanceOf(Array)
    expect(contentGroups).toHaveLength(2)

    expect(certificates).toBeInstanceOf(Array)
    expect(certificates).toHaveLength(3)
    expect(certificates[2].certifier).toBe('bob')

    expect(originalCertificates[0].uid).toBe(certificates[0].uid)
    expect(originalCertificates[1].uid).toBe(certificates[1].uid)
  })
})

afterAll(() => {
  dgraph.close()
})
