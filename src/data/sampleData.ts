import { SamplePreset } from '../types';

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'country-validation-demo',
    name: 'Company & Country Validation',
    description: 'Demonstrates 2-column Query List (Table 1) matching against Target Master List (Table 2) with country matching and mismatch detection.',
    table1: [
      'Netfix | United States', // Matches Netflix Inc. (USA) -> MATCH!
      'Tesla Motors | United States', // Matches Tesla Inc. (USA) -> MATCH!
      'Apple | United States', // Matches Apple Inc. (USA) -> MATCH!
      'Google | United States', // Matches Google LLC (USA) -> MATCH!
      'Spotify | Philippines', // Real country is Sweden -> MISMATCH: COUNTRY!
      'Manila Electric | Philippines', // Meralco (Philippines) -> MATCH!
      'Microsft | United States' // Matches Microsoft Corp (USA) -> MATCH!
    ],
    table2: [
      'Netflix Inc. | United States',
      'Tesla Inc. | United States',
      'Apple Inc. | United States',
      'Google LLC | United States',
      'Spotify Technology S.A. | Sweden',
      'Manila Electric Company (Meralco) | Philippines',
      'Microsoft Corp | United States'
    ]
  },
  {
    id: 'tech-giants',
    name: 'Global Tech Giants',
    description: 'Compares tech query names with countries against Target Master List.',
    table1: [
      'Apple | United States',
      'Google | United States',
      'Microsft | United States',
      'Amazn | United States',
      'Meta | United States',
      'Spotfy | Sweden',
      'Nvidia | United States',
      'Adobe | United States'
    ],
    table2: [
      'Apple Inc. | United States',
      'Google LLC | United States',
      'Microsoft Corp | United States',
      'Amazon.com Inc. | United States',
      'Meta Platforms Inc. | United States',
      'Spotify Technology S.A. | Sweden',
      'NVIDIA Corporation | United States',
      'Adobe Inc. | United States'
    ]
  },
  {
    id: 'ph-conglomerates',
    name: 'Philippine Conglomerates & Utilities',
    description: 'Philippine enterprises and utilities demonstrating multi-name fuzzy matching.',
    table1: [
      'Jollibee | Philippines',
      'Ayala Corp | Philippines',
      'San Miguel | Philippines',
      'Meralco | Philippines',
      'PLDT | Philippines',
      'Globe Telecom | Philippines'
    ],
    table2: [
      'Jollibee Foods Corporation | Philippines',
      'Ayala Corporation | Philippines',
      'San Miguel Corporation | Philippines',
      'Manila Electric Company (Meralco) | Philippines',
      'PLDT Inc. | Philippines',
      'Globe Telecom Inc. | Philippines'
    ]
  },
  {
    id: 'simple-names',
    name: 'Simple Company Queries',
    description: 'Clean list of company queries matched against the Target Master List.',
    table1: [
      'Apple | United States',
      'Google | United States',
      'Microsft | United States',
      'Amazon | United States',
      'Meta | United States',
      'Tesla | United States'
    ],
    table2: [
      'Apple Inc. | United States',
      'Google LLC | United States',
      'Microsoft Corp | United States',
      'Amazon.com Inc. | United States',
      'Meta Platforms Inc. | United States',
      'Tesla Inc. | United States'
    ]
  }
];
