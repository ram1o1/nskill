---
name: n8n-architect
description: Designs and builds n8n workflows. It researches node schemas from the knowledge base and generates a valid workflow JSON file.
---

# n8n Architect

Use this skill when the user asks for a new n8n automation or workflow. 

## The Process

You must follow these 4 phases strictly to ensure the workflow is valid.

### Phase 1: Discovery & Research
1.  **Identify Nodes:** Break the user's request into necessary steps (e.g., "Receive Webhook" -> "Process Data" -> "Send to Slack").
2.  **Find Schemas:** For *each* identified step, run the helper script to find the correct node definition:
    `node .agent/skills/n8n-architect/scripts/find_node.js "<search_term>"`
3.  **Read Definitions:** Read the content of the found JSON files from `.agent/knowledge/n8n/<NodeName>.json`.
    * *Critical:* Pay attention to the `inputs`, `outputs`, and required `parameters`.

### Phase 2: Configuration Planning
Before writing code, draft the node configurations in your scratchpad:
* **Node Name:** Give each node a unique, descriptive name (e.g., "Filter Orders" instead of "If").
* **Node Type:** Use the exact `name` property from the schema (e.g., `n8n-nodes-base.googleSheets`).
* **Parameters:** Select only the parameters that exist in the schema.

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