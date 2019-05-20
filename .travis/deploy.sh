#!/bin/bash

if ! [[ "$TRAVIS_BRANCH" == "master" ]]; then exit 0; fi

eval "$(ssh-agent -s)"
chmod 600 $TRAVIS_BUILD_DIR/.travis/id_rsa
ssh-add $TRAVIS_BUILD_DIR/.travis/id_rsa

git config --global push.default matching
git remote add deploy ssh://git@$IP:$PORT$DEPLOY_DIR
git push deploy master

ssh -p $PORT apps@$IP -o StrictHostKeyChecking=no "$( cat <<EOT
    echo "$(date -u) Deploy 'Boothby'"  >> ./deploy.log
    cd $DEPLOY_DIR
    sudo service boothby reload
    exit
EOT
)"
