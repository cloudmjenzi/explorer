/** Botswana's tourism regions. Coordinates are approximate centres used for the map. */
export const REGIONS = [
  {
    slug: "okavango-delta",
    name: "Okavango Delta & Maun",
    summary:
      "The inland delta that floods in the dry season. Mokoro trips through papyrus channels, scenic flights over the fan, game drives on the islands and Moremi.",
    bestTime: "June to October for high water and game. November to March for birding and green season rates.",
    gateway: "Maun (MUB)",
    lon: 23.1,
    lat: -19.45,
    sort: 1,
  },
  {
    slug: "chobe",
    name: "Chobe & Kasane",
    summary:
      "The largest elephant population in Africa, gathered along the Chobe River. Boat cruises at sunset, riverfront game drives and day trips to Victoria Falls.",
    bestTime: "May to October, when herds come to the river.",
    gateway: "Kasane (BBK)",
    lon: 25.0,
    lat: -18.15,
    sort: 2,
  },
  {
    slug: "makgadikgadi",
    name: "Makgadikgadi Pans & Nata",
    summary:
      "Salt pans the size of a small country. Quad bikes and sleep-outs on the pans in the dry season, the zebra migration and flamingos when the rains come.",
    bestTime: "April to October for the pans. December to March for the migration and flamingos.",
    gateway: "Nata, Gweta",
    lon: 25.55,
    lat: -20.75,
    sort: 3,
  },
  {
    slug: "central-kalahari",
    name: "Central Kalahari",
    summary:
      "Open grassland and fossil river valleys. Black-maned lions, oryx and San-guided walks in one of the largest game reserves on Earth.",
    bestTime: "December to April, when the rains bring the herds to Deception Valley.",
    gateway: "Rakops, Ghanzi",
    lon: 23.6,
    lat: -22.3,
    sort: 4,
  },
  {
    slug: "ghanzi",
    name: "Ghanzi & the San homeland",
    summary:
      "Cattle country and the heart of San culture. Bushwalks with San trackers, traditional craft and stays on Kalahari farms.",
    bestTime: "All year. April to September for cooler days.",
    gateway: "Ghanzi",
    lon: 21.75,
    lat: -21.7,
    sort: 5,
  },
  {
    slug: "kgalagadi",
    name: "Kgalagadi Transfrontier",
    summary:
      "Red dunes shared with South Africa. Some of the best predator viewing in Africa, on self-drive or guided trips.",
    bestTime: "March to May, and September to November.",
    gateway: "Tsabong, Two Rivers",
    lon: 20.75,
    lat: -25.4,
    sort: 6,
  },
  {
    slug: "tuli-block",
    name: "Tuli Block",
    summary:
      "Sandstone kopjes and baobabs where Botswana, South Africa and Zimbabwe meet. Horseback and cycling safaris, and big elephant herds.",
    bestTime: "May to October.",
    gateway: "Pont Drift border, Bobonong",
    lon: 28.75,
    lat: -22.1,
    sort: 7,
  },
  {
    slug: "central-east",
    name: "Serowe, Palapye & Khama Rhino",
    summary:
      "The rhino sanctuary near Serowe, the Tswapong Hills and the history of the Bamangwato kingdom.",
    bestTime: "All year.",
    gateway: "Serowe, Palapye",
    lon: 26.75,
    lat: -22.35,
    sort: 8,
  },
  {
    slug: "gaborone",
    name: "Gaborone & the south",
    summary:
      "The capital and its surrounds. Mokolodi Nature Reserve, Gaborone Game Reserve, Manyana rock art and weekend trips from the city.",
    bestTime: "All year.",
    gateway: "Gaborone (GBE)",
    lon: 25.9,
    lat: -24.65,
    sort: 9,
  },
  {
    slug: "tsodilo",
    name: "Tsodilo Hills & the Panhandle",
    summary:
      "A UNESCO site with thousands of rock paintings, and the Okavango Panhandle for tiger fishing and houseboats.",
    bestTime: "September to February for tiger fishing. All year for Tsodilo.",
    gateway: "Shakawe",
    lon: 21.85,
    lat: -18.55,
    sort: 10,
  },
] as const;
