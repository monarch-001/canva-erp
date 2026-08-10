# Chat and Development Logging Rules

Any agent working on this codebase MUST follow these logging rules:

1. **Daily Log Files**:
   - Every day, check if a log file exists in [chat_logs/](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/chat_logs/) named `YYYY-MM-DD.md` (e.g., `2026-08-09.md`). If not, create it.
   - Append details of the current session to this daily log, including:
     - **Chats/Updates**: Summaries of discussions, requirements clarified.
     - **Changes/Features**: Files modified, functions added, schemas updated.
     - **Git Actions**: Git pushes, pulls, merges.
     - **Deployments**: Deployment triggers, status, and environment.

2. **Log Structure**:
   - Use clean, standard markdown headings for easy reading.
   - Format:
     ```markdown
     # Development & Chat Log: YYYY-MM-DD
     
     ## Session at HH:MM (Local Time)
     - **Goal**: [Brief goal]
     - **Changes**: [List of modifications]
     - **Deployments/Git**: [Pushes, Pulls, etc.]
     - **Summary**: [Summary of conversation/updates]
     ```

3. **Log Maintenance**:
   - A maintenance script [scripts/manage_logs.js](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/scripts/manage_logs.js) is provided to aggregate weekly summaries and delete logs older than 30 days (excluding weekly summaries). Run this script or let automated tasks handle it.
