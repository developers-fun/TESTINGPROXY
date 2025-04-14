import express from 'express';
import http from 'node:http';
import { createBareServer } from '@tomphttp/bare-server-node';
import cors from 'cors';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const bareServer = createBareServer('/b/');

app.use(cors());
app.use(express.json());

// Handle bare server requests
app.use((req, res, next) => {
    if (bareServer.shouldRoute(req)) {
        bareServer.routeRequest(req, res);
    } else {
        next();
    }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve uvaddon.js with proper content type
app.get('/public/uvaddon.js', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'uvaddon.js');
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(filePath);
});

// Serve uv directory files
app.use('/uv', express.static(path.join(__dirname, 'public', 'uv')));

// Handle websocket upgrades
server.on('upgrade', (req, socket, head) => {
    if (bareServer.shouldRoute(req)) {
        bareServer.routeUpgrade(req, socket, head);
    } else {
        socket.end('HTTP/1.1 404 Not Found\r\n\r\n');
    }
});

// UV proxy handler
app.get('/uv/:encodedUrl/*', async (req, res) => {
    try {
        const encodedUrl = req.params.encodedUrl;
        const decodedUrl = Buffer.from(encodedUrl, 'base64').toString('utf-8');
        const assetPath = req.params[0] || '';
        const fullUrl = `${decodedUrl}/${assetPath}`;
        
        console.log(`Proxying request to: ${fullUrl}`);

        // Validate URL
        try {
            new URL(fullUrl);
        } catch (e) {
            return res.status(400).json({
                error: 'Invalid URL',
                message: 'The provided URL is not valid'
            });
        }

        const response = await fetch(fullUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch resource: ${response.statusText}`);
        }

        const headers = response.headers;
        const contentType = headers.get('content-type') || 'application/octet-stream';
        const contentLength = headers.get('content-length');

        // Set security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Set CORS headers for assets
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        res.set('Content-Type', contentType);
        if (contentLength) {
            res.set('Content-Length', contentLength);
        }

        // Handle streaming response
        let isStreaming = false;
        if (contentType.startsWith('video/') || contentType.startsWith('audio/')) {
            isStreaming = true;
            res.setHeader('Transfer-Encoding', 'chunked');
        }

        // Stream the response
        response.body.pipe(res);

        // Handle errors during streaming
        response.body.on('error', (streamError) => {
            console.error('Stream error:', streamError);
            res.destroy();
        });

        // Handle client disconnection
        res.on('close', () => {
            if (isStreaming) {
                response.body.destroy();
            }
        });

    } catch (error) {
        console.error(`Error proxying request: ${error.message}`);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

server.on('error', (err) => {
    console.error('Server error:', err);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
    console.log("SIGTERM signal received: closing HTTP server");
    server.close();
    bareServer.close();
    process.exit(0);
}