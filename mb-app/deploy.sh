#!/bin/bash


# clean old build
rm -rf ./dist

# build JS
npm run build

# upload to mb.warp.at
rsync -vr ./dist/ cn@10.146.248.20:/var/www/html/mb/
