import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, '../schema/chaabee_sql.sql');
let sql = fs.readFileSync(schemaPath, 'utf8');

const lines = sql.split('\n');
const fixedLines = lines.map(line => {
  // If line defines a column with DEFAULT containing round, operator *, +, /, or column reference
  if (line.includes('DEFAULT') && (line.includes('round(') || line.includes('LEAST(') || line.includes('WHEN'))) {
    // Remove DEFAULT ... up to comma or end of line
    return line.replace(/\s+DEFAULT\s+[^,]+/gi, '');
  }
  return line;
});

fs.writeFileSync(schemaPath, fixedLines.join('\n'), 'utf8');
console.log('Successfully cleaned default expressions referencing other columns!');
