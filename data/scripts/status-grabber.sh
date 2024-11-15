#!/bin/bash

## have you considered using variables
FILEPATH=~/WebstormProjects/discord-bot/tmps/
DOCKER=$FILEPATH"tmp-dockerstatus.txt"
TUNNEL=$FILEPATH"tmp-tunnelstatus.txt"
TNL_FORMAT=$FILEPATH"tmp-tunnel-format.txt"
TNL_FORMATTED=$FILEPATH"tmp-tunnel-formatted.txt"
EXPORT_JSON=$FILEPATH"tmp-data.json"
EXPORT_JSON_FRM=$FILEPATH"tmp-formatted.json"

## create tmp files for data storage
mkdir -p ${FILEPATH}
touch ${DOCKER}
touch ${TUNNEL}
touch ${TNL_FORMAT}
touch ${TNL_FORMATTED}
touch ${EXPORT_JSON}
touch ${EXPORT_JSON_FRM}

## grab status of mc docker container and write to file
docker ps --filter name=mc --format {{.Status}} > ${DOCKER}

## grab ping data from tunnel server
ping -c 8 71.231.123.172 > ${TUNNEL}

## yay formatting time
cat $TUNNEL | grep "rtt" | awk -F '/' 'END {print $5}' > $TNL_FORMAT
echo " ± " >> $TNL_FORMAT
cat $TUNNEL | grep "rtt" | awk -F '/' 'END {print $7}' >> $TNL_FORMAT

sed ':label1 ; N ; $! b label1 ; s/\n//g' $TNL_FORMAT > $TNL_FORMATTED

## oh golly json format time
echo "{\"dockerStat\":\"" > $EXPORT_JSON
cat $DOCKER >> $EXPORT_JSON
echo "\",\"tunnelStat\":\"" >> $EXPORT_JSON
cat $TNL_FORMATTED >> $EXPORT_JSON
echo "\"}" >> $EXPORT_JSON

sed ':label1 ; N ; $! b label1 ; s/\n//g' $EXPORT_JSON > $EXPORT_JSON_FRM
