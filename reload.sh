#!/usr/bin/env bash

docker run --rm -d -p 8080:8080 -p 9080:9080 -p 8000:8000 -v ~/dgraph:/dgraph dgraph/standalone:v20.03.0
pm2 start --name dgraph src/start.js