# Hot100 刷题台 · 题目数据 Schema（子代理作者必读）

你的任务是为一组 10 道题编写三个 JSON 分片文件，**并用验证脚本确认全部通过**：

| 文件 | 内容 | 格式 |
|---|---|---|
| `work/parts/problems-<组名>.json` | 10 个题目对象数组 | 数组 |
| `work/parts/tests-<组名>.json` | 测试用例 | 对象，键为题目 id（字符串） |
| `work/parts/solutions-<组名>.json` | 参考题解 | 对象，键为题目 id（字符串） |

参考完整示例：`work/example-full.json`（含 1/206/94/146 四题全字段示例）与 `work/examples/` 下的三个示例分片（已通过验证）。
写完后运行 `node scripts/verify-parts.js <组名>`，**直到输出"✅ 全部通过"** 再结束。
验证器会真实编译/运行你的题解（Python3 与 C++ 各自跑 ACM 与核心代码两种模式），任何一处不一致都会失败。

---

## 1. problems-<组名>.json — 题目对象

```json
{
  "id": 1,
  "title": "两数之和",
  "difficulty": "简单",
  "topic": "数组/哈希",
  "url": "https://leetcode.cn/problems/two-sum/",
  "desc": "给定一个整数数组 nums 和一个整数目标值 target，请你在该数组中找出和为目标值 target 的那两个整数，并返回它们的数组下标。你可以假设每种输入只会对应一个答案。",
  "acm": {
    "input": "第一行一个整数 n，表示数组长度。\n第二行 n 个整数，表示数组 nums。\n第三行一个整数 target。",
    "output": "输出两个整数下标，空格分隔，末尾换行。",
    "examples": [
      { "input": "4\n2 7 11 15\n9\n", "output": "0 1\n" },
      { "input": "3\n3 2 4\n6\n", "output": "1 2\n" }
    ],
    "template": {
      "python3": "import sys\n\ndef main():\n    data = sys.stdin.read().strip().split()\n    if not data:\n        return\n    n = int(data[0])\n    nums = list(map(int, data[1:1 + n]))\n    target = int(data[1 + n])\n    # TODO: 实现两数之和，输出两个下标（空格分隔）\n\nif __name__ == \"__main__\":\n    main()\n",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    cin >> n;\n    vector<int> nums(n);\n    for (int i = 0; i < n; i++) cin >> nums[i];\n    int target;\n    cin >> target;\n    // TODO: 实现两数之和，输出两个下标（空格分隔）\n    return 0;\n}\n"
    }
  },
  "core": {
    "kind": "function",
    "className": "Solution",
    "method": "twoSum",
    "params": [
      { "name": "nums", "type": "int[]", "desc": "整数数组" },
      { "name": "target", "type": "int", "desc": "目标值" }
    ],
    "returns": "int[]",
    "returnsDesc": "两个下标的数组",
    "mutates": -1,
    "templates": {
      "python3": "def twoSum(nums, target):\n    # TODO: 返回两个下标组成的数组\n    pass\n",
      "cpp": "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // TODO\n    }\n};\n"
    }
  }
}
```

### 字段说明

- `id/title/difficulty/topic/url`：已由系统给出，**逐字照抄**（difficulty 只能是 简单/中等/困难）。
- `desc`：2~4 句中文题目描述，覆盖输入、输出、边界约定，不含 ACM 格式细节（格式在 acm.input/output）。
- `acm.input` / `acm.output`：ACM 模式的输入输出规格说明，中文，多行用 `\n`。必须与 examples 和 ACM 题解的解析代码严格一致。
- `acm.examples`：2 个左右样例（含边界/常规）。`input`/`output` 以 `\n` 结尾（多行输入最后一行也以 `\n` 结尾）。
- `acm.template`：**只有解析 + 输出骨架**（含 `# TODO`/`// TODO` 注释），不是题解！python3 和 cpp 都要有；解析代码必须与 acm.input 规格一致。C 可不提供。
- `core`：
  - `kind`：`function`（普通函数）或 `ops`（类 + 方法序列，如 LRU/Trie/最小栈/数据流中位数）。
  - `className`：C++ 类名。function 型统一 `Solution`；ops 型用真实类名（`LRUCache`/`MinStack`/`Trie`/`MedianFinder`）。
  - `method`：function 型的方法名。
  - `params`：参数表，`name`/`type`/`desc`。
  - `returns`：返回值类型。`returnsDesc`：返回说明。
  - `mutates`：原地修改类题目填**被修改参数的下标**（如 48 旋转图像填 0），否则 `-1`。
  - `templates`：核心代码模板（python3 函数 / cpp 类），带 TODO。
  - ops 型额外需要 `ops` 字段（见下）。
- **链表/树节点结构体（ListNode/TreeNode/Node）由评测环境提供，模板与题解中一律不得定义！** 在模板注释里提示用户即可。

### ops 型 core 示例（146 LRU）

```json
"core": {
  "kind": "ops",
  "className": "LRUCache",
  "ops": {
    "constructor": [ { "name": "capacity", "type": "int" } ],
    "methods": [
      { "name": "put", "args": ["int", "int"], "ret": "void" },
      { "name": "get", "args": ["int"], "ret": "int" }
    ]
  },
  "templates": {
    "python3": "class LRUCache:\n    def __init__(self, capacity: int):\n        # TODO\n    def get(self, key: int) -> int:\n        # TODO\n    def put(self, key: int, value: int) -> None:\n        # TODO\n",
    "cpp": "class LRUCache {\npublic:\n    LRUCache(int capacity) {\n        // TODO\n    }\n    int get(int key) {\n        // TODO\n    }\n    void put(int key, int value) {\n        // TODO\n    }\n};\n"
  }
}
```

---

## 2. tests-<组名>.json — 测试用例

```json
{
  "1": {
    "acm": [
      { "input": "4\n2 7 11 15\n9\n", "output": "0 1\n" },
      { "input": "3\n3 2 4\n6\n", "output": "1 2\n" },
      { "input": "2\n3 3\n6\n", "output": "0 1\n" },
      { "input": "1\n5\n5\n", "output": "0 0\n" }
    ],
    "core": [
      { "args": [[2, 7, 11, 15], 9], "expected": [0, 1] },
      { "args": [[3, 2, 4], 6], "expected": [1, 2] },
      { "args": [[3, 3], 6], "expected": [0, 1] }
    ]
  }
}
```

- 每题 **acm 3~5 组、core 3~5 组**（ops 题 core 用例用 `{ops, args, expected}` 格式，见下）。
- **expected 必须由你实际运行参考题解得到**（见第 4 节验证流程），不得手算猜测。
- 覆盖常规、边界（空、单元素、全相同、负数、最大规模小样例等）。
- 注意数组输出**顺序**：多数题目评测器按精确顺序比较。对"任意顺序均可"的题目（如 49 分组、438 起始下标），以你题解产出的**确定性顺序**作为 expected。

### ops 型 core 用例（146 LRU）

```json
{ "ops": ["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"],
  "args": [[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]],
  "expected": [null, null, null, 1, null, -1, null, -1, 3, 4] }
```

第一个 op 是构造（args 为构造参数），void 方法的返回为 `null`。

### 参数/期望值的特殊记号（字符串前缀）

| 记号 | 含义 | 示例 |
|---|---|---|
| `list:` | 链表（ListNode） | `"list:[1,2,3,4,5]"`，空表 `"list:[]"` |
| `cycleList:` | 带环链表 `[值数组, 环入口下标]`（-1 无环） | `"cycleList:[[3,2,0,-4],1]"` |
| `randomList:` | 带 random 指针链表，`[[值, random下标], ...]`（-1 为 null） | `"randomList:[[7,-1],[13,0],[11,4],[10,2],[1,0]]"` |
| `intersectList:` | 相交链表 `[listA, listB, skipA, skipB]`，**作为第一个参数** | `"intersectList:[[4,1,8,4,5],[5,0,1,8,4,5],2,3]"` |
| `intersectB:` | 取上面构建的 B 链头，**作为第二个参数** | `"intersectB:"` |
| `tree:` | 层序二叉树（`null` 表示空子节点，末尾不留 null） | `"tree:[3,9,20,null,null,15,7]"` |
| `grid:` | char 二维矩阵（每行一个字符串） | `"grid:[\"11110\",\"11010\",\"11000\",\"00000\"]"` |

- 相交链表（160）用法：`args: ["intersectList:[[4,1,8,4,5],[5,0,1,8,4,5],2,3]", "intersectB:"]`，期望为相交点起的链表 `"list:[8,4,5]"`。**两条链必须真的共享节点**（该记号保证）。
- 环形链表 II（142）返回环入口的**节点值**（int），用例中环的节点值请保证唯一，使入口可确定。

### 参数/返回值类型对照

`int` `long` `double` `bool` `string` `char` `int[]` `long[]` `int[][]` `string[]` `string[][]` `grid`（=char[][]，参数行用字符串）`list`（ListNode*）`tree`（TreeNode*）`randomList`（Node*，138 用）`void`（配合 mutates）。

常见映射：1/15/18→int[]；283/189/31/75/73/48/41→mutates:0；160/206/21/24/25/2/19/148/234→list；141→bool（参数 cycleList）；142→int；138→randomList；94/104/226/101/543/102/108/98/230/199/114/105/437/236/124→tree；200/994→grid；79→grid + string；146/155/208/295→ops。

---

## 3. solutions-<组名>.json — 参考题解

```json
{
  "1": {
    "python3": {
      "core": "def twoSum(nums, target):\n    d = {}\n    for i, v in enumerate(nums):\n        if target - v in d:\n            return [d[target - v], i]\n        d[v] = i\n    return []\n",
      "acm": "import sys\n\ndef main():\n    data = sys.stdin.read().strip().split()\n    if not data:\n        return\n    n = int(data[0])\n    nums = list(map(int, data[1:1 + n]))\n    target = int(data[1 + n])\n    d = {}\n    for i, v in enumerate(nums):\n        if target - v in d:\n            print(d[target - v], i)\n            return\n        d[v] = i\n\nif __name__ == \"__main__\":\n    main()\n"
    },
    "cpp": {
      "core": "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int, int> m;\n        for (int i = 0; i < (int)nums.size(); i++) {\n            if (m.count(target - nums[i])) return {m[target - nums[i]], i};\n            m[nums[i]] = i;\n        }\n        return {};\n    }\n};\n",
      "acm": "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    cin >> n;\n    vector<int> nums(n);\n    for (int i = 0; i < n; i++) cin >> nums[i];\n    int target;\n    cin >> target;\n    unordered_map<int, int> m;\n    for (int i = 0; i < n; i++) {\n        if (m.count(target - nums[i])) {\n            cout << m[target - nums[i]] << ' ' << i << '\\n';\n            return 0;\n        }\n        m[nums[i]] = i;\n    }\n    return 0;\n}\n"
    }
  }
}
```

- `core`：核心函数/类实现，Python 为函数（ops 为类），C++ 为 `class Solution { ... };`（ops 为真实类名）。
- `acm`：完整可运行程序，从 stdin 读、向 stdout 写，**解析必须与 acm.input 规格一致，输出必须与 acm.output 规格一致**（每行输出以 `\n` 结尾）。
- C++ 不得定义 ListNode/TreeNode/Node（环境提供）；可用 `#include <bits/stdc++.h>`。
- 算法应为主流最优解（哈希/双指针/DP/回溯等），代码加少量注释说明思路更佳。

---

## 4. 验证流程（必须执行）

写完三个文件后运行：

```bash
node scripts/verify-parts.js <组名>
```

验证器会：
1. 检查结构完整性（desc、acm 规格/样例/模板、core 模板、ops 元数据）。
2. 用 **你的 python3 题解**跑 ACM 用例（真实 stdin/stdout 对比，含浮点容差）。
3. 用 **你的 cpp 题解**跑 ACM 用例（真实 g++ 编译运行）。
4. 用 **你的 python3/cpp 核心题解**跑 core 用例（驱动注入：构建链表/树/矩阵等并对比）。

**必须修到 ✅ 全部通过**。常见失败原因：ACM 解析与规格不一致、expected 手算错误（请改为运行题解得到）、链表/树记号写错、C++ 模板没加 `;` 结尾、题目答案顺序不唯一。

## 5. 质量要求

- 每题 **3~5 组 ACM 用例 + 3~5 组 core 用例**，覆盖边界。
- 样例（acm.examples）必须与 acm 测试用例的格式一致。
- `desc` 简洁准确；`input/output` 规格与题解解析完全一致。
- 模板是"解析骨架 + TODO"，题解是"完整实现"，两者分开。
- JSON 必须合法（不要注释、不要尾逗号），字符串内换行用 `\n`。
