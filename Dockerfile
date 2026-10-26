FROM node:24-bookworm-slim AS node-runtime
FROM ubuntu:24.04
ARG TARGETARCH
RUN test "$TARGETARCH" = amd64
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    wine64 xvfb xauth curl unzip ca-certificates python3 python3-venv libatomic1 libstdc++6 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=node-runtime /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm
RUN mkdir -p /opt/windows-python && curl --fail --show-error --location \
    https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip -o /tmp/python.zip \
    && echo '009d6bf7e3b2ddca3d784fa09f90fe54336d5b60f0e0f305c37f400bf83cfd3b  /tmp/python.zip' | sha256sum -c - \
    && unzip -q /tmp/python.zip -d /opt/windows-python && rm /tmp/python.zip
WORKDIR /app
COPY vendor/camera-sdk/native/requirements.txt /tmp/requirements.txt
RUN python3 -m venv /opt/codec-tools \
    && /opt/codec-tools/bin/pip download --disable-pip-version-check --no-deps --only-binary=:all: \
       --platform win_amd64 --python-version 311 --abi cp311 -r /tmp/requirements.txt -d /tmp/wheels \
    && /opt/codec-tools/bin/python -c "import pathlib,zipfile; p=pathlib.Path('/opt/windows-python/Lib/site-packages'); p.mkdir(parents=True,exist_ok=True); [zipfile.ZipFile(w).extractall(p) for w in pathlib.Path('/tmp/wheels').glob('*.whl')]" \
    && printf 'python311.zip\n.\nLib/site-packages\nimport site\n' > /opt/windows-python/python311._pth \
    && /opt/codec-tools/bin/pip install --no-cache-dir -r /tmp/requirements.txt \
    && rm -rf /tmp/wheels /tmp/requirements.txt
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY . .
RUN useradd --uid 10001 --create-home runner \
    && mkdir -p /var/lib/rgu/data /var/lib/rgu/wine /var/lib/rgu/home \
    && chown -R 10001:10001 /var/lib/rgu \
    && chmod 700 /var/lib/rgu/data /var/lib/rgu/wine /var/lib/rgu/home \
    && chmod 755 runtime/*.sh
ENV HOME=/var/lib/rgu/home WINEPREFIX=/var/lib/rgu/wine WINEARCH=win64 WINEDEBUG=-all \
    HIK_PYTHON=/app/runtime/wine-python.sh HIK_SDK_DIRECTORY=Z:/opt/hik-sdk \
    HIK_SAAS_DATA_DIR=/var/lib/rgu/data PYTHON=/opt/codec-tools/bin/python HOST=0.0.0.0 PORT=8102
USER 10001:10001
EXPOSE 8102
ENTRYPOINT ["/bin/sh", "/app/runtime/entrypoint.sh"]
CMD ["node", "server.mjs"]
