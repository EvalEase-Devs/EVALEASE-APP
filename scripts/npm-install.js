import { execSync } from 'child_process';

try {
  console.log('Running npm install...');
  const output = execSync('npm install', {
    cwd: '/vercel/share/v0-project',
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 120000,
  });
  console.log(output);
  console.log('npm install completed successfully.');
} catch (error) {
  console.error('npm install failed:', error.stdout || error.message);
  process.exit(1);
}
