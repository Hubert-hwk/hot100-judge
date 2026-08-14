'use strict';
/**
 * 引导数据生成器：从旧版 app.js 元数据 + acmOverrides 生成最小可用数据文件，
 * 供前端/后端联调。完整数据由子代理分片生成后经 scripts/merge-parts.js 覆盖。
 */
const fs = require('fs');
const path = require('path');

const hot100 = [
  [1, '两数之和', '简单', '数组/哈希', 'https://leetcode.cn/problems/two-sum/'],
  [49, '字母异位词分组', '中等', '哈希/字符串', 'https://leetcode.cn/problems/group-anagrams/'],
  [128, '最长连续序列', '中等', '哈希/数组', 'https://leetcode.cn/problems/longest-consecutive-sequence/'],
  [283, '移动零', '简单', '数组/双指针', 'https://leetcode.cn/problems/move-zeroes/'],
  [11, '盛最多水的容器', '中等', '双指针', 'https://leetcode.cn/problems/container-with-most-water/'],
  [15, '三数之和', '中等', '双指针/排序', 'https://leetcode.cn/problems/3sum/'],
  [42, '接雨水', '困难', '双指针/栈', 'https://leetcode.cn/problems/trapping-rain-water/'],
  [3, '无重复字符的最长子串', '中等', '滑动窗口', 'https://leetcode.cn/problems/longest-substring-without-repeating-characters/'],
  [438, '找到字符串中所有字母异位词', '中等', '滑动窗口', 'https://leetcode.cn/problems/find-all-anagrams-in-a-string/'],
  [560, '和为 K 的子数组', '中等', '前缀和/哈希', 'https://leetcode.cn/problems/subarray-sum-equals-k/'],
  [239, '滑动窗口最大值', '困难', '单调队列', 'https://leetcode.cn/problems/sliding-window-maximum/'],
  [76, '最小覆盖子串', '困难', '滑动窗口', 'https://leetcode.cn/problems/minimum-window-substring/'],
  [53, '最大子数组和', '中等', '动态规划', 'https://leetcode.cn/problems/maximum-subarray/'],
  [56, '合并区间', '中等', '排序/区间', 'https://leetcode.cn/problems/merge-intervals/'],
  [189, '轮转数组', '中等', '数组', 'https://leetcode.cn/problems/rotate-array/'],
  [238, '除自身以外数组的乘积', '中等', '前缀积', 'https://leetcode.cn/problems/product-of-array-except-self/'],
  [41, '缺失的第一个正数', '困难', '数组/原地哈希', 'https://leetcode.cn/problems/first-missing-positive/'],
  [73, '矩阵置零', '中等', '矩阵', 'https://leetcode.cn/problems/set-matrix-zeroes/'],
  [54, '螺旋矩阵', '中等', '矩阵', 'https://leetcode.cn/problems/spiral-matrix/'],
  [48, '旋转图像', '中等', '矩阵', 'https://leetcode.cn/problems/rotate-image/'],
  [240, '搜索二维矩阵 II', '中等', '矩阵/二分', 'https://leetcode.cn/problems/search-a-2d-matrix-ii/'],
  [160, '相交链表', '简单', '链表', 'https://leetcode.cn/problems/intersection-of-two-linked-lists/'],
  [206, '反转链表', '简单', '链表', 'https://leetcode.cn/problems/reverse-linked-list/'],
  [234, '回文链表', '简单', '链表', 'https://leetcode.cn/problems/palindrome-linked-list/'],
  [141, '环形链表', '简单', '链表/快慢指针', 'https://leetcode.cn/problems/linked-list-cycle/'],
  [142, '环形链表 II', '中等', '链表/快慢指针', 'https://leetcode.cn/problems/linked-list-cycle-ii/'],
  [21, '合并两个有序链表', '简单', '链表', 'https://leetcode.cn/problems/merge-two-sorted-lists/'],
  [2, '两数相加', '中等', '链表', 'https://leetcode.cn/problems/add-two-numbers/'],
  [19, '删除链表的倒数第 N 个结点', '中等', '链表/双指针', 'https://leetcode.cn/problems/remove-nth-node-from-end-of-list/'],
  [24, '两两交换链表中的节点', '中等', '链表', 'https://leetcode.cn/problems/swap-nodes-in-pairs/'],
  [25, 'K 个一组翻转链表', '困难', '链表', 'https://leetcode.cn/problems/reverse-nodes-in-k-group/'],
  [138, '随机链表的复制', '中等', '链表/哈希', 'https://leetcode.cn/problems/copy-list-with-random-pointer/'],
  [148, '排序链表', '中等', '链表/归并', 'https://leetcode.cn/problems/sort-list/'],
  [23, '合并 K 个升序链表', '困难', '链表/堆', 'https://leetcode.cn/problems/merge-k-sorted-lists/'],
  [146, 'LRU 缓存', '中等', '设计/链表/哈希', 'https://leetcode.cn/problems/lru-cache/'],
  [94, '二叉树的中序遍历', '简单', '二叉树', 'https://leetcode.cn/problems/binary-tree-inorder-traversal/'],
  [104, '二叉树的最大深度', '简单', '二叉树/DFS', 'https://leetcode.cn/problems/maximum-depth-of-binary-tree/'],
  [226, '翻转二叉树', '简单', '二叉树', 'https://leetcode.cn/problems/invert-binary-tree/'],
  [101, '对称二叉树', '简单', '二叉树', 'https://leetcode.cn/problems/symmetric-tree/'],
  [543, '二叉树的直径', '简单', '二叉树/DFS', 'https://leetcode.cn/problems/diameter-of-binary-tree/'],
  [102, '二叉树的层序遍历', '中等', '二叉树/BFS', 'https://leetcode.cn/problems/binary-tree-level-order-traversal/'],
  [108, '将有序数组转换为二叉搜索树', '简单', '二叉搜索树', 'https://leetcode.cn/problems/convert-sorted-array-to-binary-search-tree/'],
  [98, '验证二叉搜索树', '中等', '二叉搜索树', 'https://leetcode.cn/problems/validate-binary-search-tree/'],
  [230, '二叉搜索树中第 K 小的元素', '中等', '二叉搜索树', 'https://leetcode.cn/problems/kth-smallest-element-in-a-bst/'],
  [199, '二叉树的右视图', '中等', '二叉树/BFS', 'https://leetcode.cn/problems/binary-tree-right-side-view/'],
  [114, '二叉树展开为链表', '中等', '二叉树/链表', 'https://leetcode.cn/problems/flatten-binary-tree-to-linked-list/'],
  [105, '从前序与中序遍历序列构造二叉树', '中等', '二叉树', 'https://leetcode.cn/problems/construct-binary-tree-from-preorder-and-inorder-traversal/'],
  [437, '路径总和 III', '中等', '二叉树/前缀和', 'https://leetcode.cn/problems/path-sum-iii/'],
  [236, '二叉树的最近公共祖先', '中等', '二叉树', 'https://leetcode.cn/problems/lowest-common-ancestor-of-a-binary-tree/'],
  [124, '二叉树中的最大路径和', '困难', '二叉树/DFS', 'https://leetcode.cn/problems/binary-tree-maximum-path-sum/'],
  [200, '岛屿数量', '中等', '图/DFS/BFS', 'https://leetcode.cn/problems/number-of-islands/'],
  [994, '腐烂的橘子', '中等', '图/BFS', 'https://leetcode.cn/problems/rotting-oranges/'],
  [207, '课程表', '中等', '图/拓扑排序', 'https://leetcode.cn/problems/course-schedule/'],
  [208, '实现 Trie', '中等', '字典树', 'https://leetcode.cn/problems/implement-trie-prefix-tree/'],
  [46, '全排列', '中等', '回溯', 'https://leetcode.cn/problems/permutations/'],
  [78, '子集', '中等', '回溯', 'https://leetcode.cn/problems/subsets/'],
  [17, '电话号码的字母组合', '中等', '回溯', 'https://leetcode.cn/problems/letter-combinations-of-a-phone-number/'],
  [39, '组合总和', '中等', '回溯', 'https://leetcode.cn/problems/combination-sum/'],
  [22, '括号生成', '中等', '回溯', 'https://leetcode.cn/problems/generate-parentheses/'],
  [79, '单词搜索', '中等', '回溯', 'https://leetcode.cn/problems/word-search/'],
  [131, '分割回文串', '中等', '回溯/动态规划', 'https://leetcode.cn/problems/palindrome-partitioning/'],
  [51, 'N 皇后', '困难', '回溯', 'https://leetcode.cn/problems/n-queens/'],
  [35, '搜索插入位置', '简单', '二分', 'https://leetcode.cn/problems/search-insert-position/'],
  [74, '搜索二维矩阵', '中等', '二分', 'https://leetcode.cn/problems/search-a-2d-matrix/'],
  [34, '在排序数组中查找元素的第一个和最后一个位置', '中等', '二分', 'https://leetcode.cn/problems/find-first-and-last-position-of-element-in-sorted-array/'],
  [33, '搜索旋转排序数组', '中等', '二分', 'https://leetcode.cn/problems/search-in-rotated-sorted-array/'],
  [153, '寻找旋转排序数组中的最小值', '中等', '二分', 'https://leetcode.cn/problems/find-minimum-in-rotated-sorted-array/'],
  [4, '寻找两个正序数组的中位数', '困难', '二分', 'https://leetcode.cn/problems/median-of-two-sorted-arrays/'],
  [20, '有效的括号', '简单', '栈', 'https://leetcode.cn/problems/valid-parentheses/'],
  [155, '最小栈', '中等', '栈/设计', 'https://leetcode.cn/problems/min-stack/'],
  [394, '字符串解码', '中等', '栈', 'https://leetcode.cn/problems/decode-string/'],
  [739, '每日温度', '中等', '单调栈', 'https://leetcode.cn/problems/daily-temperatures/'],
  [84, '柱状图中最大的矩形', '困难', '单调栈', 'https://leetcode.cn/problems/largest-rectangle-in-histogram/'],
  [215, '数组中的第 K 个最大元素', '中等', '堆/快选', 'https://leetcode.cn/problems/kth-largest-element-in-an-array/'],
  [347, '前 K 个高频元素', '中等', '堆/哈希', 'https://leetcode.cn/problems/top-k-frequent-elements/'],
  [295, '数据流的中位数', '困难', '堆/设计', 'https://leetcode.cn/problems/find-median-from-data-stream/'],
  [121, '买卖股票的最佳时机', '简单', '动态规划', 'https://leetcode.cn/problems/best-time-to-buy-and-sell-stock/'],
  [55, '跳跃游戏', '中等', '贪心', 'https://leetcode.cn/problems/jump-game/'],
  [45, '跳跃游戏 II', '中等', '贪心', 'https://leetcode.cn/problems/jump-game-ii/'],
  [763, '划分字母区间', '中等', '贪心', 'https://leetcode.cn/problems/partition-labels/'],
  [70, '爬楼梯', '简单', '动态规划', 'https://leetcode.cn/problems/climbing-stairs/'],
  [118, '杨辉三角', '简单', '动态规划', 'https://leetcode.cn/problems/pascals-triangle/'],
  [198, '打家劫舍', '中等', '动态规划', 'https://leetcode.cn/problems/house-robber/'],
  [279, '完全平方数', '中等', '动态规划', 'https://leetcode.cn/problems/perfect-squares/'],
  [322, '零钱兑换', '中等', '动态规划', 'https://leetcode.cn/problems/coin-change/'],
  [139, '单词拆分', '中等', '动态规划', 'https://leetcode.cn/problems/word-break/'],
  [300, '最长递增子序列', '中等', '动态规划/二分', 'https://leetcode.cn/problems/longest-increasing-subsequence/'],
  [152, '乘积最大子数组', '中等', '动态规划', 'https://leetcode.cn/problems/maximum-product-subarray/'],
  [416, '分割等和子集', '中等', '动态规划/背包', 'https://leetcode.cn/problems/partition-equal-subset-sum/'],
  [32, '最长有效括号', '困难', '动态规划/栈', 'https://leetcode.cn/problems/longest-valid-parentheses/'],
  [62, '不同路径', '中等', '动态规划', 'https://leetcode.cn/problems/unique-paths/'],
  [64, '最小路径和', '中等', '动态规划', 'https://leetcode.cn/problems/minimum-path-sum/'],
  [5, '最长回文子串', '中等', '动态规划/字符串', 'https://leetcode.cn/problems/longest-palindromic-substring/'],
  [1143, '最长公共子序列', '中等', '动态规划', 'https://leetcode.cn/problems/longest-common-subsequence/'],
  [72, '编辑距离', '中等', '动态规划', 'https://leetcode.cn/problems/edit-distance/'],
  [136, '只出现一次的数字', '简单', '位运算', 'https://leetcode.cn/problems/single-number/'],
  [169, '多数元素', '简单', '数组/投票', 'https://leetcode.cn/problems/majority-element/'],
  [75, '颜色分类', '中等', '双指针/排序', 'https://leetcode.cn/problems/sort-colors/'],
  [31, '下一个排列', '中等', '数组', 'https://leetcode.cn/problems/next-permutation/'],
  [287, '寻找重复数', '中等', '快慢指针/二分', 'https://leetcode.cn/problems/find-the-duplicate-number/']
];

const acmOverrides = {
  1: { input: '第一行整数 n。\n第二行 n 个整数 nums。\n第三行整数 target。', output: '输出两个下标，空格分隔。', examples: [{ input: '4\n2 7 11 15\n9\n', output: '0 1\n' }] },
  3: { input: '一行字符串 s。', output: '输出无重复字符的最长子串长度。', examples: [{ input: 'abcabcbb\n', output: '3\n' }, { input: 'bbbbb\n', output: '1\n' }] },
  20: { input: '一行只包含括号的字符串 s。', output: '合法输出 true，否则输出 false。', examples: [{ input: '()[]{}\n', output: 'true\n' }, { input: '(]\n', output: 'false\n' }] },
  53: { input: '第一行整数 n。\n第二行 n 个整数。', output: '输出最大子数组和。', examples: [{ input: '9\n-2 1 -3 4 -1 2 1 -5 4\n', output: '6\n' }] },
  70: { input: '一行整数 n。', output: '输出爬到第 n 阶的方法数。', examples: [{ input: '3\n', output: '3\n' }] },
  121: { input: '第一行整数 n。\n第二行 n 个整数 prices。', output: '输出最大利润。', examples: [{ input: '6\n7 1 5 3 6 4\n', output: '5\n' }] },
  206: { input: '第一行整数 n。\n第二行 n 个链表节点值。', output: '输出反转后的链表节点值，空格分隔。', examples: [{ input: '5\n1 2 3 4 5\n', output: '5 4 3 2 1\n' }] },
  200: { input: '第一行两个整数 m n。\n接下来 m 行，每行 n 个字符，0 表示水，1 表示陆地。', output: '输出岛屿数量。', examples: [{ input: '4 5\n11110\n11010\n11000\n00000\n', output: '1\n' }] },
  215: { input: '第一行整数 n。\n第二行 n 个整数。\n第三行整数 k。', output: '输出第 k 个最大元素。', examples: [{ input: '6\n3 2 1 5 6 4\n2\n', output: '5\n' }] },
  300: { input: '第一行整数 n。\n第二行 n 个整数。', output: '输出最长递增子序列长度。', examples: [{ input: '8\n10 9 2 5 3 7 101 18\n', output: '4\n' }] },
  322: { input: '第一行整数 n。\n第二行 n 个硬币面额。\n第三行整数 amount。', output: '输出最少硬币数；无法组成输出 -1。', examples: [{ input: '3\n1 2 5\n11\n', output: '3\n' }] },
  560: { input: '第一行整数 n。\n第二行 n 个整数。\n第三行整数 k。', output: '输出和为 k 的连续子数组个数。', examples: [{ input: '3\n1 1 1\n2\n', output: '2\n' }] }
};

const problems = hot100.map(([id, title, difficulty, topic, url]) => {
  const ov = acmOverrides[id];
  return {
    id,
    title,
    difficulty,
    topic,
    url,
    desc: '',
    acm: ov
      ? { input: ov.input, output: ov.output, examples: ov.examples }
      : { input: '', output: '', examples: [] },
    core: null,
  };
});

const tests = {};
for (const [id, ov] of Object.entries(acmOverrides)) {
  tests[id] = { acm: ov.examples.map((e) => ({ input: e.input, output: e.output })), core: [] };
}

fs.mkdirSync(path.join(__dirname, '..', 'public', 'data'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'public', 'data', 'problems.json'), JSON.stringify(problems, null, 1), 'utf8');
fs.writeFileSync(path.join(__dirname, '..', 'public', 'data', 'tests.json'), JSON.stringify(tests, null, 1), 'utf8');
fs.writeFileSync(path.join(__dirname, '..', 'public', 'data', 'solutions.json'), JSON.stringify({}, null, 1), 'utf8');
console.log('bootstrap data written:', problems.length, 'problems');
