---
name: n8n-guardian
description: Checks if the local n8n knowledge base is up-to-date with the latest npm version. Triggers the extractor if an update is needed.
---

# n8n Version Guardian

This skill ensures your `.agent/knowledge/n8n` folder matches the latest stable release of n8n.

## When to use this skill
- At the start of a session involving n8n workflows.
- When the user asks to "check for updates".
- Before attempting to generate complex n8n workflows (to ensure schema accuracy).

## How to execute

1. **Check Local Version**
   - Read `.agent/knowledge/n8n/version.json`.
   - If the file or folder does not exist, **STOP** and immediately trigger the `n8n-extractor` skill.
   - Note the local version (e.g., `1.15.0`).

2. **Check Remote Version**
   - Run `npm view n8n-nodes-base version` to get the latest version from the registry.

3. **Compare and Act**
   - **If Local < Remote**: 
     - Inform the user: "Local n8n schemas are outdated (Local: X, Remote: Y). Updating now..."
     - Trigger the `n8n-extractor` skill.
   - **If Local == Remote**:
     - Inform the user: "n8n schemas are up to date (Version X)."
     - Do nothing further.

## Decision Tree

- **Missing Knowledge Base?** -> Call `n8n-extractor`
- **Version Mismatch?** -> Call `n8n-extractor`
- **Up to date?** -> Done.