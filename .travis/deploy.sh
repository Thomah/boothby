#!/bin/bash

if [ "$TRAVIS_BRANCH" == "master" ]; then
    eval "$(ssh-agent -s)"
    chmod 600 $TRAVIS_BUILD_DIR/.travis/id_rsa
    ssh-add $TRAVIS_BUILD_DIR/.travis/id_rsa

    git config --global push.default matching
    git remote add deploy ssh://git@$IP:$PORT$DEPLOY_DIR
    git push deploy master

    ssh apps@$IP -p $PORT <<EOF
    cd $DEPLOY_DIR
    sudo service boothby reload
fi

EOF