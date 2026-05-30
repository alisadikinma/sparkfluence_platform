// PostToolUse hook: Run TypeScript type-check after .ts/.tsx file edits
let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  try {
    const json = JSON.parse(data);
    const filePath = (json.tool_input && json.tool_input.file_path) || '';

    // Only type-check TypeScript files (skip .d.ts declaration files)
    if (/\.tsx?$/.test(filePath) && !/\.d\.ts$/.test(filePath)) {
      const { execSync } = require('child_process');
      try {
        execSync('npx tsc --noEmit', { encoding: 'utf8', timeout: 30000 });
        console.log('TypeScript: No errors');
      } catch (e) {
        // Show first 15 lines of errors so Claude can fix them
        const output = (e.stdout || '').split('\n').slice(0, 15).join('\n');
        console.log(output || 'Type check failed');
      }
    }
  } catch (e) {
    // JSON parse error — skip
  }
});
