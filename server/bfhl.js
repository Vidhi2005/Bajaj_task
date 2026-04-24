/**
 * Core processing logic for POST /bfhl
 * Handles: validation, dedup, tree construction, cycle detection, depth, summary
 */

// ─── Configuration ──────────────────────────────────────────────
const USER_ID = "vidhi_2005";
const EMAIL_ID = "va5514@srmist.edu.in";
const ROLL_NUMBER = "RA2311028010073";

// ─── Validation ─────────────────────────────────────────────────
const EDGE_REGEX = /^([A-Z])->([A-Z])$/;

function validateAndParse(data) {
  const validEdges = [];
  const invalidEntries = [];

  for (const raw of data) {
    const trimmed = (typeof raw === "string") ? raw.trim() : String(raw).trim();

    if (!trimmed) {
      invalidEntries.push(raw);
      continue;
    }

    const match = trimmed.match(EDGE_REGEX);
    if (!match) {
      invalidEntries.push(raw);
      continue;
    }

    const [, parent, child] = match;

    // Self-loop is invalid
    if (parent === child) {
      invalidEntries.push(raw);
      continue;
    }

    validEdges.push({ parent, child, original: trimmed });
  }

  return { validEdges, invalidEntries };
}

// ─── Duplicate Detection ────────────────────────────────────────
function deduplicateEdges(validEdges) {
  const seen = new Set();
  const duplicateSet = new Set();
  const uniqueEdges = [];

  for (const edge of validEdges) {
    const key = `${edge.parent}->${edge.child}`;
    if (seen.has(key)) {
      duplicateSet.add(key);
    } else {
      seen.add(key);
      uniqueEdges.push(edge);
    }
  }

  return {
    uniqueEdges,
    duplicateEdges: Array.from(duplicateSet),
  };
}

// ─── Multi-parent handling ──────────────────────────────────────
function buildAdjacency(uniqueEdges) {
  const adj = {};       // parent -> [children]
  const parentOf = {};  // child -> parent (first encountered only)
  const allNodes = new Set();

  for (const { parent, child } of uniqueEdges) {
    allNodes.add(parent);
    allNodes.add(child);

    // If child already has a parent, discard this edge (diamond case)
    if (parentOf[child] !== undefined) {
      continue;
    }

    parentOf[child] = parent;
    if (!adj[parent]) adj[parent] = [];
    adj[parent].push(child);
  }

  return { adj, parentOf, allNodes };
}

// ─── Connected Components (Union-Find) ─────────────────────────
function findComponents(adj, parentOf, allNodes) {
  const parent = {};
  const rank = {};

  for (const node of allNodes) {
    parent[node] = node;
    rank[node] = 0;
  }

  function find(x) {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }

  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    if (rank[ra] < rank[rb]) parent[ra] = rb;
    else if (rank[ra] > rank[rb]) parent[rb] = ra;
    else { parent[rb] = ra; rank[ra]++; }
  }

  // Union nodes connected by edges in adj
  for (const p of Object.keys(adj)) {
    for (const c of adj[p]) {
      union(p, c);
    }
  }

  // Group nodes by component root
  const components = {};
  for (const node of allNodes) {
    const root = find(node);
    if (!components[root]) components[root] = [];
    components[root].push(node);
  }

  return Object.values(components);
}

// ─── Cycle Detection (DFS coloring) ────────────────────────────
function hasCycle(adj, nodes) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = {};
  for (const n of nodes) color[n] = WHITE;

  function dfs(u) {
    color[u] = GRAY;
    for (const v of (adj[u] || [])) {
      if (!nodes.includes(v)) continue; // only within component
      if (color[v] === GRAY) return true;
      if (color[v] === WHITE && dfs(v)) return true;
    }
    color[u] = BLACK;
    return false;
  }

  for (const n of nodes) {
    if (color[n] === WHITE) {
      if (dfs(n)) return true;
    }
  }
  return false;
}

// ─── Tree Building ─────────────────────────────────────────────
function buildTree(root, adj) {
  const tree = {};
  tree[root] = buildSubtree(root, adj);
  return tree;
}

function buildSubtree(node, adj) {
  const children = adj[node] || [];
  const subtree = {};
  for (const child of children) {
    subtree[child] = buildSubtree(child, adj);
  }
  return subtree;
}

// ─── Depth Calculation ─────────────────────────────────────────
function calcDepth(node, adj) {
  const children = adj[node] || [];
  if (children.length === 0) return 1;
  let maxChildDepth = 0;
  for (const child of children) {
    maxChildDepth = Math.max(maxChildDepth, calcDepth(child, adj));
  }
  return 1 + maxChildDepth;
}

// ─── Root Detection ─────────────────────────────────────────────
function findRoot(componentNodes, parentOf) {
  // Root = node with no parent within the component
  const nodesSet = new Set(componentNodes);
  const roots = componentNodes.filter(
    (n) => parentOf[n] === undefined || !nodesSet.has(parentOf[n])
  );

  if (roots.length > 0) {
    // If multiple roots (shouldn't happen with valid tree), pick lex smallest
    roots.sort();
    return roots[0];
  }

  // Pure cycle — no root; use lex smallest node
  componentNodes.sort();
  return componentNodes[0];
}

// ─── Main Processing ───────────────────────────────────────────
function processBfhl(data) {
  if (!Array.isArray(data)) {
    throw new Error("\"data\" must be an array");
  }

  // Step 1: Validate
  const { validEdges, invalidEntries } = validateAndParse(data);

  // Step 2: Deduplicate
  const { uniqueEdges, duplicateEdges } = deduplicateEdges(validEdges);

  // Step 3: Build adjacency (with multi-parent handling)
  const { adj, parentOf, allNodes } = buildAdjacency(uniqueEdges);

  // Step 4: Find connected components
  const components = findComponents(adj, parentOf, allNodes);

  // Step 5: Process each component
  const hierarchies = [];

  for (const componentNodes of components) {
    const root = findRoot(componentNodes, parentOf);
    const cyclic = hasCycle(adj, componentNodes);

    if (cyclic) {
      hierarchies.push({
        root,
        tree: {},
        has_cycle: true,
      });
    } else {
      const tree = buildTree(root, adj);
      const depth = calcDepth(root, adj);
      hierarchies.push({
        root,
        tree,
        depth,
      });
    }
  }

  // Sort hierarchies: put them in the order they first appeared in input
  // (by the first edge that involves a node in that component)
  const nodeToComponentIdx = {};
  for (let i = 0; i < components.length; i++) {
    for (const n of components[i]) {
      nodeToComponentIdx[n] = i;
    }
  }

  const componentOrder = [];
  const seen = new Set();
  for (const { parent, child } of uniqueEdges) {
    const idx = nodeToComponentIdx[parent];
    if (idx !== undefined && !seen.has(idx)) {
      seen.add(idx);
      componentOrder.push(idx);
    }
  }

  const sortedHierarchies = componentOrder.map((idx) => hierarchies[idx]);

  // Step 6: Build summary
  const nonCyclic = sortedHierarchies.filter((h) => !h.has_cycle);
  const cyclic = sortedHierarchies.filter((h) => h.has_cycle);

  let largestTreeRoot = "";
  let maxDepth = 0;
  for (const h of nonCyclic) {
    if (
      h.depth > maxDepth ||
      (h.depth === maxDepth && h.root < largestTreeRoot)
    ) {
      maxDepth = h.depth;
      largestTreeRoot = h.root;
    }
  }

  const summary = {
    total_trees: nonCyclic.length,
    total_cycles: cyclic.length,
    largest_tree_root: largestTreeRoot,
  };

  return {
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: ROLL_NUMBER,
    hierarchies: sortedHierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary,
  };
}

module.exports = { processBfhl };
