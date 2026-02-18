---
name: n8n-architect
description: Designs and builds n8n workflows. It researches node schemas from the knowledge base and generates a valid workflow JSON file.
---

# n8n Architect

Use this skill when the user asks for a new n8n automation or workflow. 

## The Process

You must follow these 4 phases strictly to ensure the workflow is valid.

### Phase 1: Discovery & Research
1.  **Identify Nodes:** Break the user's request into necessary steps.
2.  **Find Schemas:** Run the helper script using natural language keywords (e.g., "google sheets" or "postgres trigger"):
    `node .agent/skills/n8n-architect/scripts/find_node.js "<search_terms>"`
3.  **Select Best Match:** The script returns the top 5 matches sorted by relevance. 
    * Review the `displayName` and `description` in the JSON output.
    * Select the node that best fits the user's intent (e.g., choose `GoogleSheets` over `GoogleDrive` if the user asked for "spreadsheet").
4.  **Read Definitions:** Read the content of the selected JSON file from `.agent/knowledge/n8n/<filename>`.

### Phase 2: Configuration & Strategy
1.  **Inspect Nodes:** Run `inspect_node.js` for key nodes to identify required parameters.
2.  **Handle Missing Data (Eager Mode):**
    * If a required field (like an ID or API Key) is missing, **DO NOT STOP**.
    * Instead, insert a clear, uppercase placeholder string (e.g., `INSERT_SPREADSHEET_ID`, `YOUR_SLACK_CHANNEL`).
    * **Logic Check:** Only stop and ask questions if the *logic* of the workflow is ambiguous (e.g., "Did you mean to send this to Slack or Email?").

### Phase 3: Assembly (The JSON Construction)
1.  Read the template at `.agent/skills/n8n-architect/templates/workflow.json`.
2.  Construct the `nodes` array:
    * Ensure every node has a unique `id` (UUID).
    * Ensure `position` coordinates `[x, y]` are spaced out (increment X by 250 for each step) so the graph looks clean.
3.  Construct the `connections` object:
    * Map the output of one node to the input of the next.
    * Format: `"Node Name": { "main": [ [ { "node": "Next Node Name", "type": "main", "index": 0 } ] ] }`

### Phase 4: Delivery
1.  Save the final JSON to the workspace root as `workflow.json` (or a more specific name if appropriate).
2.  Tell the user: "I have generated the workflow. You can import `workflow.json` directly into n8n."

## Rules & Constraints
* **No Hallucinations:** Never invent a parameter that isn't in the knowledge base JSON.
* **Webhook First:** If the workflow needs a trigger and none is specified, default to using a `Webhook` or `Schedule` node.
* **Unique Names:** Node names in the `connections` object must perfectly match the `name` field in the `nodes` array.