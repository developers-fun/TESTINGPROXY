// UV addon handler
window.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const target = params.get("u");

  if (target) {
    try {
      // Get the existing uv-root div
      const rootDiv = document.getElementById('uv-root');
      if (!rootDiv) {
        throw new Error('uv-root div not found');
      }

      // Create a proxy URL
      const proxyUrl = `/uv/${encodeURIComponent(btoa(target))}`;

      // Fetch the initial page content
      const response = await fetch(proxyUrl, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch initial page: ${response.statusText}`);
      }
      const html = await response.text();

      // Parse the HTML and modify it to use the proxy
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Remove Chrome extension scripts
      const scripts = doc.getElementsByTagName('script');
      Array.from(scripts).forEach(script => {
        const src = script.getAttribute('src');
        if (src && src.startsWith('chrome-extension://')) {
          script.remove();
        }
      });

      // Update all URLs to use the proxy
      const updateUrls = (elements) => {
        elements.forEach(element => {
          const url = element.getAttribute('href') || 
                    element.getAttribute('src') || 
                    element.getAttribute('data-src') || 
                    element.getAttribute('data-srcset') || 
                    element.getAttribute('action');
          
          if (url && !url.startsWith('chrome-extension://')) {
            try {
              // Handle relative URLs
              let fullUrl;
              try {
                fullUrl = new URL(url, target);
              } catch (e) {
                // If URL parsing fails, try to construct it manually
                fullUrl = new URL(target);
                if (!url.startsWith('http')) {
                  fullUrl.pathname = path.join(path.dirname(fullUrl.pathname), url);
                } else {
                  fullUrl = new URL(url);
                }
              }

              const encodedUrl = encodeURIComponent(btoa(fullUrl.toString()));
              const proxyPath = `/uv/${encodedUrl}`;

              if (element.getAttribute('href')) {
                element.setAttribute('href', proxyPath);
              }
              if (element.getAttribute('src')) {
                element.setAttribute('src', proxyPath);
              }
              if (element.getAttribute('data-src')) {
                element.setAttribute('data-src', proxyPath);
              }
              if (element.getAttribute('data-srcset')) {
                element.setAttribute('data-srcset', proxyPath);
              }
              if (element.getAttribute('action')) {
                element.setAttribute('action', proxyPath);
              }
            } catch (e) {
              console.error(`Error processing URL ${url}:`, e);
            }
          }
        });
      };

      // Update all types of resources
      updateUrls(doc.getElementsByTagName('a'));
      updateUrls(doc.getElementsByTagName('img'));
      updateUrls(doc.getElementsByTagName('script'));
      updateUrls(doc.getElementsByTagName('link'));
      updateUrls(doc.getElementsByTagName('video'));
      updateUrls(doc.getElementsByTagName('audio'));
      updateUrls(doc.getElementsByTagName('iframe'));
      updateUrls(doc.getElementsByTagName('source'));
      updateUrls(doc.getElementsByTagName('track'));

      // Handle forms
      const forms = doc.getElementsByTagName('form');
      Array.from(forms).forEach(form => {
        const action = form.getAttribute('action');
        if (action) {
          try {
            // Handle relative URLs
            let fullUrl;
            try {
              fullUrl = new URL(action, target);
            } catch (e) {
              fullUrl = new URL(target);
              if (!action.startsWith('http')) {
                fullUrl.pathname = path.join(path.dirname(fullUrl.pathname), action);
              } else {
                fullUrl = new URL(action);
              }
            }

            const encodedUrl = encodeURIComponent(btoa(fullUrl.toString()));
            const proxyPath = `/uv/${encodedUrl}`;
            form.setAttribute('action', proxyPath);
          } catch (e) {
            console.error(`Error encoding form action ${action}:`, e);
          }
        }
      });

      // Set up the proxy for all requests
      const proxy = new Proxy(window, {
        get(target, prop) {
          if (prop === 'fetch') {
            return async (...args) => {
              try {
                const [url, options = {}] = args;
                if (url.startsWith('chrome-extension://')) {
                  return await window.fetch(url, options);
                }
                
                // Handle relative URLs
                let fullUrl;
                try {
                  fullUrl = new URL(url, target);
                } catch (e) {
                  fullUrl = new URL(target);
                  if (!url.startsWith('http')) {
                    fullUrl.pathname = path.join(path.dirname(fullUrl.pathname), url);
                  } else {
                    fullUrl = new URL(url);
                  }
                }

                // Encode the URL for the proxy
                const encodedUrl = encodeURIComponent(btoa(fullUrl.toString()));
                const proxyUrl = `/uv/${encodedUrl}`;

                return await window.fetch(proxyUrl, options);
              } catch (error) {
                console.error('Proxy error:', error);
                throw error;
              }
            };
          }
          return target[prop];
        }
      });

      // Replace the original window with the proxy
      Object.setPrototypeOf(proxy, window);
      Object.setPrototypeOf(window, proxy);

      // Inject the modified HTML into the existing uv-root div
      rootDiv.innerHTML = doc.documentElement.innerHTML;

      // Set up click handlers for links
      const links = rootDiv.getElementsByTagName('a');
      Array.from(links).forEach(link => {
        link.addEventListener('click', async (e) => {
          e.preventDefault();
          const url = new URL(link.getAttribute('href'), target);
          window.history.pushState({}, '', `/uv?u=${encodeURIComponent(btoa(url.toString()))}`);
          window.location.reload();
        });
      });

      // Set up form submission handlers
      const formElements = rootDiv.getElementsByTagName('form');
      Array.from(formElements).forEach(form => {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(form);
          const action = form.getAttribute('action');
          const method = (form.getAttribute('method') || 'GET').toUpperCase();

          try {
            // Handle form action URL
            let fullUrl;
            try {
              fullUrl = new URL(action, target);
            } catch (e) {
              fullUrl = new URL(target);
              if (!action.startsWith('http')) {
                fullUrl.pathname = path.join(path.dirname(fullUrl.pathname), action);
              } else {
                fullUrl = new URL(action);
              }
            }

            const response = await fetch(fullUrl.toString(), {
              method: method,
              body: formData
            });

            if (response.ok) {
              const newUrl = new URL(fullUrl.toString());
              window.history.pushState({}, '', `/uv?u=${encodeURIComponent(btoa(newUrl.toString()))}`);
              window.location.reload();
            }
          } catch (error) {
            console.error('Form submission error:', error);
          }
        });
      });

    } catch (error) {
      console.error('Proxy initialization error:', error);
      document.body.innerHTML = `
        <div id="uv-root" style="text-align: center; padding: 20px;">
          <h2>Proxy Initialization Error</h2>
          <p style="color: #ff0000;">${error.message}</p>
          <p>Example: /uv?u=https://example.com</p>
        </div>
      `;
    }
  } else {
    document.body.innerHTML = `
      <div id="uv-root" style="text-align: center; padding: 20px;">
        <h2>Invalid URL</h2>
        <p style="color: #ff0000;">Missing URL parameter</p>
        <p>Example: /uv?u=https://example.com</p>
      </div>
    `;
  }
});
