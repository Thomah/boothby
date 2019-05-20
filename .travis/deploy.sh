#!/bin/bash

if ! [[ "$TRAVIS_BRANCH" == "master" ]]; then exit 0; fi

eval "$(ssh-agent -s)"
chmod 600 $TRAVIS_BUILD_DIR/.travis/id_rsa
ssh-add $TRAVIS_BUILD_DIR/.travis/id_rsa

git config --global push.default matching
git remote add deploy ssh://git@$IP:$PORT$DEPLOY_DIR
git push deploy master

ssh-keyscan -t rsa -H $IP >> ~/.ssh/known_hosts
ssh -p $PORT apps@$IP -o StrictHostKeyChecking=no "$( cat <<EOT
    cd $DEPLOY_DIR
    echo "$(date -u) Travis Deploy"  >> ./console.log
    sudo service boothby stop
    sleep 1
    sudo service boothby start
    exit
EOT
)"

rm $TRAVIS_BUILD_DIR/.travis/id_rsa