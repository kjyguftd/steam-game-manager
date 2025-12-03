const url = require('url');
const authController = require('./controllers/authController.js');
const libraryController = require('./controllers/libraryController.js');
const backlogController = require('./controllers/backlogController.js');
const chartController = require('./controllers/chartController.js');
const userController = require('./controllers/userController.js');
const ollamaController = require('./controllers/ollamaController.js');

// 路由映射表使用路径模式 (注意：使用 :id 作为占位符)
// { 'METHOD /path/pattern': handlerFunction }
const routes = {
    // 认证路由
    'POST /api/auth/register': authController.register,
    'POST /api/auth/login': authController.login,
    'POST /api/auth/logout': authController.logout,

    // 库同步（支持 POST/GET 两种方式，均需认证）
    'POST /api/library/sync': (req, res) => authController.authenticate(req, res, libraryController.syncLibrary),
    'GET /api/library/sync': (req, res) => authController.authenticate(req, res, libraryController.syncLibrary),

    // Backlog CRUD 路由 (需要认证)
    'GET /api/backlog': (req, res) => authController.authenticate(req, res, backlogController.getAllBacklogItems),
    'POST /api/backlog': (req, res) => authController.authenticate(req, res, backlogController.createBacklog),
    'PUT /api/backlog/:id': (req, res) => authController.authenticate(req, res, backlogController.updateBacklog),
    'DELETE /api/backlog/:id': (req, res) => authController.authenticate(req, res, backlogController.deleteBacklog),

    // 图表数据路由 (需要认证)
    'GET /api/charts/playtime': (req, res) => authController.authenticate(req, res, chartController.getPlaytimeSummary),

    // 保存用户 Steam API Key（必须认证或可按需移除认证）
    'POST /api/user/:id/apikey': (req, res) => authController.authenticate(req, res, userController.saveApiKey),

    // Ollama AI 路由 (需要认证)
    'POST /api/ollama/profile': (req, res) => authController.authenticate(req, res, ollamaController.generatePlayerProfile),
    'POST /api/ollama/balance': (req, res) => authController.authenticate(req, res, ollamaController.generateLifeBalance),
};

/**
 * 匹配路径并提取动态参数
 * 返回 { handler, params } 或 null
 */
const matchRoute = (method, path) => {
    const routeKeys = Object.keys(routes);
    for (const key of routeKeys) {
        const [routeMethod, routePathPattern] = key.split(' ');
        if (routeMethod !== method) continue;

        // 提取参数名数组 e.g. [ 'id' ]
        const paramNames = [];
        const patternWithCapture = routePathPattern.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
            paramNames.push(name);
            return '([^/]+)';
        });
        const regex = new RegExp(`^${patternWithCapture}$`);
        const m = regex.exec(path);
        if (m) {
            const params = {};
            // m[0] 是完整匹配，组从 m[1] 开始
            for (let i = 0; i < paramNames.length; i++) {
                params[paramNames[i]] = decodeURIComponent(m[i + 1]);
            }
            return { handler: routes[key], params };
        }
    }
    return null;
};

const handleRequest = (req, res) => {
    // 基本 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    const parsedUrl = url.parse(req.url, true);
    const method = req.method;
    const path = parsedUrl.pathname;

    const match = matchRoute(method, path);

    if (!match) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'API Endpoint Not Found' }));
        return;
    }

    // 将查询参数与动态 params 赋到 req 上，供 handler 使用
    req.query = parsedUrl.query || {};
    req.params = match.params || {};

    const handler = match.handler;

    // 仅对 POST/PUT 解析 JSON body
    if (method === 'POST' || method === 'PUT') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            // 简单保护，防止过大请求
            if (body.length > 1e7) {
                // 10MB 限制
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Payload too large' }));
                req.destroy();
            }
        });
        req.on('end', () => {
            if (body) {
                try {
                    req.body = JSON.parse(body);
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Invalid JSON payload' }));
                    return;
                }
            } else {
                req.body = {};
            }
            try {
                handler(req, res);
            } catch (e) {
                console.error('Handler error:', e);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: e.message || 'internal_server_error' }));
            }
        });
    } else {
        // GET/DELETE 等直接调用
        try {
            handler(req, res);
        } catch (e) {
            console.error('Handler error:', e);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: e.message || 'internal_server_error' }));
        }
    }
};

module.exports = {
    handleRequest
};