import { mkdir, writeFile } from 'node:fs/promises';

const INDUSTRIES = ['engineering', 'dev', 'data-science'];
const seen = new Map();

for (const industry of INDUSTRIES) {
  const url = `https://jobicy.com/api/v2/remote-jobs?count=200&industry=${industry}`;
  const response = await fetch(url);
  if (!response.ok) {
    console.warn(`Пропускаємо "${industry}": HTTP ${response.status}`);
    continue;
  }
  const payload = await response.json();
  for (const job of payload.jobs ?? []) seen.set(job.id, job);
  console.log(`${industry}: ${payload.jobs?.length ?? 0} вакансій`);
}

if (seen.size === 0) {
  console.error('Не вдалося отримати жодної вакансії — fixture не змінено.');
  process.exit(1);
}

await mkdir('public/fixtures', { recursive: true });
await writeFile(
  'public/fixtures/jobs.json',
  JSON.stringify({ jobCount: seen.size, jobs: [...seen.values()] }, null, 2),
);
console.log(`Збережено ${seen.size} вакансій у public/fixtures/jobs.json`);
