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
### Get all members
```
{
  var(func: has(member)){
   members as member{
  	}
  }
  members(func: uid(members)){
    hash
    creator
    created_date
    content_groups{
      expand(_all_){
        expand(_all_)
      }
    }
    certificates{
      expand(_all_){
        expand(_all_)
      }
    }
  }
}
```

### Get all proposals
```
{
  var(func: has(proposal)){
   proposals as proposal{
  	}
  }
  proposals(func: uid(proposals)){
    hash
    creator
    created_date
    content_groups{
      expand(_all_){
        expand(_all_)
      }
    }
    certificates{
      expand(_all_){
        expand(_all_)
      }
    }
  }
}
```
### Get specific proposal
```
query proposal($hash:string){
  proposal(func: eq(hash, $hash)) {
    hash
    creator
    created_date
    content_groups{
      expand(_all_){
        expand(_all_)
      }
    }
    certificates{
      expand(_all_){
        expand(_all_)
      }
    }
    ownedby{
      hash
    	creator
    	created_date
    	content_groups{
      	expand(_all_){
        	expand(_all_)
      	}
    	}
    	certificates{
      	expand(_all_){
        	expand(_all_)
      	}
    	}
    }
  }
}
```
### Get specific member
```
query member($hash:string){
  member(func: eq(hash, $hash)) {
    hash
    creator
    created_date
    content_groups{
      expand(_all_){
        expand(_all_)
      }
    }
    memberof{
      hash
    	creator
    	created_date
    	content_groups{
      	expand(_all_){
        	expand(_all_)
      	}
    	}
    	certificates{
      	expand(_all_){
        	expand(_all_)
      	}
    	}
    }
    owns{
      hash
    	creator
    	created_date
    	content_groups{
      	expand(_all_){
        	expand(_all_)
      	}
    	}
    	certificates{
      	expand(_all_){
        	expand(_all_)
      	}
    	}
    }
  }
}
```

# Usage
## Store a document in DGraph
NOTE: Documents will be loaded into DGraph from the blockchain->DGraph loader. 

``` javascript
await document.processDocument(
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
## Update document edge in dgraph
``` javascript
await document.mutateEdge({
  "id": "2904366775",
  "from_node": "71836B83D367AB992B58D3704EFD7E9D4D36B28E90BD89ECEE82415F7CA34528",
  "to_node": "9EA1A14EB173F8D48B3663BACA0DA008C7552AC3203A932574A0B92A95C1F148",
  "edge_name": "owns",
  "created_date": "2020-10-22T19:33:37.000"
})

## Retrieve a document by hash

``` javascript
    dgraph = new DGraph({  })
    await dgraph.dropAll()
    document = new Document(dgraph)
    let doc = await document.getByHash('7b5755ce318c42fc750a754b4734282d1fad08e52c0de04762cb5f159a253c24')

```

## Retrieve documents by edge

``` javascript
    dgraph = new DGraph({  })
    document = new Document(dgraph)
    let docs = await document.getByEdge('member')
```

