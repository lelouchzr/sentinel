import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Load only this checkout's ignored configuration. Print names/status, never secret values.
for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) process.loadEnvFile(file);
}
const strict = process.argv.includes('--strict');
const groups = [
  {
    label: 'Supabase',
    names: [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'SUPABASE_SECRET_KEY',
    ],
  },
  { label: 'Meta', names: ['META_API_KEY'] },
  { label: 'Azure (lecture audio)', names: ['AZURE_SPEECH_KEY', 'AZURE_SPEECH_REGION'] },
  { label: 'Maintenance privée', names: ['MAINTENANCE_SECRET'] },
];
let missing = false;
for (const group of groups) {
  const absent = group.names.filter((name) => !process.env[name]?.trim());
  console.log(
    `${group.label}: ${absent.length ? `à configurer (${absent.join(', ')})` : 'variables présentes'}`,
  );
  missing ||= absent.length > 0;
}
const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000';
let invalid = false;
try {
  const url = new URL(origin);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    !['http:', 'https:'].includes(url.protocol)
  )
    throw new Error();
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    throw new Error();
  console.log('Origine de l’application : format valide');
} catch {
  invalid = true;
  console.log(
    'NEXT_PUBLIC_APP_URL: origine HTTP locale ou HTTPS attendue, sans chemin ni paramètres',
  );
}
if (process.env.MAINTENANCE_SECRET && process.env.MAINTENANCE_SECRET.length < 32) {
  invalid = true;
  console.log('MAINTENANCE_SECRET: au moins 32 caractères sont requis');
}
if (!['true', 'false', undefined].includes(process.env.AI_ENABLED)) {
  invalid = true;
  console.log('AI_ENABLED: valeur true ou false attendue');
}
console.log(
  `Appels payants: ${process.env.AI_ENABLED === 'true' ? 'activés dans la configuration' : 'désactivés'}`,
);
const migrations = readdirSync(resolve('supabase/migrations'))
  .filter((name) => name.endsWith('.sql'))
  .sort();
console.log(`Migrations à appliquer et à vérifier dans l’ordre: ${migrations.join(', ')}`);
console.log(
  'Vérification locale seulement : aucun service contacté, aucune clé validée à distance, aucun crédit utilisé.',
);
process.exitCode = invalid || (strict && missing) ? 1 : 0;
