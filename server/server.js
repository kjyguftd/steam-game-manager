const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const router = require('./router');

const PORT = 3000;
const CLIENT_ROOT = path.join(__dirname, '../client');

// 辅助函数：处理静态文件请求
const serveStaticFile = (res, filePath, contentType, responseCode = 200) => {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error(`Error reading static file: ${filePath}`, err);
            // 如果文件不存在，返回 404
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }
        res.writeHead(responseCode, { 'Content-Type': contentType });
        res.end(data);
    });
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // 1. 检查是否为 API 请求
    if (pathname.startsWith('/api/')) {
        // 将请求交给 router.js 处理
        router.handleRequest(req, res);
        return;
    }

    // 2. 否则，尝试处理静态文件请求

    // 默认请求 'index.html'
    let filePath = pathname === '/' ? path.join(CLIENT_ROOT, 'index.html') : path.join(CLIENT_ROOT, pathname);

    // 确定 Content-Type
    let contentType = 'text/html';
    const ext = path.extname(filePath);

    switch (ext) {
        case '.css':
            contentType = 'text/css';
            break;
        case '.js':
            contentType = 'application/javascript';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        // Chart.js 可能会作为 CDN 引用，但如果本地包含，则需要处理
    }

    serveStaticFile(res, filePath, contentType);
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});