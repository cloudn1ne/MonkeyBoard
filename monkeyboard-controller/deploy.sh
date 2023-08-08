#!/bin/bash


# clean old build
rm -rf ./build

# build JS
npm install --legacy-peer-deps --timing
npm run build

# upload to mb.warp.at
rsync -vr ./build/ cn@10.146.248.20:/var/www/html/mb/
