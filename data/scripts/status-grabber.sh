#!/bin/bash

## have you considered using variables
FILEPATH=~/WebstormProjects/discord-bot/tmps/
DOCKER=$FILEPATH"tmp-dockerstatus.txt"
TUNNEL=$FILEPATH"tmp-tunnelstatus.txt"
TNL_FORMAT=$FILEPATH"tmp-tunnel-format.txt"
TNL_FORMATTED=$FILEPATH"tmp-tunnel-formatted.txt"

##create tmp files for data storage
mkdir -p ${FILEPATH}
touch ${DOCKER}
touch ${TUNNEL}
touch ${TNL_FORMAT}
touch ${TNL_FORMATTED}

## grab status of mc docker container and write to file
#sudo docker ps --filter name=mc --format {{.Status}} > ${DOCKER}
echo "not running :(" > ${DOCKER}

## grab ping data from tunnel server
#! CHANGE THIS URL TO NOT google.com IN THE FUTURE
ping -c 8 google.com > ${TUNNEL}

## yay formatting time
cat $TUNNEL | grep "rtt" | awk -F '/' 'END {print $5}' > $TNL_FORMAT
echo " ± " >> $TNL_FORMAT
cat $TUNNEL | grep "rtt" | awk -F '/' 'END {print $7}' >> $TNL_FORMAT

sed ':label1 ; N ; $! b label1 ; s/\n//g' $TNL_FORMAT > $TNL_FORMATTED
