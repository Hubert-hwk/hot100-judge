'use strict';
/** 快速自测：核心代码驱动（Python/C++ × function/ops × 链表/树/矩阵） */
const { judgeCore } = require('../judge/judge');

function show(label, outcome) {
  console.log(`\n===== ${label} =====`);
  if (outcome.error) {
    console.log('ERROR:', outcome.error);
    if (outcome.compileError) console.log(outcome.compileError.slice(0, 1500));
    return false;
  }
  let ok = true;
  for (const r of outcome.results || []) {
    if (!r.ok) {
      ok = false;
      console.log('FAIL:', JSON.stringify(r));
    }
  }
  console.log(ok ? 'ALL PASS' : 'SOME FAIL');
  return ok;
}

async function main() {
  let all = true;

  // 1. 两数之和（int[] -> int[]）
  const twoSumCore = {
    kind: 'function', className: 'Solution', method: 'twoSum',
    params: [{ name: 'nums', type: 'int[]' }, { name: 'target', type: 'int' }],
    returns: 'int[]', mutates: -1,
  };
  const twoSumTests = [
    { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
    { args: [[3, 2, 4], 6], expected: [1, 2] },
    { args: [[3, 3], 6], expected: [0, 1] },
  ];
  all &= show('twoSum python', await judgeCore({
    language: 'python3', core: twoSumCore, tests: twoSumTests,
    code: 'def twoSum(nums, target):\n    d = {}\n    for i, v in enumerate(nums):\n        if target - v in d:\n            return [d[target - v], i]\n        d[v] = i\n    return []\n',
  }));
  all &= show('twoSum cpp', await judgeCore({
    language: 'cpp', core: twoSumCore, tests: twoSumTests,
    code: 'class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int, int> m;\n        for (int i = 0; i < (int)nums.size(); i++) {\n            if (m.count(target - nums[i])) return {m[target - nums[i]], i};\n            m[nums[i]] = i;\n        }\n        return {};\n    }\n};\n',
  }));

  // 2. 反转链表（list -> list）
  const revCore = {
    kind: 'function', className: 'Solution', method: 'reverseList',
    params: [{ name: 'head', type: 'list' }], returns: 'list', mutates: -1,
  };
  const revTests = [
    { args: ['list:[1,2,3,4,5]'], expected: 'list:[5,4,3,2,1]' },
    { args: ['list:[1,2]'], expected: 'list:[2,1]' },
    { args: ['list:[]'], expected: 'list:[]' },
  ];
  all &= show('reverseList python', await judgeCore({
    language: 'python3', core: revCore, tests: revTests,
    code: 'def reverseList(head):\n    prev = None\n    cur = head\n    while cur:\n        nxt = cur.next\n        cur.next = prev\n        prev = cur\n        cur = nxt\n    return prev\n',
  }));
  all &= show('reverseList cpp', await judgeCore({
    language: 'cpp', core: revCore, tests: revTests,
    code: 'class Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        ListNode* prev = nullptr;\n        while (head) { ListNode* nxt = head->next; head->next = prev; prev = head; head = nxt; }\n        return prev;\n    }\n};\n',
  }));

  // 3. 二叉树中序遍历（tree -> int[]）
  const inordCore = {
    kind: 'function', className: 'Solution', method: 'inorderTraversal',
    params: [{ name: 'root', type: 'tree' }], returns: 'int[]', mutates: -1,
  };
  const inordTests = [
    { args: ['tree:[1,null,2,3]'], expected: [1, 3, 2] },
    { args: ['tree:[]'], expected: [] },
    { args: ['tree:[1,2,3,4,5]'], expected: [4, 2, 5, 1, 3] },
  ];
  all &= show('inorder python', await judgeCore({
    language: 'python3', core: inordCore, tests: inordTests,
    code: 'def inorderTraversal(root):\n    out = []\n    def dfs(node):\n        if not node: return\n        dfs(node.left)\n        out.append(node.val)\n        dfs(node.right)\n    dfs(root)\n    return out\n',
  }));
  all &= show('inorder cpp', await judgeCore({
    language: 'cpp', core: inordCore, tests: inordTests,
    code: 'class Solution {\npublic:\n    vector<int> inorderTraversal(TreeNode* root) {\n        vector<int> out;\n        function<void(TreeNode*)> dfs = [&](TreeNode* n) {\n            if (!n) return;\n            dfs(n->left); out.push_back(n->val); dfs(n->right);\n        };\n        dfs(root);\n        return out;\n    }\n};\n',
  }));

  // 4. LRU（ops）
  const lruCore = {
    kind: 'ops', className: 'LRUCache',
    ops: {
      constructor: [{ name: 'capacity', type: 'int' }],
      methods: [
        { name: 'put', args: ['int', 'int'], ret: 'void' },
        { name: 'get', args: ['int'], ret: 'int' },
      ],
    },
  };
  const lruTests = [
    { ops: ['LRUCache', 'put', 'put', 'get', 'put', 'get', 'put', 'get', 'get', 'get'], args: [[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]], expected: [null, null, null, 1, null, -1, null, -1, 3, 4] },
  ];
  all &= show('lru python', await judgeCore({
    language: 'python3', core: lruCore, tests: lruTests,
    code: 'class LRUCache:\n    def __init__(self, capacity: int):\n        self.cap = capacity\n        self.d = {}\n    def get(self, key: int) -> int:\n        if key not in self.d: return -1\n        v = self.d.pop(key); self.d[key] = v\n        return v\n    def put(self, key: int, value: int) -> None:\n        if key in self.d: self.d.pop(key)\n        self.d[key] = value\n        if len(self.d) > self.cap: self.d.pop(next(iter(self.d)))\n',
  }));
  all &= show('lru cpp', await judgeCore({
    language: 'cpp', core: lruCore, tests: lruTests,
    code: 'class LRUCache {\npublic:\n    list<pair<int,int>> q;\n    unordered_map<int, list<pair<int,int>>::iterator> m;\n    int cap;\n    LRUCache(int capacity) { cap = capacity; }\n    int get(int key) {\n        if (!m.count(key)) return -1;\n        auto it = m[key]; int v = it->second;\n        q.erase(it); q.push_front({key, v}); m[key] = q.begin();\n        return v;\n    }\n    void put(int key, int value) {\n        if (m.count(key)) q.erase(m[key]);\n        q.push_front({key, value}); m[key] = q.begin();\n        if ((int)q.size() > cap) { m.erase(q.back().first); q.pop_back(); }\n    }\n};\n',
  }));

  // 5. 旋转图像（void 原地修改 int[][]）
  const rotCore = {
    kind: 'function', className: 'Solution', method: 'rotate',
    params: [{ name: 'matrix', type: 'int[][]' }], returns: 'void', mutates: 0,
  };
  const rotTests = [
    { args: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], expected: [[7, 4, 1], [8, 5, 2], [9, 6, 3]] },
    { args: [[[1]]], expected: [[1]] },
  ];
  all &= show('rotate python', await judgeCore({
    language: 'python3', core: rotCore, tests: rotTests,
    code: 'def rotate(matrix):\n    n = len(matrix)\n    for i in range(n):\n        for j in range(i + 1, n):\n            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]\n    for row in matrix:\n        row.reverse()\n',
  }));
  all &= show('rotate cpp', await judgeCore({
    language: 'cpp', core: rotCore, tests: rotTests,
    code: 'class Solution {\npublic:\n    void rotate(vector<vector<int>>& matrix) {\n        int n = matrix.size();\n        for (int i = 0; i < n; i++) for (int j = i + 1; j < n; j++) swap(matrix[i][j], matrix[j][i]);\n        for (auto& row : matrix) reverse(row.begin(), row.end());\n    }\n};\n',
  }));

  // 6. 岛屿数量（grid -> int）
  const islandCore = {
    kind: 'function', className: 'Solution', method: 'numIslands',
    params: [{ name: 'grid', type: 'grid' }], returns: 'int', mutates: -1,
  };
  const islandTests = [
    { args: ['grid:["11110","11010","11000","00000"]'], expected: 1 },
    { args: ['grid:["11000","11000","00100","00011"]'], expected: 3 },
  ];
  all &= show('numIslands python', await judgeCore({
    language: 'python3', core: islandCore, tests: islandTests,
    code: 'def numIslands(grid):\n    m, n = len(grid), len(grid[0])\n    def dfs(i, j):\n        if i < 0 or j < 0 or i >= m or j >= n or grid[i][j] == "0": return\n        grid[i][j] = "0"\n        for di, dj in ((1,0),(-1,0),(0,1),(0,-1)): dfs(i+di, j+dj)\n    cnt = 0\n    for i in range(m):\n        for j in range(n):\n            if grid[i][j] == "1":\n                cnt += 1; dfs(i, j)\n    return cnt\n',
  }));
  all &= show('numIslands cpp', await judgeCore({
    language: 'cpp', core: islandCore, tests: islandTests,
    code: 'class Solution {\npublic:\n    int numIslands(vector<vector<char>>& grid) {\n        int m = grid.size(); if (!m) return 0;\n        int n = grid[0].size(), cnt = 0;\n        function<void(int,int)> dfs = [&](int i, int j) {\n            if (i < 0 || j < 0 || i >= m || j >= n || grid[i][j] == \'0\') return;\n            grid[i][j] = \'0\';\n            dfs(i+1,j); dfs(i-1,j); dfs(i,j+1); dfs(i,j-1);\n        };\n        for (int i = 0; i < m; i++) for (int j = 0; j < n; j++) if (grid[i][j] == \'1\') { cnt++; dfs(i, j); }\n        return cnt;\n    }\n};\n',
  }));

  // 7. 环形链表 II（cycleList -> int）
  const cycleCore = {
    kind: 'function', className: 'Solution', method: 'detectCycle',
    params: [{ name: 'head', type: 'list' }], returns: 'int', mutates: -1,
  };
  const cycleTests = [
    { args: ['cycleList:[[3,2,0,-4],1]'], expected: 2 },
    { args: ['cycleList:[[1,2],0]'], expected: 1 },
    { args: ['cycleList:[[1],-1]'], expected: -1 },
  ];
  all &= show('detectCycle python', await judgeCore({
    language: 'python3', core: cycleCore, tests: cycleTests,
    code: 'def detectCycle(head):\n    if not head: return -1\n    slow = fast = head\n    while fast and fast.next:\n        slow = slow.next; fast = fast.next.next\n        if slow is fast:\n            p = head\n            while p is not slow:\n                p = p.next; slow = slow.next\n            return p.val\n    return -1\n',
  }));
  all &= show('detectCycle cpp', await judgeCore({
    language: 'cpp', core: cycleCore, tests: cycleTests,
    code: 'class Solution {\npublic:\n    int detectCycle(ListNode* head) {\n        ListNode *s = head, *f = head;\n        while (f && f->next) {\n            s = s->next; f = f->next->next;\n            if (s == f) {\n                ListNode* p = head;\n                while (p != s) { p = p->next; s = s->next; }\n                return p->val;\n            }\n        }\n        return -1;\n    }\n};\n',
  }));

  // 8. 随机链表复制（randomList -> randomList）
  const randCore = {
    kind: 'function', className: 'Solution', method: 'copyRandomList',
    params: [{ name: 'head', type: 'randomList' }], returns: 'randomList', mutates: -1,
  };
  const randTests = [
    { args: ['randomList:[[7,-1],[13,0],[11,4],[10,2],[1,0]]'], expected: 'randomList:[[7,-1],[13,0],[11,4],[10,2],[1,0]]' },
    { args: ['randomList:[[1,1],[2,1]]'], expected: 'randomList:[[1,1],[2,1]]' },
    { args: ['randomList:[]'], expected: 'randomList:[]' },
  ];
  all &= show('copyRandomList python', await judgeCore({
    language: 'python3', core: randCore, tests: randTests,
    code: 'def copyRandomList(head):\n    if not head: return None\n    m = {}\n    p = head\n    while p:\n        m[p] = Node(p.val)\n        p = p.next\n    p = head\n    while p:\n        m[p].next = m.get(p.next)\n        m[p].random = m.get(p.random)\n        p = p.next\n    return m[head]\n',
  }));
  all &= show('copyRandomList cpp', await judgeCore({
    language: 'cpp', core: randCore, tests: randTests,
    code: 'class Solution {\npublic:\n    Node* copyRandomList(Node* head) {\n        if (!head) return nullptr;\n        unordered_map<Node*, Node*> m;\n        for (Node* p = head; p; p = p->next) m[p] = new Node(p->val);\n        for (Node* p = head; p; p = p->next) {\n            m[p]->next = m[p->next];\n            m[p]->random = m[p->random];\n        }\n        return m[head];\n    }\n};\n',
  }));

  // 9. 相交链表（intersectList -> list）
  const interCore = {
    kind: 'function', className: 'Solution', method: 'getIntersectionNode',
    params: [{ name: 'headA', type: 'list' }, { name: 'headB', type: 'list' }], returns: 'list', mutates: -1,
  };
  const interTests = [
    { args: ['intersectList:[[4,1,8,4,5],[5,0,1,8,4,5],2,3]', 'intersectB:'], expected: 'list:[8,4,5]' },
  ];
  all &= show('getIntersectionNode python', await judgeCore({
    language: 'python3', core: interCore, tests: interTests,
    code: 'def getIntersectionNode(headA, headB):\n    if not headA or not headB: return None\n    a, b = headA, headB\n    while a is not b:\n        a = a.next if a else headB\n        b = b.next if b else headA\n    return a\n',
  }));
  all &= show('getIntersectionNode cpp', await judgeCore({
    language: 'cpp', core: interCore, tests: interTests,
    code: 'class Solution {\npublic:\n    ListNode* getIntersectionNode(ListNode* headA, ListNode* headB) {\n        ListNode *a = headA, *b = headB;\n        while (a != b) {\n            a = a ? a->next : headB;\n            b = b ? b->next : headA;\n        }\n        return a;\n    }\n};\n',
  }));

  process.exit(all ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
