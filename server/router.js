const url = require('url');
const authController = require('./controllers/authController');
const libraryController = require('./controllers/libraryController');
const backlogController = require('./controllers/backlogController'); // 导入 Backlog 控制器
const chartController = require('./controllers/chartController'); // 导入新的控制器
// 路由映射表使用路径模式 (注意：使用 :id 作为占位符)
// { 'METHOD /path/pattern': handlerFunction }
const routes = {
    // 认证路由
    'POST /api/auth/register': authController.register,
    'POST /api/auth/login': authController.login,
    'POST /api/auth/logout': authController.logout,

    // 游戏库同步路由 (需要认证)
    'GET /api/library/sync': (req, res) => authController.authenticate(req, res, libraryController.syncLibrary),

    // Backlog CRUD 路由 (需要认证)
    'GET /api/backlog': (req, res) => authController.authenticate(req, res, backlogController.getAllBacklogItems),
    'POST /api/backlog': (req, res) => authController.authenticate(req, res, backlogController.createBacklog),
    'PUT /api/backlog/:id': (req, res) => authController.authenticate(req, res, backlogController.updateBacklog),
    'DELETE /api/backlog/:id': (req, res) => authController.authenticate(req, res, backlogController.deleteBacklog),

    // 图表数据路由 (需要认证)
    'GET /api/charts/playtime': (req, res) => authController.authenticate(req, res, chartController.getPlaytimeSummary),
};

// **新的路由匹配函数，支持动态路径**
const matchRoute = (method, path) => {
    const routeKeys = Object.keys(routes);
    for (const key of routeKeys) {
        const [routeMethod, routePathPattern] = key.split(' ');

        if (routeMethod === method) {
            // 将路径模式转换为正则表达式 (替换 :id 为捕获组)
            const regexPath = routePathPattern.replace(/:[a-zA-Z]+/g, '([^/]+)');
            const regex = new RegExp(`^${regexPath}$`);

            if (regex.test(path)) {
                // 如果匹配，返回对应的处理函数
                return routes[key];
            }
        }
    }
    return null; // 未找到匹配项
};

const handleRequest = (req, res) => {
    // ... (CORS 和 OPTIONS 处理不变) ...

    const parsedUrl = url.parse(req.url, true);
    const method = req.method;
    const path = parsedUrl.pathname;

    // 使用新的匹配函数查找处理程序
    const handler = matchRoute(method, path);

    if (handler) {
        if (method === 'POST' || method === 'PUT') {
            // ... (请求体处理不变) ...
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    req.body = JSON.parse(body);
                    handler(req, res);
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Invalid JSON payload' }));
                }
            });
        } else {
            handler(req, res);
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'API Endpoint Not Found' }));
    }
};

module.exports = {
    handleRequest
};