/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "402b66900e731ca748771b6fc5e7a068"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "ddc07b59935eb62b6f9df9b5a6e2e35e"
  }, {
    "url": "pwa-512x512.png",
    "revision": "c1c158690ad18894e11c9f295798f4e6"
  }, {
    "url": "pwa-192x192.png",
    "revision": "34cb238e5746038bb41b2721deb81f7a"
  }, {
    "url": "index.html",
    "revision": "56a38a8b809dfbeef476e27a73623b4c"
  }, {
    "url": "icon.svg",
    "revision": "3f315297892248a7cbae20dbef3f9090"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "926f5f16a20da8aa0014ef69e1a5365d"
  }, {
    "url": "assets/index-Cazrq4L_.css",
    "revision": null
  }, {
    "url": "assets/index-BKD62GyQ.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "926f5f16a20da8aa0014ef69e1a5365d"
  }, {
    "url": "icon.svg",
    "revision": "3f315297892248a7cbae20dbef3f9090"
  }, {
    "url": "pwa-192x192.png",
    "revision": "34cb238e5746038bb41b2721deb81f7a"
  }, {
    "url": "pwa-512x512.png",
    "revision": "c1c158690ad18894e11c9f295798f4e6"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "ddc07b59935eb62b6f9df9b5a6e2e35e"
  }, {
    "url": "manifest.webmanifest",
    "revision": "9282035ec97bac466c4467e88de94299"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
