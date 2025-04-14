/*global Ultraviolet*/
self.__uv$config = {
  prefix: `${location.origin}/uv/`,  // Dynamically set the prefix path based on the current origin
  bare: `${location.origin}/b/`,     // Dynamically set the bare server path based on the current origin
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  handler: "/uv/uv.handler.js",
  client: "/uv/uv.client.js",
  bundle: "/uv/uv.bundle.js",
  config: "/uv/uv.config.js",
  sw: "/uv/uv.sw.js",
};
