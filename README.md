# 随机计算动态评优系统 (Stochastic Evaluation System)

这是一个基于 **React** + **TypeScript** + **Vite** 构建的高级动态评优系统，集成了多种随机补全算法（Box-Muller, 相关性回归, K-NN）和实时数据分析图表。

## 🛠 环境要求

在开始之前，请确保您的开发环境已安装以下工具：

- **Node.js**: 建议版本 `18.x` 或更高
- **npm** / **yarn** / **pnpm**: 任意一种包管理工具

## 🚀 快速开始

### 1. 克隆与安装

```bash
# 进入项目目录
cd stochastic-evaluation

# 安装依赖
npm install
```

### 2. 开发环境启动

```bash
# 启动开发服务器
npm run dev
```
启动后，访问浏览器中的 `http://localhost:5173` 即可查看应用。

## 📦 生产环境部署

### 1. 项目构建

执行以下命令将项目编译为生产环境可用的静态文件：

```bash
npm run build
```
构建完成后，生成的静态文件将存放在项目根目录下的 `dist` 文件夹中。

### 2. 部署方案

#### 方案 A：静态托管（推荐）
您可以将 `dist` 目录下的内容上传到任何静态托管服务：
- **Vercel / Netlify**: 关联 GitHub 仓库后，构建命令填入 `npm run build`，输出目录填入 `dist` 即可自动部署。
- **GitHub Pages**: 使用 `gh-pages` 分支进行托管。

#### 方案 B：使用 Nginx 部署
如果您使用自己的服务器，可以使用 Nginx 进行托管。以下是基础配置示例：

```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        root /path/to/stochastic-evaluation/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

## 🧪 技术栈

- **核心框架**: React 19
- **构建工具**: Vite (Rolldown)
- **样式处理**: Tailwind CSS
- **图标库**: Lucide React
- **数据可视化**: Recharts

---
**提示**：修改权重配置或导入新数据后，点击“开始评优”按钮即可触发随机补全算法。
