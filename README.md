# Hot100 刷题台

<div align="center">

**个人刷题 + 秋招备战工作台：100 道 LeetCode Hot 100 题，双模式评测 + 参考题解 + CodeTop 高频/公司数据**

</div>

本地运行的 LeetCode Hot 100 刷题工作台，支持 **ACM 模式**（stdin/stdout 完整程序）与**核心代码模式**（LeetCode 风格函数签名）双模式评测，内置 100 道题的题目描述、ACM 输入输出规格、样例、测试用例与 Python3/C++ 双语言参考题解，并标注每道题在 [CodeTop](https://codetop.cc) 上的**高频排名与常考公司**，刷题不闭门造车。

## 快速开始

```bash
npm start          # 或 node server.js
# 打开 http://localhost:5173
```

依赖：Node.js ≥ 18，以及本机可用的 `python3` / `gcc` / `g++`（用于评测）。

## 功能

- **双模式**：题目页可切换 ACM / 核心代码模式。ACM 模式用 stdin/stdout 跑完整程序；核心代码模式只写函数/类，评测器自动构造链表/树/矩阵等参数并注入驱动运行。
- **全部评测**：一键运行该题全部测试用例（ACM 与核心代码各有 3~5 组），逐用例展示 期望/实际 对比。
- **CodeTop 高频数据**：每道题标注高频榜排名、出现次数、最近被考日期与常考公司标签，支持**按公司筛选**与按热度排序；数据来源见"数据致谢"。
- **解题思路**：每道题的题解页内置中文解题思路讲解（算法要点 + 复杂度），对照参考代码理解。
- **收藏与随机**：可收藏题目（错题本），支持"只看收藏"过滤与随机抽题。
- **参考题解**：每道题提供 Python3 与 C++ 的核心函数版 + ACM 完整程序版，可一键复制。
- **代码编辑器**：内置 CodeMirror（本地离线），语法高亮 / 行号 / 括号匹配 / 自动缩进。
- **进度追踪**：全部用例通过自动标记"已通过"，侧边栏显示进度条。
- **资源限制**：评测进程受内存（512MB）、输出体积（64KB）限制；程序**运行** CPU 时间上限 5s，**编译**步骤放宽至 30s（避免大驱动在慢机器上误判超时）；浮点输出自动容差比较。
- 快捷键：`Ctrl+Enter` 全部评测，`Ctrl+S` 保存。

## 目录结构

```
server.js                # HTTP 服务 + /api/run /api/check /api/judge
judge/
  runner.js              # 进程执行（编译/运行、资源限制）
  core-driver.js         # 核心代码模式驱动生成器（Python/C++，链表/树/矩阵序列化与比较）
  judge.js               # ACM 评测（编译一次逐用例运行）、核心代码评测、输出对比
public/
  index.html / styles.css / app.js   # 前端（CodeMirror 编辑器、双模式、题解、进度）
  data/                  # 数据（由 work/parts 合并生成）
    problems.json        # 100 题元数据 + ACM 规格/样例/模板 + 核心签名/模板 + CodeTop 高频数据
    tests.json           # 每题 ACM + core 测试用例
    solutions.json       # 每题 python3/cpp 的核心与 ACM 参考题解
  vendor/codemirror/     # CodeMirror 5（本地离线）
scripts/
  gen-bootstrap.js       # 生成最小引导数据（旧版元数据迁移）
  verify-parts.js        # 数据分片验证器（真实编译运行题解）
  merge-parts.js         # 合并 work/parts → public/data
  build-codetop-data.js  # 从 CodeTop 公开 API 构建高频/公司数据
  test-judge.js          # 评测管线自测（链表/树/矩阵/ops 等 18 项）
work/
  DATA_SCHEMA.md         # 数据 schema 文档（作者必读）
  example-full.json      # 完整示例（数组/链表/树/ops）
  parts/                 # 数据分片（problems/tests/solutions-<组>.json）
```

## 数据说明

### CodeTop 高频数据

题目页会展示该题在 [CodeTop](https://codetop.cc) 高频榜的排名、出现次数与常考公司（按出现次数排序）。数据来源于 CodeTop 公开接口，可用以下命令重新抓取构建：

```bash
node scripts/fetch-codetop.js     # 抓取 CodeTop 公开数据到 work/codetop/
node scripts/build-codetop-data.js  # 构建并写入 public/data/problems.json 的 freq 字段
```

### 测试用例记号

测试用例中链表/树等参数使用字符串记号（详见 `work/DATA_SCHEMA.md`）：

| 记号 | 含义 |
|---|---|
| `list:[1,2,3]` | 链表 ListNode |
| `cycleList:[[3,2,0,-4],1]` | 带环链表（1 为环入口下标，-1 无环） |
| `randomList:[[7,-1],[13,0],...]` | 带 random 指针的链表 |
| `intersectList:[[4,1,8,4,5],[5,0,1,8,4,5],2,3]` + `intersectB:` | 两条相交链表 |
| `tree:[3,9,20,null,null,15,7]` | 层序二叉树 |
| `grid:["11110","11010"]` | char 二维矩阵 |

ops 型题目（LRU/最小栈/Trie/数据流中位数）的核心用例使用 `{ops, args, expected}` 格式。

## 重新生成 / 扩展数据

```bash
node scripts/gen-bootstrap.js   # 首次：生成引导数据
# 编辑 work/parts/ 下的分片后：
node scripts/verify-parts.js <组名>   # 逐组验证（真实编译运行题解）
node scripts/merge-parts.js           # 合并到 public/data
node scripts/verify-parts.js all      # 全量验证
```

## 数据致谢

- 高频/公司数据来自 [CodeTop](https://codetop.cc)（面试题目总结平台），版权归其所有，本项目仅本地个人使用。
- 题库与题解为本项目自建内容。

## 安全提示

评测服务会在本机直接编译并运行你提交的代码（仅限本地工具使用）。请勿将此服务暴露到公网；如需远程使用，应在隔离容器/沙箱中运行。

## 参与贡献

欢迎提交 Issue 与 PR。代码风格与数据格式请参考 `work/DATA_SCHEMA.md`；改动数据后请运行 `node scripts/verify-parts.js all` 确保全部用例通过。

