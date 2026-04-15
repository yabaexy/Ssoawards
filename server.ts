import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { put } from "@vercel/blob";
import { supabase } from "./src/lib/supabase";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Check for required environment variables
  const checkEnv = () => {
    const missing = [];
    if (!process.env.SUPABASE_URL) missing.push("SUPABASE_URL");
    if (!process.env.SUPABASE_ANON_KEY) missing.push("SUPABASE_ANON_KEY");
    if (missing.length > 0) {
      console.error(`CRITICAL: Missing environment variables: ${missing.join(", ")}`);
      return false;
    }
    return true;
  };

  const logError = (context: string, error: any) => {
    console.error(`[${context}]`, {
      message: error.message,
      details: error.details || error.hint || "No additional details",
      code: error.code || "No error code",
      stack: error.stack
    });
  };

  // API Routes
  app.get("/api/candidates/:year", async (req, res) => {
    if (!checkEnv()) {
      return res.status(500).json({ error: "Configuration Error", message: "Supabase environment variables are missing." });
    }
    const year = parseInt(req.params.year);
    
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('candidates')
        .select('*')
        .eq('year', year);

      if (fetchError) throw fetchError;
      res.json(existing || []);
    } catch (error: any) {
      logError("API Fetch Error", error);
      res.status(500).json({ 
        error: "Database Error", 
        message: error.message || "Failed to fetch candidates",
        details: error.details || null
      });
    }
  });

  app.post("/api/candidates", async (req, res) => {
    if (!checkEnv()) {
      return res.status(500).json({ error: "Configuration Error", message: "Supabase environment variables are missing." });
    }
    try {
      const candidates = req.body;
      const { data, error: insertError } = await supabase
        .from('candidates')
        .insert(candidates)
        .select();

      if (insertError) throw insertError;
      res.json(data);
    } catch (error: any) {
      logError("API Save Error", error);
      res.status(500).json({ 
        error: "Database Error", 
        message: error.message || "Failed to save candidates",
        details: error.details || null
      });
    }
  });

  // Markets API
  app.get("/api/topics", async (req, res) => {
    if (!checkEnv()) return res.status(500).json({ error: "Configuration Error", message: "Supabase environment variables are missing." });
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*, votes(*)');
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      logError("Get Topics Error", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/topics", async (req, res) => {
    if (!checkEnv()) return res.status(500).json({ error: "Configuration Error", message: "Supabase environment variables are missing." });
    try {
      const { title, description, options, creator_address } = req.body;
      const { data, error } = await supabase
        .from('topics')
        .insert([{ title, description, options, creator_address, status: 'open' }])
        .select();
      if (error) throw error;
      res.json(data[0]);
    } catch (error: any) {
      logError("Post Topic Error", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/votes", async (req, res) => {
    if (!checkEnv()) return res.status(500).json({ error: "Configuration Error", message: "Supabase environment variables are missing." });
    try {
      const { topic_id, voter_address, option_index } = req.body;
      
      // Check if already voted
      const { data: existing } = await supabase
        .from('votes')
        .select('*')
        .eq('topic_id', topic_id)
        .eq('voter_address', voter_address);
      
      if (existing && existing.length > 0) {
        return res.status(400).json({ error: "Already voted on this topic" });
      }

      const { data, error } = await supabase
        .from('votes')
        .insert([{ topic_id, voter_address, option_index }])
        .select();
      if (error) throw error;
      res.json(data[0]);
    } catch (error: any) {
      logError("Post Vote Error", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/points/:address", async (req, res) => {
    if (!checkEnv()) return res.status(500).json({ error: "Configuration Error", message: "Supabase environment variables are missing." });
    try {
      const { address } = req.params;
      const { data, error } = await supabase
        .from('user_points')
        .select('points')
        .eq('wallet_address', address.toLowerCase())
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"
      res.json({ points: data?.points || 0 });
    } catch (error: any) {
      logError("Get Points Error", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/topics/:id/resolve", async (req, res) => {
    if (!checkEnv()) return res.status(500).json({ error: "Configuration Error", message: "Supabase environment variables are missing." });
    try {
      const { id } = req.params;
      const { winner_index } = req.body;

      // 1. Update topic status
      const { data: topic, error: topicError } = await supabase
        .from('topics')
        .update({ status: 'resolved', winner_index })
        .eq('id', id)
        .select()
        .single();
      
      if (topicError) throw topicError;

      // 2. Find winners
      const { data: winners, error: votesError } = await supabase
        .from('votes')
        .select('voter_address')
        .eq('topic_id', id)
        .eq('option_index', winner_index);
      
      if (votesError) throw votesError;

      // 3. Award points (3800 YMP)
      if (winners && winners.length > 0) {
        for (const winner of winners) {
          const addr = winner.voter_address.toLowerCase();
          
          // Get current points
          const { data: current } = await supabase
            .from('user_points')
            .select('points')
            .eq('wallet_address', addr)
            .single();
          
          const newPoints = (current?.points || 0) + 3800;
          
          await supabase
            .from('user_points')
            .upsert({ wallet_address: addr, points: newPoints });
        }
      }

      res.json({ success: true, awarded_to: winners?.length || 0 });
    } catch (error: any) {
      logError("Resolve Topic Error", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
