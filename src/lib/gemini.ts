import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Candidate {
  id: number;
  name: string;
  story: string;
  reason: string;
  year: number;
  image_url?: string;
  video_url?: string;
}

export async function generateCandidates(year: number): Promise<Candidate[]> {
  const prompt = `Generate 5 parody "Source One Awards" candidates for the year ${year}. 
  The Source One Awards are a parody of the Darwin Awards, specifically focusing on people who did something incredibly stupid related to technology, coding, or "source code" that resulted in their "removal from the gene pool" (metaphorically or literally in a funny parody way).
  
  Each candidate should have:
  1. A catchy name/title.
  2. A short, funny story of what they did.
  3. A "Reason for Award" (the specific stupidity).
  
  Return the data in a structured JSON format.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              story: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
            required: ["name", "story", "reason"],
          },
        },
      },
    });

    const data = JSON.parse(response.text || "[]");
    return data.map((item: any, index: number) => ({
      id: index + 1,
      ...item,
      year,
      image_url: `https://picsum.photos/seed/${encodeURIComponent(item.name)}/800/600`
    }));
  } catch (error) {
    console.error("Error generating candidates:", error);
    // Fallback data
    return [
      { id: 1, name: "The Overclocked Toaster", story: "Tried to overclock a smart toaster to mine Bitcoin. The kitchen is now a crater.", reason: "Hardware modification without a fire extinguisher.", year },
      { id: 2, name: "Root Access Runner", story: "Gave root access to a 'helpful' script found on a dark web forum to 'speed up' his heart rate monitor.", reason: "Trusting random shell scripts.", year },
      { id: 3, name: "The Cloud Diver", story: "Thought 'The Cloud' was a physical place and tried to jump into a server rack from a drone.", reason: "Misunderstanding abstract concepts.", year },
      { id: 4, name: "Infinite Loop Larry", story: "Wrote a recursive function to manage his life choices. He's still stuck in the first choice.", reason: "Stack overflow of the soul.", year },
      { id: 5, name: "The NFT Eater", story: "Tried to physically consume a hardware wallet to 'truly own' his digital assets.", reason: "Literal interpretation of digital ownership.", year },
    ];
  }
}
