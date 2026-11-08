export type WorkMedia =
  | { type: "image"; src: string }
  | { type: "video"; src: string; poster: string };

export type WorkItem = {
  slug: string;
  name: string;
  category: string;
  service: string;
  code: string;
  media: WorkMedia;
};

// Placeholder projects — swap names, copy and media for real case studies.
export const work: WorkItem[] = [
  {
    slug: "monolith",
    name: "Monolith Realty",
    category: "Real Estate",
    service: "Website + CMS",
    code: "S001",
    media: { type: "image", src: "/work/tower.jpg" },
  },
  {
    slug: "aura",
    name: "Aura Skin",
    category: "D2C Beauty",
    service: "Meta Ads + Creative",
    code: "S002",
    media: { type: "image", src: "/work/portrait.jpg" },
  },
  {
    slug: "deskflow",
    name: "Deskflow",
    category: "SaaS",
    service: "Admin Panel + Dashboard",
    code: "S003",
    media: { type: "image", src: "/work/workspace.jpg" },
  },
  {
    slug: "svayam-reel",
    name: "Svayam Reel",
    category: "Studio",
    service: "Design + Engineering",
    code: "S004",
    media: { type: "video", src: "/work/reel.mp4", poster: "/work/reel-poster.jpg" },
  },
  {
    slug: "frame-studio",
    name: "Frame Studio",
    category: "Creative",
    service: "Brand + Website",
    code: "S005",
    media: { type: "image", src: "/work/lens.jpg" },
  },
  {
    slug: "nightline",
    name: "Nightline",
    category: "Hospitality",
    service: "AI Booking Agent",
    code: "S006",
    media: { type: "image", src: "/work/citylights.jpg" },
  },
  {
    slug: "tide-ops",
    name: "Tide Ops",
    category: "Logistics",
    service: "AI Automation",
    code: "S007",
    media: { type: "image", src: "/work/shoreline.jpg" },
  },
];

// The card the intro lands on and the showcase opens facing.
export const CENTER_INDEX = 3;

export const services = [
  "Websites",
  "Admin panels",
  "Meta ads",
  "AI automations",
  "Something else",
];
