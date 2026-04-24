/* ═══════════════════════════════════════════════════════════════
   BFHL Analyzer — Frontend Logic
   ═══════════════════════════════════════════════════════════════ */

const API_URL = window.location.origin; // same origin when served by Express

// ─── DOM References ─────────────────────────────────────────────
const nodeInput = document.getElementById("nodeInput");
const submitBtn = document.getElementById("submitBtn");
const errorBox = document.getElementById("errorBox");
const errorMsg = document.getElementById("errorMsg");
const results = document.getElementById("results");

// Summary
const valTrees = document.getElementById("valTrees");
const valCycles = document.getElementById("valCycles");
const valLargest = document.getElementById("valLargest");

// Lists
const hierarchiesList = document.getElementById("hierarchiesList");
const invalidList = document.getElementById("invalidList");
const duplicateList = document.getElementById("duplicateList");
const rawJson = document.getElementById("rawJson");

// ─── Submit Handler ─────────────────────────────────────────────
submitBtn.addEventListener("click", async () => {
    const raw = nodeInput.value.trim();
    if (!raw) {
        showError("Please enter at least one node relationship.");
        return;
    }

    // Parse comma or newline separated
    const data = raw
        .split(/[,\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    hideError();
    hideResults();
    setLoading(true);

    try {
        const res = await fetch(`${API_URL}/bfhl`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
        }

        const json = await res.json();
        renderResults(json);
    } catch (err) {
        showError(err.message || "Failed to reach the API. Is the server running?");
    } finally {
        setLoading(false);
    }
});

// Allow Ctrl+Enter to submit
nodeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        submitBtn.click();
    }
});

// ─── Render Results ─────────────────────────────────────────────
function renderResults(data) {
    // Summary
    valTrees.textContent = data.summary.total_trees;
    valCycles.textContent = data.summary.total_cycles;
    valLargest.textContent = data.summary.largest_tree_root || "—";

    // Hierarchies
    hierarchiesList.innerHTML = "";
    for (const h of data.hierarchies) {
        const item = document.createElement("div");
        item.className = "hierarchy-item";

        // Header
        const header = document.createElement("div");
        header.className = "hierarchy-header";

        const rootBadge = document.createElement("span");
        rootBadge.className = "root-badge";
        rootBadge.textContent = `Root: ${h.root}`;
        header.appendChild(rootBadge);

        if (h.has_cycle) {
            header.appendChild(makeTag("Cycle", "tag-cycle"));
        } else {
            header.appendChild(makeTag("Tree", "tag-tree"));
            header.appendChild(makeTag(`Depth: ${h.depth}`, "tag-depth"));
        }

        item.appendChild(header);

        // Tree visualization
        if (!h.has_cycle && Object.keys(h.tree).length > 0) {
            const treeDiv = document.createElement("div");
            treeDiv.className = "tree-view";
            treeDiv.innerHTML = renderTree(h.tree, 0);
            item.appendChild(treeDiv);
        } else if (h.has_cycle) {
            const note = document.createElement("div");
            note.className = "tree-view";
            note.innerHTML = `<span class="branch">Cycle detected — no tree structure</span>`;
            item.appendChild(note);
        }

        hierarchiesList.appendChild(item);
    }

    // Invalid entries
    renderBadges(invalidList, data.invalid_entries, "badge-invalid", "No invalid entries");

    // Duplicate edges
    renderBadges(duplicateList, data.duplicate_edges, "badge-dup", "No duplicates");

    // Raw JSON
    rawJson.textContent = JSON.stringify(data, null, 2);

    results.classList.remove("hidden");
}

// ─── Tree Renderer (ASCII-style) ────────────────────────────────
function renderTree(obj, depth) {
    let html = "";
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const isLast = i === keys.length - 1;
        const prefix = depth === 0 ? "" : getIndent(depth) + (isLast ? "└── " : "├── ");
        html += `<div>${escapeHtml(prefix)}<span class="node">${escapeHtml(key)}</span></div>`;
        const children = obj[key];
        if (children && Object.keys(children).length > 0) {
            html += renderTree(children, depth + 1);
        }
    }
    return html;
}

function getIndent(depth) {
    let indent = "";
    for (let i = 0; i < depth; i++) {
        indent += "│   ";
    }
    return indent;
}

// ─── Helpers ────────────────────────────────────────────────────
function makeTag(text, cls) {
    const span = document.createElement("span");
    span.className = `tag ${cls}`;
    span.textContent = text;
    return span;
}

function renderBadges(container, items, cls, emptyText) {
    container.innerHTML = "";
    if (!items || items.length === 0) {
        const empty = document.createElement("span");
        empty.className = "badge badge-empty";
        empty.textContent = emptyText;
        container.appendChild(empty);
        return;
    }
    for (const item of items) {
        const badge = document.createElement("span");
        badge.className = `badge ${cls}`;
        badge.textContent = item;
        container.appendChild(badge);
    }
}

function showError(msg) {
    errorMsg.textContent = msg;
    errorBox.classList.remove("hidden");
}

function hideError() {
    errorBox.classList.add("hidden");
}

function hideResults() {
    results.classList.add("hidden");
}

function setLoading(on) {
    if (on) submitBtn.classList.add("loading");
    else submitBtn.classList.remove("loading");
}

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
