---
name: n8n-extractor
description: Builds a local knowledge base of n8n node schemas using runtime reflection. Use this when the knowledge base is missing or outdated.
---

# n8n Schema Extractor

This skill generates a complete JSON schema reference for all standard n8n nodes by inspecting the `n8n-nodes-base` package.

## When to use this skill
- When the `.agent/knowledge/n8n` folder is missing.
- When the `n8n-guardian` skill detects a version mismatch.
- When explicitly asked to "refresh n8n schemas".

## How to execute

Follow this **exact** procedure to ensure a clean environment:

1. **Prepare Temporary Workspace**
   - Create a temporary folder named `n8n-temp-build` in the workspace root.
   - Inside `n8n-temp-build`, run `npm init -y`.

2. **Install Dependencies**
   - Install the source of truth and required runtimes: 
     `npm install n8n-nodes-base n8n-workflow n8n-core qs glob`
   - *Note: `n8n-core` and `qs` are critical peer dependencies for loading V2 nodes (Gmail, Merge, etc.).*

3. **Run Extraction Script**
   - Locate the extraction script at: `.agent/skills/n8n-extractor/scripts/extract.js`.
   - Copy this script into `n8n-temp-build/extract.js`.
   - Run the script: `node extract.js`.
   - *Result: This will create a `temp_knowledge` folder inside `n8n-temp-build`.*

4. **Deploy Knowledge Base**
   - Ensure the destination folder exists: `.agent/knowledge/n8n/`.
   - **Move** all JSON files from `n8n-temp-build/temp_knowledge/` to `.agent/knowledge/n8n/`.
   - Verify that `version.json` is present in the destination.

5. **Cleanup**
   - Delete the `n8n-temp-build` folder entirely.
   - Report success and the number of nodes extracted.