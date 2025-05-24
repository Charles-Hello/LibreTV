import path from 'path'; import express from 'express'; import axios from 'axios'; import cors from 'cors'; import { fileURLToPath } from 'url'; import fs from 'fs/promises'; import crypto from 'crypto';// 简单的 .env 文件加载器function loadEnv() {  try {    const envContent = fs.readFileSync('.env', 'utf8');    const lines = envContent.split('\n');    lines.forEach(line => {      const trimmedLine = line.trim();      if (trimmedLine && !trimmedLine.startsWith('#')) {        const [key, ...valueParts] = trimmedLine.split('=');        if (key && valueParts.length > 0) {          const value = valueParts.join('=').trim();          process.env[key.trim()] = value;        }      }    });    console.log('已加载 .env 文件');  } catch (error) {    // .env 文件不存在或读取失败，使用环境变量    console.log('未找到 .env 文件，使用系统环境变量');  }}// 加载环境变量loadEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// 启用 CORS
app.use(cors());

// SHA-256 哈希函数
function sha256(message) {
  return crypto.createHash('sha256').update(message).digest('hex');
}

// 处理HTML文件，注入密码哈希
async function processHtmlFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');

    // 获取环境变量中的密码
    const password = process.env.PASSWORD || '';
    let passwordHash = '';
    if (password) {
      passwordHash = sha256(password);
      console.log(`密码保护已启用，密码: ${password}`);
      console.log(`密码哈希: ${passwordHash}`);
    } else {
      console.log('未设置密码，网站为公开访问');
    }

    // 替换密码占位符
    const modifiedContent = content.replace(
      'window.__ENV__.PASSWORD = "{{PASSWORD}}";',
      `window.__ENV__.PASSWORD = "${passwordHash}"; // SHA-256 hash`
    );

    return modifiedContent;
  } catch (error) {
    console.error(`读取文件 ${filePath} 失败:`, error);
    throw error;
  }
}

// 处理HTML路由
app.get('/', async (req, res) => {
  try {
    const content = await processHtmlFile(path.join(__dirname, 'index.html'));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(content);
  } catch (error) {
    console.error(error);
    res.status(500).send('读取 index.html 失败');
  }
});

app.get('/player.html', async (req, res) => {
  try {
    const content = await processHtmlFile(path.join(__dirname, 'player.html'));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(content);
  } catch (error) {
    console.error(error);
    res.status(500).send('读取 player.html 失败');
  }
});

// 静态文件路径（排除HTML文件，因为我们要特殊处理）
app.use(express.static('./', {
  setHeaders: (res, path) => {
    // 阻止直接访问HTML文件，强制通过我们的路由处理
    if (path.endsWith('.html')) {
      res.status(404).send('Not Found');
      return false;
    }
  }
}));

app.get('/proxy/:encodedUrl', async (req, res) => {
  try {
    // 获取 URL 编码的参数
    const encodedUrl = req.params.encodedUrl;

    // 对 URL 进行解码
    const targetUrl = decodeURIComponent(encodedUrl);

    // 安全验证
    if (!isValidUrl(targetUrl)) {
      return res.status(400).send('Invalid URL');
    }

    // 发起请求
    const response = await axios({
      method: 'get',
      url: targetUrl,
      responseType: 'stream',
      timeout: 5000
    });

    // 转发响应头（过滤敏感头）
    const headers = { ...response.headers };
    delete headers['content-security-policy'];
    delete headers['cookie'];
    res.set(headers);

    // 管道传输响应流
    response.data.pipe(res);
  } catch (error) {
    if (error.response) {
      error.response.data.pipe(res)
    } else {
      res.status(500).send(error.message)
    }
  }
});

// 安全验证：检查是否为合法 URL
const isValidUrl = (urlString) => {
  try {
    const parsed = new URL(urlString);
    const allowedProtocols = ['http:', 'https:'];
    const blockedHostnames = ['localhost', '127.0.0.1'];

    return allowedProtocols.includes(parsed.protocol) &&
      !blockedHostnames.includes(parsed.hostname);
  } catch {
    return false;
  }
};

app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
  console.log('='.repeat(50));
  if (process.env.PASSWORD) {
    console.log('🔒 密码保护已启用');
    console.log(`📝 访问密码: ${process.env.PASSWORD}`);
  } else {
    console.log('🌐 公开访问模式');
  }
  console.log('='.repeat(50));
});

