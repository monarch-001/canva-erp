import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, '../schema/chaabee_sql.sql');
let sql = fs.readFileSync(schemaPath, 'utf8');

// Regex to find table definitions
// CREATE TABLE public.name ( ... );
const tableRegex = /CREATE TABLE (public\.[a-zA-Z0-9_]+) \(([\s\S]*?)\);/g;

const alterStatements = [];

let cleanedSql = sql.replace(tableRegex, (match, tableName, tableBody) => {
  const lines = tableBody.split('\n');
  const keptLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if line is a FOREIGN KEY constraint
    const fkMatch = line.match(/^\s*CONSTRAINT\s+([a-zA-Z0-9_]+)\s+FOREIGN KEY\s*\(([^)]+)\)\s*REFERENCES\s+([^,\n]+)/i);
    if (fkMatch) {
      const constraintName = fkMatch[1];
      const fkCols = fkMatch[2];
      const refTarget = fkMatch[3];
      alterStatements.push(`ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} FOREIGN KEY (${fkCols}) REFERENCES ${refTarget};`);
    } else {
      keptLines.push(line);
    }
  }

  // Clean trailing commas in keptLines
  let bodyStr = keptLines.join('\n');
  // Remove trailing comma before closing parenthesis if any line ends with comma before end
  bodyStr = bodyStr.replace(/,\s*(\n\s*)$/, '$1');
  // Also clean up any double trailing commas
  bodyStr = bodyStr.replace(/,\s*,\s*/g, ',\n');
  
  return `CREATE TABLE ${tableName} (\n${bodyStr}\n);`;
});

// Append all ALTER TABLE statements at the bottom
cleanedSql += '\n\n-- Foreign Key Constraints --\n' + alterStatements.join('\n') + '\n';

fs.writeFileSync(schemaPath, cleanedSql, 'utf8');
console.log(`Extracted ${alterStatements.length} Foreign Key constraints and moved them to the end of the file.`);
