import http from 'http';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HTTP_PORT = parseInt(process.env.PORT ?? process.env.HTTP_PORT ?? '8080');
const BACKEND_WS_HOST = process.env.BACKEND_WS_HOST ?? process.env.WS_HOST ?? 'localhost';
const BACKEND_WS_PORT = parseInt(process.env.BACKEND_WS_PORT ?? process.env.WS_PORT ?? '8081');

console.log(`UI Server configuration:
  UI HTTP Port: ${HTTP_PORT}
  Backend WS Host: ${BACKEND_WS_HOST}
  Backend WS Port: ${BACKEND_WS_PORT}`);

const server = http.createServer((req, res) => {
    let filePath = req.url === '/' || req.url === '/index.html' ? './index.html' : req.url;
    !path.extname(filePath) && (filePath += '.html');

    const localPath = path.join(__dirname, filePath);
    const fullPath = fs.existsSync(localPath) && fs.statSync(localPath).isFile()
        ? localPath
        : (filePath.startsWith('/core/') || filePath.startsWith('/agent/'))
            ? path.join(__dirname, '..', filePath)
            : localPath;

    fs.readFile(fullPath, 'utf8', (err, content) => {
        if (err) {
            const [code, msg] = err.code === 'ENOENT' ? [404, 'File not found'] : [500, 'Server error'];
            console.log(`${code}: ${fullPath}`);
            res.writeHead(code);
            res.end(msg);
        } else {
            if (fullPath.endsWith('.html')) {
                content = content
                    .replace(/\{\{WEBSOCKET_PORT}}/g, BACKEND_WS_PORT.toString())
                    .replace(/\{\{WEBSOCKET_HOST}}/g, 'undefined');
            }

            const contentTypeMap = {
                '.js': 'application/javascript',
                '.css': 'text/css',
                '.json': 'application/json'
            };
            const contentType = contentTypeMap[path.extname(fullPath)] ?? 'text/html';

            res.writeHead(200, {'Content-Type': contentType});
            res.end(content, 'utf-8');
        }
    });
});

server.listen(HTTP_PORT, () => {
    console.log(`UI Server running at http://localhost:${HTTP_PORT}`);
    console.log(`UI will connect to backend WebSocket at ws://${BACKEND_WS_HOST}:${BACKEND_WS_PORT}`);
    console.log('Open your browser at the URL above to use SeNARS UI.');
});
