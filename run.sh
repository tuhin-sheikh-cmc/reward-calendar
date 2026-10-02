#!/bin/bash
# podman run -it --rm --name everest-site -p 30303:3000 -v .:/app everest-site:latest npm run dev
podman run -dti --name puroshkar --volume .:/app:Z --workdir /app --publish 13002:3000 --restart unless-stopped docker.io/library/node npm install && npm run dev
