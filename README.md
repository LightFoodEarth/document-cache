# Quick Start

## Step 1
In a console, run DGraph in Docker. 
```
docker run --rm -it -p 8080:8080 -p 9080:9080 -p 8000:8000 -v ~/dgraph:/dgraph dgraph/standalone:v20.03.0
```
## Step 2
Clone repo and install dependencies
```
git clone git@github.com:hypha-dao/document-cache.git
cd document-cache && npm install
npm install -g jest
npm run test
```

## Step 3
Open DGraph-Ratel and run some GraphQL queries
http://localhost:8000/?latest#

### Get all documents
```
{
  documents(func: has(hash)) {
    expand(_all_){
      expand(_all_){
        expand(_all_)
      }
    }
  }
}
```

# Usage
## Store a document in DGraph
NOTE: Documents will be loaded into DGraph from the blockchain->DGraph loader. 

``` javascript
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
```

## Retrieve a document by hash

``` javascript
    dgraph = new DGraph({  })
    await dgraph.dropAll()
    document = new Document(dgraph)
    let doc = await document.getByHash('7b5755ce318c42fc750a754b4734282d1fad08e52c0de04762cb5f159a253c24')

```

