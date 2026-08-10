import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGS_DIR = path.join(__dirname, '..', 'chat_logs');
const DAILY_LOG_REGEX = /^(\d{4}-\d{2}-\d{2})\.md$/;

// Helper to get ISO week number and year
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

function runMaintenance() {
  if (!fs.existsSync(LOGS_DIR)) {
    console.log('Logs directory does not exist.');
    return;
  }

  const files = fs.readdirSync(LOGS_DIR);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

  const dailyLogsByWeek = {};

  files.forEach(file => {
    const match = file.match(DAILY_LOG_REGEX);
    if (!match) return;

    const dateStr = match[1];
    const logDate = new Date(dateStr);
    const filePath = path.join(LOGS_DIR, file);

    // Group logs by ISO week for summary generation
    const { year, week } = getWeekNumber(logDate);
    const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;

    if (!dailyLogsByWeek[weekKey]) {
      dailyLogsByWeek[weekKey] = [];
    }
    dailyLogsByWeek[weekKey].push({
      dateStr,
      filePath,
      logDate
    });
  });

  // 1. Generate Weekly Summaries
  for (const [weekKey, logs] of Object.entries(dailyLogsByWeek)) {
    const summaryFileName = `weekly_summary_${weekKey}.md`;
    const summaryPath = path.join(LOGS_DIR, summaryFileName);

    // If weekly summary doesn't exist, create it by aggregating daily logs of that week
    if (fs.existsSync(summaryPath)) {
      // Overwrite to include updates
      fs.unlinkSync(summaryPath);
    }
    
    console.log(`Generating weekly summary: ${summaryFileName}`);
    let summaryContent = `# Weekly Development Summary: ${weekKey}\n\n`;
    
    // Sort logs chronologically
    logs.sort((a, b) => a.logDate - b.logDate);

    logs.forEach(log => {
      const content = fs.readFileSync(log.filePath, 'utf8');
      // Extract content after the main title
      const cleanedContent = content.replace(/^#\s+Development\s+&\s+Chat\s+Log:.*?\n/i, '');
      summaryContent += `## Date: ${log.dateStr}\n${cleanedContent}\n---\n\n`;
    });

    fs.writeFileSync(summaryPath, summaryContent, 'utf8');
  }

  // 2. Cleanup Daily Logs older than 30 days
  files.forEach(file => {
    const match = file.match(DAILY_LOG_REGEX);
    if (!match) return;

    const dateStr = match[1];
    const logDate = new Date(dateStr);
    const filePath = path.join(LOGS_DIR, file);

    if (logDate < thirtyDaysAgo) {
      console.log(`Deleting log older than 30 days: ${file}`);
      fs.unlinkSync(filePath);
    }
  });

  console.log('Log maintenance completed.');
}

runMaintenance();
