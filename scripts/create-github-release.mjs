import { execSync } from 'node:child_process';
import fs from 'node:fs';

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    const out = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const match = out.split('\n').find((l) => l.startsWith('password='));
    if (match) return match.split('=')[1].trim();
  } catch {}
  return null;
}

function extractChangelogForVersion(version) {
  try {
    const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
    const header = `## [v${version}]`;
    const startIdx = changelog.indexOf(header);
    if (startIdx === -1) return '';
    const afterHeader = changelog.slice(startIdx);
    const endIdx = afterHeader.indexOf('\n## [v', header.length);
    const content = endIdx === -1 ? afterHeader : afterHeader.slice(0, endIdx);
    return content.replace(/^##\s+\[v[^\]]+\][^\n]*\n+/i, '').trim();
  } catch {
    return '';
  }
}

async function createRelease() {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const version = pkg.version;
  const tag = `v${version}`;
  const token = getGitHubToken();

  if (!token) {
    console.error('❌ 未找到有效的 GitHub Token，无法自动创建 Release');
    process.exit(1);
  }

  const notes = extractChangelogForVersion(version) || pkg.releaseNotes || `Release ${tag}`;
  console.log(`🚀 准备为 ${tag} 创建 GitHub Release...`);

  const payload = {
    tag_name: tag,
    name: tag,
    body: notes,
    draft: false,
    prerelease: false,
  };

  const res = await fetch('https://api.github.com/repos/wenbin-wb/dsh-bridge/releases', {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'dsh-bridge-release-bot',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 201) {
    const data = await res.json();
    console.log(`✅ GitHub Release 创建成功: ${data.html_url}`);
  } else if (res.status === 422) {
    console.log(`ℹ️ GitHub Release ${tag} 已存在或标签未变动`);
  } else {
    console.error(`❌ GitHub Release 创建失败 HTTP ${res.status}:`, await res.text());
  }
}

createRelease().catch(console.error);
