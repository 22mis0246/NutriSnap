// ✅ Import modules
import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

// ✅ Setup __dirname (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Initialize Express
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // serve static files

// ✅ File paths
const MEALS_FILE = path.join(__dirname, "meals.json");
const CAL_FILE = path.join(__dirname, "calories.json");

// ✅ Ensure files exist
if (!fs.existsSync(MEALS_FILE)) fs.writeFileSync(MEALS_FILE, "[]", "utf8");
if (!fs.existsSync(CAL_FILE)) fs.writeFileSync(CAL_FILE, "{}", "utf8");

// ✅ Load calorie database
function loadCalDB() {
  try {
    return JSON.parse(fs.readFileSync(CAL_FILE, "utf8"));
  } catch {
    return {};
  }
}

// ✅ Route: Get all meals
app.get("/getMeals", (req, res) => {
  try {
    const meals = JSON.parse(fs.readFileSync(MEALS_FILE, "utf8"));
    res.json(meals);
  } catch (err) {
    console.error("❌ Error loading meals:", err);
    res.status(500).json([]);
  }
});

// ✅ Route: Add new meal
app.post("/addMeal", (req, res) => {
  const { meal, calories } = req.body;
  if (!meal) return res.status(400).json({ error: "Meal name required" });

  const meals = JSON.parse(fs.readFileSync(MEALS_FILE, "utf8"));
  meals.push({ name: meal, calories: calories ?? null });
  fs.writeFileSync(MEALS_FILE, JSON.stringify(meals, null, 2), "utf8");
  console.log(`🍽️ Added meal: ${meal}`);
  res.json({ success: true });
});

// ✅ Route: Delete meal by index
app.delete("/deleteMeal", (req, res) => {
  const { index } = req.body;
  if (index === undefined) return res.status(400).json({ error: "Index required" });

  try {
    const meals = JSON.parse(fs.readFileSync(MEALS_FILE, "utf8"));
    if (index >= 0 && index < meals.length) {
      const deleted = meals.splice(index, 1)[0];
      fs.writeFileSync(MEALS_FILE, JSON.stringify(meals, null, 2), "utf8");
      console.log(`🗑️ Deleted meal: ${deleted.name}`);
      return res.json({ success: true });
    }
    res.status(400).json({ error: "Invalid index" });
  } catch (err) {
    console.error("❌ Error deleting meal:", err);
    res.status(500).json({ error: "Failed to delete meal" });
  }
});

// ✅ Route: Clear all meals
app.delete("/clearMeals", (req, res) => {
  try {
    fs.writeFileSync(MEALS_FILE, "[]", "utf8");
    console.log("🧹 Cleared all meals!");
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error clearing meals:", err);
    res.status(500).json({ error: "Failed to clear meals" });
  }
});

// ✅ Route: Lookup calories from local DB
app.get("/lookupCalories/:meal", (req, res) => {
  const mealKey = decodeURIComponent(req.params.meal).toLowerCase();
  const db = loadCalDB();

  if (db[mealKey] !== undefined)
    return res.json({ found: true, calories: db[mealKey] });
  res.json({ found: false });
});

// ✅ Route: Add new calorie entry
app.post("/addCalEntry", (req, res) => {
  const { key, calories } = req.body;
  if (!key || typeof calories !== "number")
    return res.status(400).json({ error: "Invalid input" });

  const db = loadCalDB();
  db[key.toLowerCase()] = calories;
  fs.writeFileSync(CAL_FILE, JSON.stringify(db, null, 2), "utf8");
  console.log(`🔥 Added calorie entry: ${key} = ${calories} kcal`);
  res.json({ success: true });
});

// ✅ Serve index.html (main UI)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Helper to detect local IP
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

// ✅ Start server
const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`
🚀 NutriSnap running successfully!
---------------------------------
▶ Local:   http://localhost:${PORT}
▶ Network: http://${getLocalIP()}:${PORT}

(Use the Network URL on your phone 📱 — both devices must be on the same Wi-Fi)
`);
});
