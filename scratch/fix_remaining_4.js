import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, '../schema/chaabee_sql.sql');
let sql = fs.readFileSync(schemaPath, 'utf8');

// Replace custom enum casts like ::credit_note_reason or ::anything_custom with ::text
sql = sql.replace(/::[a-zA-Z0-9_]+_reason\b/g, '::text');
sql = sql.replace(/::[a-zA-Z0-9_]+_type\b/g, '::text');
sql = sql.replace(/::[a-zA-Z0-9_]+_status\b/g, '::text');

// Clean any remaining DEFAULT expressions that contain calculations (operators +, *, -, /, or function calls like round, LEAST)
const lines = sql.split('\n');
const fixedLines = lines.map(line => {
  if (line.includes('DEFAULT') && (line.includes('+') || line.includes('*') || line.includes('/') || line.includes('round(') || line.includes('LEAST(') || line.includes('WHEN') || line.includes('('))) {
    // If it's not a simple function like gen_random_uuid(), now(), CURRENT_DATE, ARRAY[], or single quoted string
    if (!line.includes('gen_random_uuid()') && !line.includes('now()') && !line.includes('CURRENT_DATE') && !line.includes('ARRAY[') && !line.match(/DEFAULT\s+'[^']+'/i) && !line.match(/DEFAULT\s+\d+/i) && !line.match(/DEFAULT\s+(true|false)/i)) {
      return line.replace(/\s+DEFAULT\s+[^,]+/gi, '');
    }
  }
  return line;
});

fs.writeFileSync(schemaPath, fixedLines.join('\n'), 'utf8');
console.log('Finished cleaning remaining edge-case DEFAULT expressions and types.');
