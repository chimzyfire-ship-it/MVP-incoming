#!/bin/bash
set -e
export PATH=$HOME/.fly/bin:$PATH
export FLY_API_TOKEN=$FLY_API_TOKEN

# Deploy app 1
echo "Deploying free-programming-books..."
git clone --depth 1 https://github.com/EbookFoundation/free-programming-books /tmp/fpb || true
cd /tmp/fpb
flyctl apps create gitmurph-free-books --machines --org personal || true
flyctl deploy . --app gitmurph-free-books --nixpacks --ha=false --yes || true
echo "https://gitmurph-free-books.fly.dev"

# Deploy app 2
echo "Deploying Chimzyfire-ship-it..."
git clone --depth 1 https://github.com/chimzyfire-ship-it/MVP-incoming /tmp/cfs || true
cd /tmp/cfs
flyctl apps create gitmurph-chimzyfire --machines --org personal || true
flyctl deploy . --app gitmurph-chimzyfire --nixpacks --ha=false --yes || true
echo "https://gitmurph-chimzyfire.fly.dev"
