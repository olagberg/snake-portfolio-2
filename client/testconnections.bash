#!/bin/bash
echo "resource usage  with 0 clients: "
docker stats --no-stream | awk 'NR == 1'
docker stats --no-stream | grep 'flask'
for i in {1..5}; do
  node ./src/testsocket1.js & >/dev/null 2>&1
  sleep 0.3
done
echo "resource usage  with > 5 clients: "
docker stats --no-stream | awk 'NR == 1'
docker stats --no-stream | grep 'flask'
sleep 13
for i in {1..10}; do
  node ./src/testsocket1.js & >/dev/null 2>&1
  sleep 0.3
done
echo "resource usage with >10 clients: "
docker stats --no-stream | awk 'NR == 1'
docker stats --no-stream | grep 'flask'
sleep 13
for i in {1..20}; do
  node ./src/testsocket1.js & >/dev/null 2>&1
  sleep 0.3
done
echo "resource usage with >20 clients: "
docker stats --no-stream | awk 'NR == 1'
docker stats --no-stream | grep 'flask'
