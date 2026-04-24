# BFHL — Tree Hierarchy Analyzer

**SRM Full Stack Engineering Challenge — Round 1**

## Overview

A REST API (`POST /bfhl`) that accepts an array of node strings, processes hierarchical relationships, and returns structured insights (trees, cycles, depth, summary). Comes with a premium dark-themed single-page frontend.

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: HTML, CSS (glassmorphism dark theme), Vanilla JS

## Running Locally

```bash
cd server
npm install
node index.js
```

Open `http://localhost:3000` in your browser.

## API

### `POST /bfhl`

**Request:**
```json
{
  "data": ["A->B", "A->C", "B->D"]
}
```

**Response:**
```json
{
  "user_id": "vidhi_2005",
  "email_id": "va5514@srmist.edu.in",
  "college_roll_number": "RA2311028010073",
  "hierarchies": [...],
  "invalid_entries": [...],
  "duplicate_edges": [...],
  "summary": {
    "total_trees": 1,
    "total_cycles": 0,
    "largest_tree_root": "A"
  }
}
```

## Processing Rules (Summary)

- Valid edges: single uppercase letter `X->Y` (no self-loops)
- Duplicate edges: only first occurrence used
- Multi-parent nodes: first parent wins
- Cycle detection: `has_cycle: true`, `tree: {}`
- Depth: number of nodes on longest root-to-leaf path
