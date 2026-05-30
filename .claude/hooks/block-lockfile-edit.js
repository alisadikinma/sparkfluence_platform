// PreToolUse hook: Block edits to lock files
// These should only change via npm/yarn/pnpm install, not direct edits
// Exit code 2 = block the tool operation
let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  try {
    const json = JSON.parse(data);
    const filePath = (json.tool_input && json.tool_input.file_path) || '';
    const basename = filePath.replace(/\\/g, '/').split('/').pop() || '';

    if (/^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/.test(basename)) {
      process.stderr.write('BLOCKED: ' + basename + ' — use npm install instead of direct edits.\n');
      process.exit(2);
    }
  } catch (e) {
    // JSON parse error — allow the operation
  }
});
