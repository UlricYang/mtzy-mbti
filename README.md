# 明途智引 MBTI 测评报告系统

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-5.2-646CFF?logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss" alt="TailwindCSS">
  <img src="https://img.shields.io/badge/Bun-1.0-000000?logo=bun" alt="Bun">
</p>

<p align="center">
  <strong>一款专业级的 MBTI 人格测评报告生成工具，支持可视化展示、多格式导出和个性化分析</strong>
</p>

---

## 📖 项目简介

**明途智引 (MTZY-MBTI)** 是一个基于 React + TypeScript 开发的 MBTI 人格测评报告系统。该系统能够：

- 🧠 展示 MBTI 16型人格详细分析报告
- 📊 可视化展示多元智能评估结果
- 💼 提供职业价值观分析
- 📄 支持 PDF、PNG、WebP、HTML 多格式导出
- 🎨 精美的数据可视化图表和动画效果
- 🌐 支持本地文件协议直接运行

---

## 🚀 快速开始

### 环境要求

- [Bun](https://bun.sh/) 1.0+ (推荐) 或 Node.js 18+
- 现代浏览器 (Chrome, Firefox, Safari, Edge)

### 安装依赖

```bash
bun install
```

### 开发模式

```bash
# 使用 CLI 启动开发服务器
bun run dev -i ./inputs/inputs.json -t my-report --watch

# 参数说明
# -i, --input <path>    输入数据文件路径（JSON文件或目录）【必需】
# -t, --tag <string>    报告标识符【必需】
# -p, --port <number>   开发服务器端口 (默认: 5173)
# -w, --watch           监听输入文件变化，自动重新加载
# -v, --verbose         显示详细日志
```

### 构建生产版本

```bash
bun run build
```

构建后的文件将输出到 `dist/` 目录，支持直接通过 `file://` 协议在浏览器中打开。

---

## 📊 导出报告

使用 CLI 工具可以将报告导出为多种格式：

```bash
bun run export -i ./inputs/inputs.json -o ./output -t my-report -f pdf,png,webp,html

# 参数说明
# -i, --input <path>      输入数据文件路径（JSON文件或目录）【必需】
# -o, --output <path>     输出目录路径【必需】
# -t, --tag <string>      报告标识符【必需】
# -f, --format <formats>  输出格式，逗号分隔 (pdf,png,webp,html) (默认: "pdf,png,webp,html")
# -q, --quality <level>   图片质量 (standard: 144dpi, high: 216dpi, print: 288dpi) (默认: "standard")
# -v, --verbose           显示详细日志
```

---

## 🌐 Web Service API

使用 CLI 工具可以启动 Web 服务，提供 HTTP API 用于外部系统调用：

```bash
bun run server -p 3000 -o ./output

# 参数说明
# -p, --port <number>     服务器端口 (默认: 3000)
# -o, --output <path>     输出目录路径 (默认: ./output)
# -v, --verbose           显示详细日志
```

### API 端点

Web 服务启动后会同时运行两个服务器：
- **API Server** (默认端口 3000): 处理 API 请求
- **Vite Preview Server** (默认端口 3001): 提供动态预览

#### POST /api/preview

快速预览接口 - 将数据存储在内存中，返回预览 URL。适合需要快速查看报告的场景。

**请求体:**
```json
{
  "student_id": "20240001",
  "file_path": "/absolute/path/to/inputs.json"
}
```

**成功响应:**
```json
{
  "status": "success",
  "message": null,
  "data": {
    "id": "20240001",
    "timestamp": 1713600000000,
    "results": {
      "url": "http://localhost:3001/report/20240001/20260420143052",
      "png": "",
      "pdf": ""
    }
  }
}
```

**说明：**
- `timestamp`: Unix 时间戳 (毫秒)
- `url`: 预览页面的完整 URL，包含人类可读的 YYYYMMDDHHmmss 时间格式
- `png` 和 `pdf`: 预览接口不生成文件，默认为空字符串

---

#### POST /api/export

导出接口 - 直接生成 PNG/PDF 文件。适合需要下载文件的场景。

**请求体:**
```json
{
  "student_id": "20240001",
  "file_path": "/absolute/path/to/inputs.json"
}
```

**成功响应:**
```json
{
  "status": "success",
  "message": null,
  "data": {
    "id": "20240001",
    "timestamp": 1713600000000,
    "results": {
      "url": "",
      "png": "/output/report-20240001-20260420143052.png",
      "pdf": "/output/report-20240001-20260420143052.pdf"
    }
  }
}
```

**说明：**
- 导出接口与预览接口完全独立，可单独使用
- 文件名使用统一的时间戳格式: `report-{student_id}-{YYYYMMDDHHmmss}.{format}`
- `url`: 导出接口不生成预览，默认为空字符串

---

#### POST /api/report

 legacy 复合接口 - 同时生成预览和导出文件。

**请求体:**
```json
{
  "student_id": "20240001",
  "file_path": "/absolute/path/to/inputs.json"
}
```

**成功响应:**
```json
{
  "status": "success",
  "message": null,
  "data": {
    "id": "20240001",
    "timestamp": 1713600000000,
    "results": {
      "url": "http://localhost:3001/report/20240001/20260420143052",
      "png": "/output/report-20240001-20260420143052.png",
      "pdf": "/output/report-20240001-20260420143052.pdf"
    }
  }
}
```

**错误响应 (所有接口):**
```json
{
  "status": "error",
  "message": "File not found: /path/to/inputs.json",
  "data": null
}
```

### 测试 API

使用测试脚本 (推荐):
```bash
# 启动 Web 服务后，在另一个终端运行测试脚本
bun run server -p 3000 -o ./output
bash scripts/cli/test-web.sh
```

或手动测试:

```bash
# 启动 Web 服务
bun run server -p 3000 -o ./output

# 测试预览接口
curl -X POST http://localhost:3000/api/preview \
  -H "Content-Type: application/json" \
  -d '{"student_id":"20240001","file_path":"/path/to/inputs.json"}'

# 测试导出接口
curl -X POST http://localhost:3000/api/export \
  -H "Content-Type: application/json" \
  -d '{"student_id":"20240001","file_path":"/path/to/inputs.json"}'

# 测试复合接口
curl -X POST http://localhost:3000/api/report \
  -H "Content-Type: application/json" \
  -d '{"student_id":"20240001","file_path":"/path/to/inputs.json"}'
```
---

## 🏗️ 项目结构

```
mtzy-mbti/
├── 📁 public/                    # 静态资源
│   ├── 📄 inputs.json           # 默认输入数据
│   ├── 📁 assets/
│   │   └── 📁 data/             # MBTI 类型数据
│   │       ├── 📄 mbti-types.json
│   │       ├── 📄 mbti-function-stacks.json
│   │       ├── 📄 mbti-distribution-China.json
│   │       └── 📄 [MBTI类型].json  # 各类型详细数据 (INFJ.json, INTJ.json, etc.)
│   └── 📄 [MBTI类型].json       # 类型数据副本
│
├── 📁 src/                      # 源代码
│   ├── 📁 components/           # React 组件
│   │   ├── 📁 modules/          # 功能模块组件
│   │   │   ├── 📄 Dashboard.tsx           # 主仪表盘
│   │   │   ├── 📄 HeroSection.tsx         # 顶部展示区
│   │   │   ├── 📄 MBTIPersonalityDetail.tsx # MBTI 详情
│   │   │   ├── 📄 MBTITypeComparison.tsx  # 类型对比
│   │   │   ├── 📄 MBTIInsightsCard.tsx    # 洞察卡片
│   │   │   ├── 📄 CognitiveFunctionStack.tsx # 认知功能栈
│   │   │   └── 📄 SectionDivider.tsx      # 分隔线
│   │   ├── 📁 sections/         # 页面区块
│   │   │   ├── 📄 MBTISection.tsx         # MBTI 区块
│   │   │   ├── 📄 IntelligencesSection.tsx # 多元智能区块
│   │   │   └── 📄 ValuesSection.tsx       # 价值观区块
│   │   ├── 📁 charts/           # 图表组件
│   │   │   ├── 📄 RadarChart.tsx          # 雷达图
│   │   │   └── 📄 BarChart.tsx            # 条形图
│   │   └── 📁 ui/               # UI 组件库 (shadcn/ui + 自定义)
│   │       ├── 📄 accordion.tsx
│   │       ├── 📄 card.tsx
│   │       ├── 📄 tabs.tsx
│   │       ├── 📄 badge.tsx
│   │       ├── 📄 button.tsx
│   │       ├── 📄 text-generate-effect.tsx
│   │       ├── 📄 magic-card.tsx
│   │       ├── 📄 sparkles.tsx
│   │       └── ...
│   ├── 📁 lib/                  # 工具函数
│   │   ├── 📄 utils.ts          # 通用工具
│   │   └── 📄 data-loader.ts    # 数据加载器
│   ├── 📁 types/                # TypeScript 类型定义
│   │   └── 📄 index.ts          # 全局类型
│   ├── 📁 assets/               # 资源文件
│   ├── 📄 App.tsx               # 应用主组件
│   ├── 📄 main.tsx              # 应用入口
│   └── 📄 index.css             # 全局样式
│
├── 📁 scripts/                  # 脚本工具
│   ├── 📁 cli/                  # CLI 工具
│   │   ├── 📄 index.ts          # CLI 入口
│   │   │   ├── 📄 dev.ts        # 开发服务器命令
│   │   │   ├── 📄 export.ts     # 导出命令
│   │   │   └── 📄 server.ts     # Web 服务命令
│   │   ├── 📁 plugins/          # 导出插件
│   │   │   ├── 📄 export-pdf.ts
│   │   │   ├── 📄 export-png.ts
│   │   │   └── 📄 export-html.ts
│   │   └── 📁 lib/              # CLI 工具库
│   │   │   ├── 📄 file-utils.ts
│   │   │   ├── 📄 logger.ts
│   │   │   ├── 📄 types.ts
│   │   │   ├── 📄 preview-handler.ts
│   │   │   ├── 📄 export-handler.ts
│   │   │   └── 📄 report-handler.ts
│   └── 📁 tool/                 # 数据处理工具
│       ├── 📄 extract-celebrities.ts
│       ├── 📄 categorize-celebrities-by-occupation.ts
│       └── 📄 split-json.ts
│
├── 📁 inputs/                   # 输入数据目录
│   └── 📄 inputs.json           # 测试数据输入
│
├── 📄 package.json              # 项目配置
├── 📄 vite.config.ts            # Vite 配置
├── 📄 tailwind.config.js        # Tailwind CSS 配置
├── 📄 tsconfig.json             # TypeScript 配置
├── 📄 components.json           # shadcn/ui 配置
└── 📄 index.html                # HTML 入口
```

---

## 🛠️ 技术栈

### 核心框架

| 技术 | 版本 | 用途 |
|------|------|------|
| [React](https://react.dev/) | 18.2+ | UI 框架 |
| [TypeScript](https://www.typescriptlang.org/) | 5.2+ | 类型安全 |
| [Vite](https://vitejs.dev/) | 5.2+ | 构建工具 |
| [Bun](https://bun.sh/) | 1.0+ | 运行时 & 包管理器 |

### UI 与样式

| 技术 | 版本 | 用途 |
|------|------|------|
| [Tailwind CSS](https://tailwindcss.com/) | 3.4 | 原子化 CSS |
| [Radix UI](https://www.radix-ui.com/) | 1.x | 无头 UI 组件 |
| [shadcn/ui](https://ui.shadcn.com/) | - | UI 组件库 |
| [Framer Motion](https://www.framer.com/motion/) | 12.x | 动画效果 |
| [Lucide React](https://lucide.dev/) | 1.8+ | 图标库 |

### 数据可视化

| 技术 | 版本 | 用途 |
|------|------|------|
| [Recharts](https://recharts.org/) | 3.8+ | 图表绘制 |
| [tsParticles](https://particles.js.org/) | 3.9+ | 粒子动画背景 |

### 导出与工具

| 技术 | 版本 | 用途 |
|------|------|------|
| [PDFKit](https://pdfkit.org/) | 0.18+ | PDF 生成 |
| [Playwright](https://playwright.dev/) | 1.59+ | 浏览器自动化 (导出) |
| [Sharp](https://sharp.pixelplumbing.com/) | 0.34+ | 图片处理 |
| [Commander](https://github.com/tj/commander.js/) | 14.x | CLI 框架 |

---

## 📋 输入数据格式

应用程序需要一个 JSON 文件作为输入，包含以下结构：

```typescript
interface TestData {
  // MBTI 测评结果
  mbti: {
    [type: string]: {
      career_match: string
      personality_insights: {
        core_traits: string
        strengths: string[]
        challenges: string[]
        behavior_patterns: string
      }
      relationship_advice: {
        communication_style: string
        strengths_in_relationships: string[]
        improvement_areas: string[]
      }
    }
  }
  
  // 多元智能评估
  multiple_intelligences: {
    multiple_intelligences_result: Record<string, number>
    multiple_intelligences_strengths: Record<string, string>
    multiple_intelligences_description: Record<string, string>
    primary_recommand_major_list: string[]
    secondary_recommand_major_list: string[]
    not_recommand_major_list: string[]
  }
  
  // 职业价值观
  student_value: Record<string, {
    score: number
    majors: string[]
  }>
}
```

---

## 🎯 功能特性

### 1. MBTI 人格分析

- **类型概览**: 展示 MBTI 四维度分析 (E/I, N/S, T/F, J/P)
- **详细档案**: 包含性格特质、优势、挑战、行为模式
- **认知功能栈**: 展示主导、辅助、第三、劣势功能
- **人际关系**: 提供沟通风格、关系优势和改进建议
- **职业匹配**: 适合的职业方向推荐
- **类型对比**: -A (自信型) vs -T (动荡型) 对比分析

### 2. 多元智能评估

- **雷达图可视化**: 8 大智能领域评分展示
  - 语言智能、逻辑数学智能、空间智能
  - 音乐智能、身体动觉智能、人际智能
  - 内省智能、自然观察智能
- **专业推荐**: 基于智能优势推荐适合的专业方向

### 3. 职业价值观分析

- **条形图展示**: 6 大价值观维度评分
  - 科学型、经济型、社会型
  - 政治型、审美型、精神型
- **专业匹配**: 各价值观对应的专业推荐

### 4. 数据导出

支持将完整报告导出为：

- **PDF**: 高质量矢量文档，适合打印
- **PNG**: 高清图片格式
- **WebP**: 现代压缩格式，体积更小
- **HTML**: 完整交互式页面

---

## ⚙️ 配置说明

### Vite 配置 (`vite.config.ts`)

```typescript
export default defineConfig({
  base: './',           // 相对路径，支持本地文件协议
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),  // 路径别名
    },
  },
  build: {
    rollupOptions: {
      output: {
        format: 'iife',              // IIFE 格式，直接浏览器运行
        inlineDynamicImports: true,  // 内联动态导入
      },
    },
  },
})
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_DATA_PATH` | 数据文件路径 | `inputs/inputs.json` |

---

## 📝 可用脚本

| 命令 | 说明 |
|------|------|
JH| `bun run dev` | 启动 CLI 开发服务器 |
XJ| `bun run build` | 构建生产版本 |
KQ| `bun run export` | 导出报告 (PDF/PNG/WebP/HTML) |
VB| `bun run server` | 启动 Web 服务 (API + Preview) |
HV| `bun run lint` | 运行 ESLint 代码检查 |
NR| `bun run preview` | 预览生产构建 |

---

## 🧪 开发指南

### 添加新的 MBTI 类型数据

1. 在 `public/assets/data/` 目录下创建 `{TYPE}.json` 文件
2. 参考现有类型文件格式填充数据
3. 可选：添加 `{TYPE}-A.json` 和 `{TYPE}-T.json` 变体详情

### 自定义主题

编辑 `tailwind.config.js` 修改配色方案：

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: 'hsl(var(--primary))',
        foreground: 'hsl(var(--primary-foreground))',
      },
      // ...
    },
  },
}
```

### 添加新的导出格式

1. 在 `scripts/cli/plugins/` 创建 `export-{format}.ts`
2. 实现导出逻辑
3. 在 `commands/export.ts` 中注册新插件

---

## 📦 部署

### 静态托管

构建完成后，`dist/` 目录可直接部署到任何静态托管服务：

```bash
# 构建
bun run build

# 部署到 Netlify
netlify deploy --dir=dist --prod

# 部署到 Vercel
vercel --cwd dist
```

### 本地运行

由于使用 IIFE 格式构建，可以直接双击 `dist/index.html` 在浏览器中打开。

---

## 🤝 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

---

## 📄 许可证

[MIT](LICENSE) © 明途智引

---

## 🙏 致谢

- [shadcn/ui](https://ui.shadcn.com/) - 精美的 UI 组件库
- [16Personalities](https://www.16personalities.com/) - MBTI 理论基础
- [Recharts](https://recharts.org/) - 强大的图表库

---

<p align="center">
  用 ❤️ 和 🔮 构建
</p>
