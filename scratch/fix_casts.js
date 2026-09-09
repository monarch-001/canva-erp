import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, '../schema/chaabee_sql.sql');
let content = fs.readFileSync(schemaPath, 'utf8');

const customTypes = [
  'project_status',
  'document_discipline',
  'document_status',
  'document_kind',
  'document_review_status',
  'boq_status',
  'project_boq_activity_status',
  'bom_status',
  'po_status',
  'po_category',
  'grn_status',
  'invoice_status',
  'match_status',
  'payment_mode',
  'payment_status',
  'expense_doc_type',
  'expense_status',
  'master_activity_status',
  'ai_match_status'
];

customTypes.forEach(type => {
  const regex = new RegExp(`::${type}\\b`, 'g');
  content = content.replace(regex, '::text');
});

fs.writeFileSync(schemaPath, content, 'utf8');
console.log('Successfully replaced custom enum casts with ::text in the schema.');
