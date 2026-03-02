import { execSync } from 'child_process';

console.log('Running npm install...');
try {
  const output = execSync('npm install', {
    cwd: '/vercel/share/v0-project',
    stdio: 'pipe',
    encoding: 'utf-8',
  });
  console.log(output);
  console.log('npm install completed successfully.');
} catch (error) {
  console.error('npm install failed:', error.stdout || error.message);
  process.exit(1);
}
