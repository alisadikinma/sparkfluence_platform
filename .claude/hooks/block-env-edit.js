// PreToolUse hook: Block edits to .env and credential files
// Exit code 2 = block the tool operation
let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  try {
    const json = JSON.parse(data);
    const filePath = (json.tool_input && json.tool_input.file_path) || '';
    const basename = filePath.replace(/\\/g, '/').split('/').pop() || '';

    if (/^\.env($|\.)/.test(basename) || /credentials|secrets/i.test(basename)) {
      process.stderr.write('BLOCKED: ' + basename + ' is protected. Edit sensitive files manually.\n');
      process.exit(2);
    }
  } catch (e) {
    // JSON parse error — allow the operation
  }
});
