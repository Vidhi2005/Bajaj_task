const express = require("express");
const cors = require("cors");
const path = require("path");
const { processBfhl } = require("./bfhl");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, "..", "frontend")));

// ─── Routes ─────────────────────────────────────────────────────
app.post("/bfhl", (req, res) => {
    try {
        const { data } = req.body;

        if (!data) {
            return res.status(400).json({ error: "Missing \"data\" field in request body" });
        }

        const result = processBfhl(data);
        return res.json(result);
    } catch (err) {
        console.error("Error processing /bfhl:", err.message);
        return res.status(400).json({ error: err.message });
    }
});

// Fallback: serve frontend
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

// ─── Start Server ───────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
