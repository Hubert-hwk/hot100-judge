'use strict';

/**
 * 核心代码模式（LeetCode 风格函数签名）的驱动生成器。
 *
 * 用户在编辑器里只写核心函数/类，评测时由服务端生成一个"驱动源文件"：
 *   数据序列化（链表/树/矩阵等） + 用户代码 + 测试用例执行器
 * 一次编译/运行跑完该题的全部测试用例，输出 JSON 结果。
 *
 * 测试用例的 args/expected 中的特殊字符串记号：
 *   "list:[1,2,3]"                     → 链表 ListNode
 *   "cycleList:[[3,2,0,-4],1]"         → 带环链表（第二个元素为环入口下标，-1 无环）
 *   "randomList:[[7,-1],[13,0],...]"   → 带 random 指针的链表 Node
 *   "intersectList:[[4,1,8,4,5],[5,0,1,8,4,5],2,3]" → 两条相交链表（listA, listB, skipA, skipB）
 *   "tree:[3,9,20,null,null,15,7]"     → 层序二叉树 TreeNode
 *   "grid:[\"11110\",\"11010\"]"        → char 二维矩阵（每行一个字符串）
 *   ops 型用例：{ ops:[...], args:[[...],...], expected:[...] }
 */

function pyLiteral(value) {
  if (value === null || value === undefined) return 'None';
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '0';
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(pyLiteral).join(', ')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    return `{${keys.map((k) => `${JSON.stringify(k)}: ${pyLiteral(value[k])}`).join(', ')}}`;
  }
  return 'None';
}

/* ------------------------------------------------------------------ */
/*  Python 驱动                                                        */
/* ------------------------------------------------------------------ */

const PY_PREAMBLE = `
import json, sys

_sharedB = None

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class Node:
    def __init__(self, val=0, next=None, random=None):
        self.val = val
        self.next = next
        self.random = random

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def _build(v):
    global _sharedB
    if isinstance(v, str):
        if v.startswith('list:'):
            arr = json.loads(v[5:])
            head = cur = ListNode()
            for x in arr:
                cur.next = ListNode(x)
                cur = cur.next
            return head.next
        if v.startswith('listArray:'):
            out = []
            for sub in json.loads(v[len('listArray:'):]):
                head = cur = ListNode()
                for x in sub:
                    cur.next = ListNode(x)
                    cur = cur.next
                out.append(head.next)
            return out
        if v.startswith('intersectB:'):
            return _sharedB
        if v.startswith('cycleList:'):
            arr, pos = json.loads(v[len('cycleList:'):])
            head = cur = ListNode()
            nodes = []
            for x in arr:
                cur.next = ListNode(x)
                cur = cur.next
                nodes.append(cur)
            if nodes and pos >= 0 and pos < len(nodes):
                cur.next = nodes[pos]
            return head.next
        if v.startswith('randomList:'):
            data = json.loads(v[len('randomList:'):])
            nodes = [Node(x[0]) for x in data]
            for i, x in enumerate(data):
                if i + 1 < len(nodes):
                    nodes[i].next = nodes[i + 1]
                idx = x[1]
                nodes[i].random = nodes[idx] if idx >= 0 and idx < len(nodes) else None
            return nodes[0] if nodes else None
        if v.startswith('intersectList:'):
            la, lb, sa, sb = json.loads(v[len('intersectList:'):])
            nodesA = [ListNode(x) for x in la]
            for i in range(len(nodesA) - 1):
                nodesA[i].next = nodesA[i + 1]
            if not nodesA:
                return None
            headB = cur = ListNode()
            prefix = [ListNode(x) for x in lb[:sb]]
            for x in prefix:
                cur.next = x
                cur = cur.next
            cur.next = nodesA[sa] if sa < len(nodesA) else None
            _sharedB = headB.next
            return nodesA[0] if nodesA else None
        if v.startswith('tree:'):
            arr = json.loads(v[5:])
            if not arr or arr[0] is None:
                return None
            root = TreeNode(arr[0])
            q = [root]
            i = 1
            while q and i < len(arr):
                cur = q.pop(0)
                if i < len(arr) and arr[i] is not None:
                    cur.left = TreeNode(arr[i])
                    q.append(cur.left)
                i += 1
                if i < len(arr) and arr[i] is not None:
                    cur.right = TreeNode(arr[i])
                    q.append(cur.right)
                i += 1
            return root
        if v.startswith('grid:'):
            return [list(row) for row in json.loads(v[5:])]
    if isinstance(v, list):
        return [_build(x) for x in v]
    return v

def _to_json(v):
    if v is None:
        return None
    if isinstance(v, ListNode):
        out = []
        seen = set()
        while v is not None and id(v) not in seen:
            seen.add(id(v))
            out.append(v.val)
            v = v.next
        return out
    if isinstance(v, Node):
        nodes = []
        idx = {}
        p = v
        while p is not None and id(p) not in idx:
            idx[id(p)] = len(nodes)
            nodes.append(p)
            p = p.next
        out = []
        for nd in nodes:
            out.append([nd.val, -1 if nd.random is None else idx.get(id(nd.random), -1)])
        return out
    if isinstance(v, TreeNode):
        out = []
        q = [v]
        while q:
            cur = q.pop(0)
            if cur is None:
                out.append(None)
            else:
                out.append(cur.val)
                q.append(cur.left)
                q.append(cur.right)
        while out and out[-1] is None:
            out.pop()
        return out
    if isinstance(v, list):
        return [_to_json(x) for x in v]
    return v
`;

/**
 * @param {object} spec { core, code, cases }
 */
function buildPythonDriver({ core, code, cases }) {
  const lines = [];
  lines.push(PY_PREAMBLE);
  lines.push('\n# ===== 用户代码 =====\n');
  lines.push(code);
  lines.push('\n# ===== 评测驱动 =====\n');

  if (core.kind === 'ops') {
    lines.push(`CASES = ${pyLiteral(cases)}\n`);
    lines.push(`
def _run_ops(c):
    obj = None
    out = []
    for op, a in zip(c['ops'], c['args']):
        if op == ${JSON.stringify(core.className)}:
            obj = ${core.className}(*a)
            out.append(None)
        else:
            r = getattr(obj, op)(*a)
            out.append(None if r is None else _to_json(r))
    return out

def main():
    result = []
    for c in CASES:
        entry = {'args': c.get('args', [])}
        try:
            got = _run_ops(c)
            entry['expected'] = c['expected']
            entry['got'] = got
            entry['ok'] = got == c['expected']
        except Exception as e:
            entry.update({'ok': False, 'error': '%s: %s' % (type(e).__name__, e)})
        result.append(entry)
    print(json.dumps(result, ensure_ascii=False))
main()
`);
    return lines.join('\n');
  }

  const mutates = Number(core.mutates ?? -1);
  lines.push(`CASES = ${pyLiteral(cases)}\n`);
  const call = mutates >= 0
    ? `${core.method}(*args)\n            got = args[${mutates}]`
    : `got = ${core.method}(*args)`;
  lines.push(`
def main():
    result = []
    for c in CASES:
        entry = {'args': c.get('args', [])}
        try:
            args = [_build(a) for a in c['args']]
            ${call}
            entry['expected'] = c['expected']
            entry['got'] = _to_json(got)
            entry['ok'] = entry['got'] == _to_json(_build(c['expected']))
        except Exception as e:
            entry.update({'ok': False, 'error': '%s: %s' % (type(e).__name__, e)})
        result.append(entry)
    print(json.dumps(result, ensure_ascii=False))
main()
`);
  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/*  C++ 驱动                                                           */
/* ------------------------------------------------------------------ */

const CPP_PREAMBLE = `
#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val;
    ListNode* next;
    ListNode(int x = 0) : val(x), next(nullptr) {}
};

struct Node {
    int val;
    Node* next;
    Node* random;
    Node(int x = 0) : val(x), next(nullptr), random(nullptr) {}
};

struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x = 0) : val(x), left(nullptr), right(nullptr) {}
};

namespace dshj {

struct JVal {
    enum T { NUL, BOOL, NUM, STR, ARR } t = NUL;
    bool b = false;
    double num = 0;
    string str;
    vector<JVal> arr;
};

string jtrim(const string& s) {
    size_t a = s.find_first_not_of(" \\t\\r\\n");
    size_t b = s.find_last_not_of(" \\t\\r\\n");
    return a == string::npos ? "" : s.substr(a, b - a + 1);
}

ListNode* g_sharedB = nullptr;

void jskip(const string& s, size_t& i) { while (i < s.size() && isspace((unsigned char)s[i])) i++; }

JVal parseJson(const string& s, size_t& i) {
    jskip(s, i);
    if (i >= s.size()) return JVal();
    char c = s[i];
    if (c == 'n') { if (s.compare(i, 4, "null") == 0) { i += 4; return JVal(); } throw runtime_error("json:null"); }
    if (c == 't') { if (s.compare(i, 4, "true") == 0) { i += 4; JVal v; v.t = JVal::BOOL; v.b = true; return v; } throw runtime_error("json:true"); }
    if (c == 'f') { if (s.compare(i, 5, "false") == 0) { i += 5; JVal v; v.t = JVal::BOOL; v.b = false; return v; } throw runtime_error("json:false"); }
    if (c == '"') {
        i++;
        string out;
        while (i < s.size() && s[i] != '"') {
            if (s[i] == '\\\\' && i + 1 < s.size()) {
                i++;
                char e = s[i];
                if (e == 'n') out += '\\n';
                else if (e == 't') out += '\\t';
                else if (e == 'r') out += '\\r';
                else if (e == 'u') { i += 4; }
                else out += e;
            } else {
                out += s[i];
            }
            i++;
        }
        i++;
        JVal v; v.t = JVal::STR; v.str = out;
        return v;
    }
    if (c == '{') {
        // 简化对象解析：按键序收集值（驱动只关心值的位置，不关心键名）
        i++;
        JVal v; v.t = JVal::ARR;
        while (true) {
            jskip(s, i);
            if (i < s.size() && s[i] == '}') { i++; break; }
            if (s[i] == '"') { parseJson(s, i); } // 跳过键名
            jskip(s, i);
            if (i < s.size() && s[i] == ':') i++;
            v.arr.push_back(parseJson(s, i));
            jskip(s, i);
            if (i < s.size() && s[i] == ',') { i++; continue; }
            if (i < s.size() && s[i] == '}') { i++; break; }
            throw runtime_error("json:obj");
        }
        return v;
    }
    if (c == '[') {
        i++;
        JVal v; v.t = JVal::ARR;
        while (true) {
            jskip(s, i);
            if (i < s.size() && s[i] == ']') { i++; break; }
            v.arr.push_back(parseJson(s, i));
            jskip(s, i);
            if (i < s.size() && s[i] == ',') { i++; continue; }
            if (i < s.size() && s[i] == ']') { i++; break; }
            throw runtime_error("json:arr");
        }
        return v;
    }
    size_t start = i;
    while (i < s.size() && (isdigit((unsigned char)s[i]) || s[i] == '-' || s[i] == '+' || s[i] == '.' || s[i] == 'e' || s[i] == 'E')) i++;
    JVal v; v.t = JVal::NUM; v.num = strtod(s.substr(start, i - start).c_str(), nullptr);
    return v;
}

JVal parseStr(const string& s) { size_t i = 0; return parseJson(s, i); }

struct Canon {
    enum T { NUL, BOOL, NUM, STR, ARR } t = NUL;
    bool b = false;
    double num = 0;
    string str;
    vector<Canon> arr;
    bool operator==(const Canon& o) const {
        if (t != o.t) return false;
        switch (t) {
            case NUL: return true;
            case BOOL: return b == o.b;
            case NUM: return num == o.num;
            case STR: return str == o.str;
            case ARR: return arr == o.arr;
        }
        return false;
    }
};

string toJson(const Canon& c) {
    switch (c.t) {
        case Canon::NUL: return "null";
        case Canon::BOOL: return c.b ? "true" : "false";
        case Canon::NUM: {
            ostringstream oss;
            oss << c.num;
            return oss.str();
        }
        case Canon::STR: {
            string out = "\\"";
            for (char ch : c.str) {
                if (ch == '"') out += "\\\\\\"";
                else if (ch == '\\\\') out += "\\\\\\\\";
                else if (ch == '\\n') out += "\\\\n";
                else if (ch == '\\t') out += "\\\\t";
                else if (ch == '\\r') out += "\\\\r";
                else out += ch;
            }
            out += "\\"";
            return out;
        }
        case Canon::ARR: {
            string out = "[";
            for (size_t i = 0; i < c.arr.size(); i++) {
                if (i) out += ",";
                out += toJson(c.arr[i]);
            }
            out += "]";
            return out;
        }
    }
    return "null";
}

Canon canonJ(const JVal& v) {
    Canon c;
    switch (v.t) {
        case JVal::NUL: c.t = Canon::NUL; break;
        case JVal::BOOL: c.t = Canon::BOOL; c.b = v.b; break;
        case JVal::NUM: c.t = Canon::NUM; c.num = v.num; break;
        case JVal::STR: c.t = Canon::STR; c.str = v.str; break;
        case JVal::ARR:
            c.t = Canon::ARR;
            for (const auto& e : v.arr) c.arr.push_back(canonJ(e));
            break;
    }
    return c;
}

ListNode* buildChain(const vector<JVal>& arr) {
    vector<ListNode*> nodes;
    for (const auto& e : arr) nodes.push_back(new ListNode((int)e.num));
    for (size_t i = 0; i + 1 < nodes.size(); i++) nodes[i]->next = nodes[i + 1];
    return nodes.empty() ? nullptr : nodes[0];
}

ListNode* buildCycle(const vector<JVal>& arr, int pos) {
    vector<ListNode*> nodes;
    for (const auto& e : arr) nodes.push_back(new ListNode((int)e.num));
    for (size_t i = 0; i + 1 < nodes.size(); i++) nodes[i]->next = nodes[i + 1];
    if (!nodes.empty() && pos >= 0 && pos < (int)nodes.size()) nodes.back()->next = nodes[pos];
    return nodes.empty() ? nullptr : nodes[0];
}

Node* buildRandom(const vector<JVal>& data) {
    vector<Node*> nodes;
    for (const auto& e : data) nodes.push_back(new Node((int)e.arr[0].num));
    for (size_t i = 0; i < nodes.size(); i++) {
        if (i + 1 < nodes.size()) nodes[i]->next = nodes[i + 1];
        int idx = (int)data[i].arr[1].num;
        nodes[i]->random = (idx >= 0 && idx < (int)nodes.size()) ? nodes[idx] : nullptr;
    }
    return nodes.empty() ? nullptr : nodes[0];
}

ListNode* buildIntersect(const vector<JVal>& la, const vector<JVal>& lb, int sa, int sb) {
    vector<ListNode*> nodesA;
    for (const auto& e : la) nodesA.push_back(new ListNode((int)e.num));
    for (size_t i = 0; i + 1 < nodesA.size(); i++) nodesA[i]->next = nodesA[i + 1];
    if (nodesA.empty()) return nullptr;
    vector<ListNode*> prefix;
    for (const auto& e : lb) prefix.push_back(new ListNode((int)e.num));
    for (size_t i = 0; i + 1 < prefix.size(); i++) prefix[i]->next = prefix[i + 1];
    ListNode* headB = prefix.empty() ? nullptr : prefix[0];
    if (!prefix.empty()) {
        prefix.back()->next = (sa >= 0 && sa < (int)nodesA.size()) ? nodesA[sa] : nullptr;
        g_sharedB = headB;
    } else {
        g_sharedB = nullptr;
    }
    return nodesA[0];
}

TreeNode* buildTree(const vector<JVal>& arr) {
    if (arr.empty() || arr[0].t == JVal::NUL) return nullptr;
    TreeNode* root = new TreeNode((int)arr[0].num);
    queue<TreeNode*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < arr.size()) {
        TreeNode* cur = q.front();
        q.pop();
        if (i < arr.size() && arr[i].t != JVal::NUL) { cur->left = new TreeNode((int)arr[i].num); q.push(cur->left); }
        i++;
        if (i < arr.size() && arr[i].t != JVal::NUL) { cur->right = new TreeNode((int)arr[i].num); q.push(cur->right); }
        i++;
    }
    return root;
}

struct Any {
    enum K { J, L, T, N } k = J;
    JVal j;
    ListNode* l = nullptr;
    TreeNode* t = nullptr;
    Node* n = nullptr;
    vector<ListNode*> la;
};

Any build(const JVal& v) {
    Any a;
    if (v.t == JVal::STR) {
        const string& s = v.str;
        if (s.rfind("list:", 0) == 0) { a.k = Any::L; a.l = buildChain(parseStr(s.substr(5)).arr); return a; }
        if (s.rfind("listArray:", 0) == 0) {
            JVal p = parseStr(s.substr(10));
            a.k = Any::J;
            for (const auto& sub : p.arr) a.la.push_back(buildChain(sub.arr));
            return a;
        }
        if (s.rfind("cycleList:", 0) == 0) { JVal p = parseStr(s.substr(10)); a.k = Any::L; a.l = buildCycle(p.arr[0].arr, (int)p.arr[1].num); return a; }
        if (s.rfind("randomList:", 0) == 0) { JVal p = parseStr(s.substr(11)); a.k = Any::N; a.n = buildRandom(p.arr); return a; }
        if (s.rfind("intersectList:", 0) == 0) { JVal p = parseStr(s.substr(14)); a.k = Any::L; a.l = buildIntersect(p.arr[0].arr, p.arr[1].arr, (int)p.arr[2].num, (int)p.arr[3].num); return a; }
        if (s.rfind("intersectB:", 0) == 0) { a.k = Any::L; a.l = g_sharedB; return a; }
        if (s.rfind("tree:", 0) == 0) { a.k = Any::T; a.t = buildTree(parseStr(s.substr(5)).arr); return a; }
        if (s.rfind("grid:", 0) == 0) { a.k = Any::J; a.j = parseStr(s.substr(5)); return a; }
    }
    a.k = Any::J;
    a.j = v;
    return a;
}

Canon canonList(ListNode* head) {
    Canon c; c.t = Canon::ARR;
    unordered_set<ListNode*> seen;
    while (head && !seen.count(head)) {
        seen.insert(head);
        Canon e; e.t = Canon::NUM; e.num = head->val;
        c.arr.push_back(e);
        head = head->next;
    }
    return c;
}

Canon canonRandomList(Node* head) {
    Canon c; c.t = Canon::ARR;
    vector<Node*> nodes;
    unordered_map<Node*, int> idx;
    for (Node* p = head; p && !idx.count(p); p = p->next) { idx[p] = (int)nodes.size(); nodes.push_back(p); }
    for (Node* p : nodes) {
        Canon pair; pair.t = Canon::ARR;
        Canon v; v.t = Canon::NUM; v.num = p->val;
        Canon r; r.t = Canon::NUM;
        r.num = (p->random && idx.count(p->random)) ? idx[p->random] : -1;
        pair.arr.push_back(v);
        pair.arr.push_back(r);
        c.arr.push_back(pair);
    }
    return c;
}

Canon canonTree(TreeNode* root) {
    Canon c; c.t = Canon::ARR;
    if (!root) return c;
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        TreeNode* cur = q.front();
        q.pop();
        if (!cur) { Canon n; n.t = Canon::NUL; c.arr.push_back(n); continue; }
        Canon e; e.t = Canon::NUM; e.num = cur->val;
        c.arr.push_back(e);
        q.push(cur->left);
        q.push(cur->right);
    }
    while (!c.arr.empty() && c.arr.back().t == Canon::NUL) c.arr.pop_back();
    return c;
}

Canon canonAny(const Any& a) {
    switch (a.k) {
        case Any::L: return canonList(a.l);
        case Any::T: return canonTree(a.t);
        case Any::N: return canonRandomList(a.n);
        default: return canonJ(a.j);
    }
}

} // namespace dshj
using namespace dshj;
`;

const CPP_TYPE_CONV = {
  int: (a) => `(int)${a}.j.num`,
  long: (a) => `(long long)${a}.j.num`,
  double: (a) => `${a}.j.num`,
  bool: (a) => `${a}.j.b`,
  string: (a) => `${a}.j.str`,
  char: (a) => `${a}.j.str.empty() ? '\\0' : ${a}.j.str[0]`,
  'int[]': (a) => `[&]{ vector<int> r; for (const auto& e : ${a}.j.arr) r.push_back((int)e.num); return r; }()`,
  'long[]': (a) => `[&]{ vector<long long> r; for (const auto& e : ${a}.j.arr) r.push_back((long long)e.num); return r; }()`,
  'int[][]': (a) => `[&]{ vector<vector<int>> r; for (const auto& row : ${a}.j.arr) { vector<int> t; for (const auto& e : row.arr) t.push_back((int)e.num); r.push_back(t); } return r; }()`,
  'string[]': (a) => `[&]{ vector<string> r; for (const auto& e : ${a}.j.arr) r.push_back(e.str); return r; }()`,
  'string[][]': (a) => `[&]{ vector<vector<string>> r; for (const auto& row : ${a}.j.arr) { vector<string> t; for (const auto& e : row.arr) t.push_back(e.str); r.push_back(t); } return r; }()`,
  grid: (a) => `[&]{ vector<vector<char>> r; for (const auto& row : ${a}.j.arr) { vector<char> t; for (char ch : row.str) t.push_back(ch); r.push_back(t); } return r; }()`,
  list: (a) => `${a}.l`,
  listArray: (a) => `${a}.la`,
  tree: (a) => `${a}.t`,
  randomList: (a) => `${a}.n`,
};

const JVAL_CONV = {
  int: (a) => `(int)${a}.num`,
  long: (a) => `(long long)${a}.num`,
  double: (a) => `${a}.num`,
  bool: (a) => `${a}.b`,
  string: (a) => `${a}.str`,
  char: (a) => `${a}.str.empty() ? '\\0' : ${a}.str[0]`,
};

function cppReturnCanon(returnsType, valueExpr) {
  switch (returnsType) {
    case 'int':
    case 'long':
    case 'double':
      return `[&]{ Canon c; c.t = Canon::NUM; c.num = ${valueExpr}; return c; }()`;
    case 'bool':
      return `[&]{ Canon c; c.t = Canon::BOOL; c.b = ${valueExpr}; return c; }()`;
    case 'char':
    case 'string':
      return `[&]{ Canon c; c.t = Canon::STR; c.str = ${valueExpr}; return c; }()`;
    case 'int[]':
    case 'long[]':
      return `[&]{ Canon c; c.t = Canon::ARR; for (auto x : ${valueExpr}) { Canon e; e.t = Canon::NUM; e.num = (double)x; c.arr.push_back(e); } return c; }()`;
    case 'string[]':
      return `[&]{ Canon c; c.t = Canon::ARR; for (const auto& x : ${valueExpr}) { Canon e; e.t = Canon::STR; e.str = x; c.arr.push_back(e); } return c; }()`;
    case 'int[][]':
      return `[&]{ Canon c; c.t = Canon::ARR; for (const auto& row : ${valueExpr}) { Canon r; r.t = Canon::ARR; for (auto x : row) { Canon e; e.t = Canon::NUM; e.num = (double)x; r.arr.push_back(e); } c.arr.push_back(r); } return c; }()`;
    case 'string[][]':
      return `[&]{ Canon c; c.t = Canon::ARR; for (const auto& row : ${valueExpr}) { Canon r; r.t = Canon::ARR; for (const auto& x : row) { Canon e; e.t = Canon::STR; e.str = x; r.arr.push_back(e); } c.arr.push_back(r); } return c; }()`;
    case 'grid':
    case 'char[][]':
      return `[&]{ Canon c; c.t = Canon::ARR; for (const auto& row : ${valueExpr}) { Canon r; r.t = Canon::STR; r.str.assign(row.begin(), row.end()); c.arr.push_back(r); } return c; }()`;
    case 'list':
      return `canonList(${valueExpr})`;
    case 'randomList':
      return `canonRandomList(${valueExpr})`;
    case 'tree':
      return `canonTree(${valueExpr})`;
    default:
      throw new Error(`不支持的返回值类型: ${returnsType}`);
  }
}

function buildCppDriver({ core, code, cases }) {
  const parts = [];
  parts.push(CPP_PREAMBLE);
  parts.push('\n// ===== 用户代码 =====\n');
  parts.push(code);
  parts.push('\n// ===== 评测驱动 =====\n');

  if (core.kind === 'ops') {
    const cls = core.className;
    const ctorConv = (core.ops.constructor || []).map((p, i) => JVAL_CONV[p.type](`a.arr[${i}]`)).join(', ');
    const dispatch = (core.ops.methods || []).map((m) => {
      const convs = m.args.map((t, i) => JVAL_CONV[t](`a.arr[${i}]`)).join(', ');
      if (m.ret === 'void') {
        return `        } else if (op == ${JSON.stringify(m.name)}) {\n            _obj->${m.name}(${convs});\n            _out.push_back(Canon());`;
      }
      const retCanon = cppReturnCanon(m.ret, `_obj->${m.name}(${convs})`);
      return `        } else if (op == ${JSON.stringify(m.name)}) {\n            _out.push_back(${retCanon});`;
    }).join('\n');
    parts.push(`
int main(int argc, char** argv) {
    if (argc < 2) { cerr << "missing cases file"; return 1; }
    ifstream in(argv[1]);
    string s((istreambuf_iterator<char>(in)), istreambuf_iterator<char>());
    size_t idx = 0;
    JVal root = parseJson(s, idx);
    vector<Canon> results;
    for (const auto& c : root.arr) {
        const auto& ops = c.arr[0].arr;
        const auto& argss = c.arr[1].arr;
        try {
            ${cls}* _obj = nullptr;
            vector<Canon> _out;
            for (size_t i = 0; i < ops.size(); i++) {
                const string& op = ops[i].str;
                const JVal& a = argss[i];
                if (op == ${JSON.stringify(cls)}) {
                    _obj = new ${cls}(${ctorConv});
                    _out.push_back(Canon());
${dispatch}
                } else {
                    throw runtime_error("unknown op: " + op);
                }
            }
            Canon exp = canonJ(c.arr[2]);
            Canon got; got.t = Canon::ARR; got.arr = _out;
            results.push_back(got == exp ? Canon() : [&]{ Canon e; e.t = Canon::NUM; e.num = 1; return e; }());
        } catch (const exception& ex) {
            Canon e; e.t = Canon::STR; e.str = string("ERR:") + ex.what();
            results.push_back(e);
        }
    }
    cout << "[";
    for (size_t i = 0; i < results.size(); i++) {
        if (i) cout << ",";
        if (results[i].t == Canon::STR) cout << "{\\"ok\\":false,\\"error\\":\\"" << results[i].str << "\\"}";
        else cout << "{\\"ok\\":true}";
    }
    cout << "]\\n";
    return 0;
}
`);
    return parts.join('\n');
  }

  // function kind
  const mutates = Number(core.mutates ?? -1);
  const paramLines = core.params.map((p, i) => `    Any _a${i} = build(args[${i}]);`).join('\n');
  const materializeLines = core.params.map((p, i) => `    auto _p${i} = ${CPP_TYPE_CONV[p.type](`_a${i}`)};`).join('\n');
  const callArgs = core.params.map((_, i) => `_p${i}`).join(', ');
  const callExpr = mutates >= 0
    ? `${core.className} _sol; _sol.${core.method}(${callArgs});`
    : `${core.className} _sol; auto _r = _sol.${core.method}(${callArgs});`;
  const gotExpr = mutates >= 0
    ? cppReturnCanon(core.params[mutates].type, `_p${mutates}`)
    : cppReturnCanon(core.returns, '_r');
  const expExpr = `canonAny(build(expVal))`;

  parts.push(`
int main(int argc, char** argv) {
    if (argc < 2) { cerr << "missing cases file"; return 1; }
    ifstream in(argv[1]);
    string s((istreambuf_iterator<char>(in)), istreambuf_iterator<char>());
    size_t idx = 0;
    JVal root = parseJson(s, idx);
    cout << "[";
    for (size_t ci = 0; ci < root.arr.size(); ci++) {
        const auto& c = root.arr[ci];
        const auto& args = c.arr[0].arr;
        const JVal& expVal = c.arr[1];
        if (ci) cout << ",";
        try {
${paramLines}
${materializeLines}
            ${callExpr}
            Canon _got = ${gotExpr};
            Canon _exp = ${expExpr};
            if (_got == _exp) {
                cout << "{\\"ok\\":true}";
            } else {
                cout << "{\\"ok\\":false,\\"expected\\":\\"" << toJson(_exp) << "\\",\\"got\\":\\"" << toJson(_got) << "\\"}";
            }
        } catch (const exception& ex) {
            cout << "{\\"ok\\":false,\\"error\\":\\"" << "ERR:" << ex.what() << "\\"}";
        } catch (...) {
            cout << "{\\"ok\\":false,\\"error\\":\\"ERR:unknown\\"}";
        }
    }
    cout << "]\\n";
    return 0;
}
`);
  return parts.join('\n');
}

module.exports = { buildPythonDriver, buildCppDriver, pyLiteral };
