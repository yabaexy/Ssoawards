export interface Candidate {
  id: string;
  name: string;
  story: string;
  reason: string;
  year: number;
  image_url?: string;
  video_url?: string;
  is_published: boolean;
  archived: boolean;
}

// Vite-only 모드에서는 서버 키를 쓰지 않음.
// 후보가 없을 때는 SQL로 seed 넣거나, 아래 fallback만 사용.
export async function generateCandidates(year: number): Promise<Candidate[]> {
  return [
    {
      id: "1",
      name: "The Overclocked Toaster",
      story: "Tried to overclock a smart toaster to mine Bitcoin. The kitchen is now a crater.",
      reason: "Hardware modification without a fire extinguisher.",
      year,
      is_published: false,
      archived: false,
    },
    {
      id: "2",
      name: "Root Access Runner",
      story: "Gave root access to a 'helpful' script found on a dark web forum to 'speed up' his heart rate monitor.",
      reason: "Trusting random shell scripts.",
      year,
      is_published: false,
      archived: false,
    },
    {
      id: "3",
      name: "The Cloud Diver",
      story: "Thought 'The Cloud' was a physical place and tried to jump into a server rack from a drone.",
      reason: "Misunderstanding abstract concepts.",
      year,
      is_published: false,
      archived: false,
    },
    {
      id: "4",
      name: "Infinite Loop Larry",
      story: "Wrote a recursive function to manage his life choices. He's still stuck in the first choice.",
      reason: "Stack overflow of the soul.",
      year,
      is_published: false,
      archived: false,
    },
    {
      id: "5",
      name: "The NFT Eater",
      story: "Tried to physically consume a hardware wallet to 'truly own' his digital assets.",
      reason: "Literal interpretation of digital ownership.",
      year,
      is_published: false,
      archived: false,
    },
  ];
}