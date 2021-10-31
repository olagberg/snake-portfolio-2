#!/bin/bash
#####################################################################
#  A script for deleting all docker containers, images and volumes. #
#####################################################################
#
# CHECK IF CONTAINERS, IMAGES AND VOLUMES ARE EMPTY
# IF NOT STOP AND DELETE THEM
echo "STATUS BEFORE STOP AND DELETE SCRIPT:"
CONTAINERS=("$(docker container ps -aq | wc -l)")
IMAGES=("$(docker image ls -q | wc -l)")
VOLUMES=("$(docker volume ls -q | wc -l)")
echo "Amount of containers =" $CONTAINERS
echo "Amount of images =" $IMAGES
echo "Amount of volumes =" $VOLUMES

if [ "$CONTAINERS" -gt 0 ]
then
  { docker container stop $(docker container ps -aq)
  docker container prune -f; } &> /dev/null
fi

if [ "$IMAGES" -gt 0 ]
then
  { docker image rm $(docker image ls -q) -f; } &> /dev/null
fi

if [ "$VOLUMES" -gt 0 ]
then
  { docker volume rm $(docker volume ls -q) -f; } &>/dev/null
fi

# REASSIGN VARIABLES AND SEND ERROR MESSAGE IF
# VARIABLES ARE NOT 0
CONTAINERS=("$(docker container ps -aq | wc -l)")
IMAGES=("$(docker image ls -q | wc -l)")
VOLUMES=("$(docker volume ls -q | wc -l)")
echo
echo "STATUS AFTER STOP AND DELETE SCRIPT:"
echo "Amount of containers =" $CONTAINERS
echo "Amount of images =" $IMAGES
echo "Amount of volumes =" $VOLUMES

if [ "$CONTAINERS" -gt 0 ]
then
  echo "Those containers could not be deleted:"
  docker docker container ps -aq
fi

if [ "$IMAGES" -gt 0 ]
then
  echo "Those images could not be deleted:"
  docker image ls -q
fi

if [ "$VOLUMES" -gt 0 ]
then
  echo "Those volumes could not be deleted:"
  docker volume ls -q
fi
