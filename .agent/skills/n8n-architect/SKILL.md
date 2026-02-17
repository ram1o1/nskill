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

### Phase 2: Configuration & Interrogation
Before generating JSON, you must validate that you have the necessary data to configure the nodes.

1.  **Inspect Requirements:** For every key node in the plan, run:
    `node .agent/skills/n8n-architect/scripts/inspect_node.js <filename>`
2.  **Analyze & Ask (The "Human-in-the-Loop" Step):**
    Review the output from the inspection script.
    * **Credentials:** If the node requires credentials (e.g., `googleSheetsOAuth2`), **DO NOT** ask the user for keys/passwords. Instead, plan to leave a "sticky note" or comment in the final response reminding them to set it up in the UI.
    * **Required Inputs:** Look for parameters where `required: true` and you do not have the value in the chat history.
        * *Example:* If `operation` is "getAll" and `limit` is required but unknown, you must ASK.
    * **Contextual Inputs:** Use the `displayOptions` logic to ask smart questions.
        * *Bad Question:* "What is the Raw Data?" (When the user just wants a simple lookup).
        * *Good Question:* "I see you want to read a Google Sheet. Do you have the 'Spreadsheet ID' handy, or should I leave that blank for you to fill later?"
3.  **Stop & Confirm:** If you are missing critical "Required" fields, **STOP** the generation process. Ask the user for the missing details. Only proceed to Phase 3 once you have the data or the user tells you to use placeholders.

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