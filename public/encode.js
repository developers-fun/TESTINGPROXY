// encode.js

// Simple encode function used by Ultraviolet
export function encode(url) {
    return btoa(unescape(encodeURIComponent(url)));
  }
  
  export function decode(encodedUrl) {
    try {
      return decodeURIComponent(escape(atob(encodedUrl)));
    } catch (e) {
      return null;
    }
  }
  