#!/usr/bin/env bash

usage="./start-doc-cache [testnet|mainnet] [build|image]"
if [ $# -ne 2 ]; then
    echo $usage
    exit 1
fi

if [[ $1 != 'testnet' && $1 != 'mainnet' ]]; then
    echo $usage
    exit 1
elif [[ $2 != 'build' && $2 != 'image' ]]; then
    echo $usage
    exit 1
fi

if [[ $2 = build ]]; then
  env $(cat .env.$1 | grep "#" -v) docker-compose -p doc-cache-$1 up --build
else
  env $(cat .env.$1 | grep "#" -v) docker-compose -f docker-compose.yml -f docker-compose.prod.yml -p doc-cache-$1 up
fi
