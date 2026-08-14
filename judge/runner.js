'use strict';

/**
 * 进程执行器：负责编译/运行用户代码，带 CPU 时间、内存、输出体积限制。
 * 使用 `sh -c 'ulimit ...; exec "$@"'` 包装，对子进程施加 RLIMIT。
 */
const { spawn, execFile } = require('child_process');

const DEFAULT_TIMEOUT_MS = 4000;   // 运行墙钟超时（毫秒）
const COMPILE_TIMEOUT_MS = 30000;  // 编译墙钟超时（毫秒）
const DEFAULT_CPU_SEC = 5;         // 运行 CPU 时间上限（秒）
const COMPILE_CPU_SEC = 30;        // 编译 CPU 时间上限（秒）
const DEFAULT_MEM_KB = 524288;     // 地址空间上限（KB，即 512MB）
const MAX_OUTPUT = 64 * 1024;      // stdout/stderr 各自上限

function commandExists(command) {
  return new Promise((resolve) => {
    execFile('sh', ['-lc', `command -v ${command}`], (error, stdout) => {
      resolve(error ? null : stdout.trim());
    });
  });
}

/**
 * 运行命令。
 * @param {string} command 可执行文件
 * @param {string[]} args 参数
 * @param {{cwd?:string, input?:string, timeout?:number, cpuSeconds?:number, limits?:boolean, phase?:'compile'|'run'}} options
 * @returns {Promise<{code:number, stdout:string, stderr:string, timedOut:boolean, ms:number, killedByLimit?:string}>}
 */
function runProcess(command, args, options = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    const limit = options.limits !== false;
    const isCompile = options.phase === 'compile';
    const cpuSec = options.cpuSeconds || (isCompile ? COMPILE_CPU_SEC : DEFAULT_CPU_SEC);
    const timeout = options.timeout || (isCompile ? COMPILE_TIMEOUT_MS : DEFAULT_TIMEOUT_MS);
    const realArgs = limit
      ? ['-c', `ulimit -t ${cpuSec} 2>/dev/null; ulimit -v ${DEFAULT_MEM_KB} 2>/dev/null; exec "$@"`, 'runner', command, ...args]
      : args;
    const realCommand = limit ? 'sh' : command;

    const child = spawn(realCommand, realArgs, {
      cwd: options.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let killedByLimit = '';
    const timer = setTimeout(() => {
      timedOut = true;
      killedByLimit = 'time';
      try { child.kill('SIGKILL'); } catch (e) { /* noop */ }
    }, timeout);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      if (stdout.length > MAX_OUTPUT) {
        killedByLimit = killedByLimit || 'output';
        try { child.kill('SIGKILL'); } catch (e) { /* noop */ }
      }
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > MAX_OUTPUT) {
        killedByLimit = killedByLimit || 'output';
        try { child.kill('SIGKILL'); } catch (e) { /* noop */ }
      }
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: error.message, timedOut, killedByLimit, ms: Date.now() - started });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 137 && timedOut) killedByLimit = killedByLimit || 'time';
      if (code === 153 && !timedOut) killedByLimit = killedByLimit || 'cpu';
      resolve({ code, stdout, stderr, timedOut, killedByLimit, ms: Date.now() - started });
    });
    try {
      child.stdin.end(options.input || '');
    } catch (e) { /* noop */ }
  });
}

function compileArgsFor(language, source, output) {
  return language === 'c'
    ? [source, '-O2', '-std=c11', '-lm', '-o', output]
    : [source, '-O2', '-std=c++17', '-o', output];
}

/**
 * 语法检查：ACM 模式需要完整可链接程序；核心代码模式只需语法/类型检查（-fsyntax-only 或 py_compile）。
 */
async function checkCode({ language, code, mode }) {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hot100-acm-check-'));
  try {
    if (language === 'python3') {
      const python = await commandExists('python3');
      if (!python) return { ok: false, error: '未找到 python3' };
      const file = path.join(tmp, 'main.py');
      fs.writeFileSync(file, code, 'utf8');
      const result = await runProcess(python, ['-m', 'py_compile', file], { cwd: tmp, phase: 'compile' });
      return { ok: result.code === 0 && !result.timedOut, phase: 'syntax', ...result };
    }

    if (language === 'c' || language === 'cpp') {
      const compiler = await commandExists(language === 'c' ? 'gcc' : 'g++');
      if (!compiler) {
        return { ok: false, error: `当前系统未安装 ${language === 'c' ? 'gcc' : 'g++'}，无法检查 ${language.toUpperCase()} 语法。` };
      }
      const source = path.join(tmp, language === 'c' ? 'main.c' : 'main.cpp');
      const binary = path.join(tmp, 'main');
      fs.writeFileSync(source, code, 'utf8');
      const args = mode === 'core'
        ? (language === 'c' ? [source, '-fsyntax-only', '-std=c11'] : [source, '-fsyntax-only', '-std=c++17'])
        : compileArgsFor(language, source, binary);
      const result = await runProcess(compiler, args, { cwd: tmp, phase: 'compile' });
      return { ok: result.code === 0 && !result.timedOut, phase: 'compile', ...result };
    }

    return { ok: false, error: '不支持的语言' };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * ACM 模式单次运行：编译（如需）并执行，stdin 传入 input。
 */
async function runCode({ language, code, input }) {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hot100-acm-'));
  try {
    if (language === 'python3') {
      const python = await commandExists('python3');
      if (!python) return { ok: false, error: '未找到 python3' };
      const file = path.join(tmp, 'main.py');
      fs.writeFileSync(file, code, 'utf8');
      const checked = await runProcess(python, ['-m', 'py_compile', file], { cwd: tmp, phase: 'compile' });
      if (checked.code !== 0 || checked.timedOut) return { ok: false, phase: 'syntax', ...checked };
      const result = await runProcess(python, [file], { input, cwd: tmp });
      return { ok: result.code === 0 && !result.timedOut, phase: 'run', ...result };
    }

    if (language === 'c' || language === 'cpp') {
      const compiler = await commandExists(language === 'c' ? 'gcc' : 'g++');
      if (!compiler) {
        return { ok: false, error: `当前系统未安装 ${language === 'c' ? 'gcc' : 'g++'}，安装后即可运行 ${language.toUpperCase()} 代码。` };
      }
      const source = path.join(tmp, language === 'c' ? 'main.c' : 'main.cpp');
      const binary = path.join(tmp, 'main');
      fs.writeFileSync(source, code, 'utf8');
      const compiled = await runProcess(compiler, compileArgsFor(language, source, binary), { cwd: tmp, phase: 'compile' });
      if (compiled.code !== 0 || compiled.timedOut) return { ok: false, phase: 'compile', ...compiled };
      const result = await runProcess(binary, [], { input, cwd: tmp });
      return { ok: result.code === 0 && !result.timedOut, phase: 'run', ...result };
    }

    return { ok: false, error: '不支持的语言' };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

module.exports = { runProcess, commandExists, checkCode, runCode, DEFAULT_TIMEOUT_MS };
