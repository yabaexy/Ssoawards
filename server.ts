import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { put } from "@vercel/blob";
import { supabase } from "./src/lib/supabase";

const ADMIN_ADDRESSES = [
  '0xf44d876365611149ebc396def8edd18a83be91c0',
  '0x8Cda9D8b30272A102e0e05A1392A795c267F14Bf',
  '0x2E9Bff8Bf288ec3AB1Dc540B777f9b48276a6286'
].map(a => a.toLowerCase());

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
    const isAdmin = req.query.isAdmin === 'true';
    
    // Auto-archive logic: If year is in the past, archive all candidates of that year
    const currentYear = new Date().getFullYear();
    if (year < currentYear) {
      await supabase
        .from('candidates')
        .update({ archived: true })
        .eq('year', year);
    }

    try {
      // 1. Try the full query with filters
      let query = supabase
        .from('candidates')
        .select('*')
        .eq('year', year)
        .eq('archived', false);

      if (!isAdmin) {
        query = query.eq('is_published', true);
      }

      const { data: existing, error: fetchError } = await query;

      if (fetchError) {
        // 2. Fallback: If columns are missing, try a simple query and filter in-memory
        if (fetchError.message.includes("column") && (fetchError.message.includes("archived") || fetchError.message.includes("is_published"))) {
          console.warn("Database schema is outdated. Falling back to in-memory filtering.");
          
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('candidates')
            .select('*')
            .eq('year', year);

          if (fallbackError) throw fallbackError;

          // Map old data to new schema format
          const mappedData = (fallbackData || []).map(item => ({
            ...item,
            is_published: item.is_published ?? true, // Assume old items are published
            archived: item.archived ?? false        // Assume old items are not archived
          }));

          // Apply filters in-memory
          const filteredData = mappedData.filter(item => {
            if (item.archived) return false;
            if (!isAdmin && !item.is_published) return false;
            return true;
          });

          return res.json(filteredData);
        }
        
        logError("Supabase Query Error", fetchError);
        throw fetchError;
      }
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

  app.patch("/api/candidates/:id", async (req, res) => {
    if (!checkEnv()) return res.status(500).json({ error: "Configuration Error" });
    const { adminAddress, ...updates } = req.body;
    
    if (!adminAddress || !ADMIN_ADDRESSES.includes(adminAddress.toLowerCase())) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const { data, error } = await supabase
        .from('candidates')
        .update(updates)
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      logError("Update Candidate Error", error);
      res.status(500).json({ error: error.message });
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
        .select('*')
        .eq('wallet_address', address.toLowerCase())
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"
      
      if (!data) {
        return res.json({ 
          points: 0, 
          muse_level: 1, 
          unlocked_skins: ['default'], 
          current_skin: 'default',
          completed_missions: []
        });
      }
      res.json(data);
    } catch (error: any) {
      logError("Get Points Error", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/muse/update", async (req, res) => {
    if (!checkEnv()) return res.status(500).json({ error: "Configuration Error", message: "Supabase environment variables are missing." });
    try {
      const { wallet_address, ...updates } = req.body;
      const addr = wallet_address.toLowerCase();

      const { data, error } = await supabase
        .from('user_points')
        .upsert({ wallet_address: addr, ...updates })
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      logError("Update Muse Error", error);
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
