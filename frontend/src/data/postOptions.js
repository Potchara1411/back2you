export const DEFAULT_CATEGORY_OPTIONS = [
  { id: 1, label: 'Electronics' },
  { id: 2, label: 'Clothing' },
  { id: 3, label: 'Stationery & Books' },
  { id: 4, label: 'Accessories' },
  { id: 5, label: 'Keys' },
  { id: 6, label: 'Wallets & Cards' },
  { id: 7, label: 'Umbrellas' },
  { id: 8, label: 'Other' },
];

export const DEFAULT_CATEGORY_NAMES = DEFAULT_CATEGORY_OPTIONS.map((category) => category.label);

export const buildingsByArea = {
  North: [
    'N1 IT Convergence Building',
    'N2 Branch Administration B/D',
    'N3 Sports Complex',
    'N4 School of Humanities & Social Science B/D',
    'N5 Basic Experiement & Research B/D',
    'N6 Faculty Hall',
    'N7 Mechanical Engineering B/D',
    'N7-1 Dept. of Nuclear & Quantum Engineering',
    'N7-2 Dept. of Aerospace Engineering',
    'N7-3, 4 Dept. of Mechanical Engineering',
    'N7-5 Automobile Technology Laboratory Building',
    'N9 Practice B/D',
    'N10 Undergraduate Branch Library',
    'N11 Cafeteria',
    'N12 Student Center-2',
    'N13 Tae Wul Gwan',
    'N13-1 Chang Young Shin Student Center',
    'N14 Sarang Hall',
    'N15 Staff Accommodation',
    'N16 Somang Hall',
    'N17 Seongsil Hall',
    'N18 Jilli Hall',
    'N19 Areum Hall',
    'N20 Silloe Hall',
    'N21 Jihye Hall',
    'N22 Alumni Venture Hall',
    'N23 fMRI Center',
    'N24 LG Innovation Hall',
    'N25 Dept. of Industrial Design B/D',
    'N26 Center for High-Performance Integrated Systems',
    'N27 Eureka Hall',
    'N28 Energy & Environment Research Center',
  ],
  East: [
    'E2 Industrial Engineering & Management B/D',
    'E2-1 Dept. of Mathematical Sciences',
    'E2-2 Dept. of Industrial & Systems Engineering',
    'E2-3 Graduate School of Knowledge Service Engineering',
    'E3 Information & Electronics B/D',
    'E3-1 School of Computing',
    'E3-2 School of Electrical Engineering',
    'E3-3 Device Innovation Facility',
    'E3-4 Saeneul Dong',
    'E4 KAIST Institutes B/D',
    'E5 Faculty Club',
    'E6 Natural Science B/D',
    'E6-1 Dept. of Mathematical Sciences',
    'E6-2 Dept. of Physics',
    'E6-3 Dept. of Biological Sciences',
    'E6-4 Dept. of Chemistry',
    'E6-5 GoongNi Laboratory Building',
    'E6-6 Basic Science Building',
    'E7 Biomedical Research Center',
    'E8 Sejong Hall',
    'E9 Academic Cultural Complex',
    'E10 Storehouse',
    'E11 Creative Learning B/D',
    'E12 Energy Plant',
    'E13 Satellite Technology Research Center',
    'E14 Main Administration B/D',
    'E15 Auditorium',
    'E16 ChungMoonSoul B/D',
    'E16-1 YANG Bun Soon B/D',
    'E17 Stadium',
    'E18 Daejeon Disease-model Animal Center',
    'E18-1 Bio Model System Park',
    'E19 National Nano Fab Center',
    'E20 Kyeryong Hall',
    'E21 KAIST Clinic, Pharmacy',
  ],
  West: [
    'W1 Applied Engineering B/D',
    'W1-1 Dept. of Materials Science & Engineering',
    'W1-2 Dept. of Civil & Environmental Engineering',
    'W1-3 Dept. of Chemical & Biomolecular Engineering',
    'W2 Student Center-1',
    'W2-1 International Center',
    'W3 Galilei Hall',
    'W4-1 Yeoul Hall',
    'W4-2 Nadl Hall',
    'W4-3 Dasom Hall',
    'W4-4 Heemang Hall',
    'W5-1 Married Students Housing',
    'W5-2 Startup Village',
    'W5-3 International Village C',
    'W5-4 International Village A',
    'W5-5 International Village B',
    'W6 Mir Hall, Narae Hall',
    'W7 Nanum Hall',
    'W8 Educational Support B/D',
    'W8-1 Analysis Center for Research Advancement',
    'W9 Outdoor Theater',
    'W10 Wind Tunnel Laboratory',
    'W11 International Faculty Apartment',
    'W12 West Energy Plant',
    'W16 Geotechnical Centrifuge Testing Center',
  ],
};

function getFloorLabel(floor) {
  if (floor === 1) return '1st floor';
  if (floor === 2) return '2nd floor';
  if (floor === 3) return '3rd floor';
  return `${floor}th floor`;
}

function guessFloorCount(buildingName) {
  if (/Outdoor|Stadium|Plant|Storehouse|Tunnel/i.test(buildingName)) return 1;
  if (/Hall|Accommodation|Village|Apartment|Housing/i.test(buildingName)) return 10;
  if (/Center|Complex|Library|Student Center|Clinic|Administration/i.test(buildingName)) return 5;
  if (/Dept\.|School|Engineering|Science|Research|Institute|Building|B\/D/i.test(buildingName)) return 7;
  return 4;
}

export function getLocationDetails(buildingName) {
  if (!buildingName) return [];
  return [
    'Near entrance',
    ...Array.from({ length: guessFloorCount(buildingName) }, (_, index) => getFloorLabel(index + 1)),
  ];
}

export function findAreaForBuilding(buildingName) {
  return Object.entries(buildingsByArea).find(([, buildingNames]) => buildingNames.includes(buildingName))?.[0] || '';
}

export function composeLocation(area, building, detail) {
  if (!area) return '';
  if (!building) return area;
  if (!detail) return `${area} - ${building}`;
  return `${area} - ${building}, ${detail}`;
}

export function parseLocationParts(location) {
  const value = (location || '').trim();
  if (!value) return { area: '', building: '', detail: '' };

  for (const [area, buildingNames] of Object.entries(buildingsByArea)) {
    const prefix = `${area} - `;
    if (!value.startsWith(prefix)) continue;

    const rest = value.slice(prefix.length);
    const sortedBuildings = [...buildingNames].sort((first, second) => second.length - first.length);
    const building = sortedBuildings.find((candidate) => (
      rest === candidate || rest.startsWith(`${candidate}, `)
    ));

    if (!building) return { area, building: '', detail: '' };

    const detail = rest === building ? '' : rest.slice(building.length + 2);
    return { area, building, detail };
  }

  if (Object.prototype.hasOwnProperty.call(buildingsByArea, value)) {
    return { area: value, building: '', detail: '' };
  }

  return { area: '', building: '', detail: '' };
}

export function toCategoryOptions(categories) {
  if (!Array.isArray(categories) || categories.length === 0) return DEFAULT_CATEGORY_OPTIONS;
  return categories.map((category) => ({
    id: category.id,
    label: category.name,
  }));
}
