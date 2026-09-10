import { SamplePreset } from '../types';

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'tech-giants',
    name: 'Tech Giants & Typo Queries',
    description: 'Classic benchmark comparing formal legal company names against common typos and abbreviations.',
    table1: [
      'Apple Inc.',
      'Google LLC',
      'Microsoft Corp',
      'Amazon.com Inc.',
      'Meta Platforms Inc.',
      'Netflix Inc.',
      'NVIDIA Corporation',
      'Tesla Inc.',
      'Salesforce Inc.',
      'Adobe Inc.',
      'Oracle Corporation',
      'Intel Corporation',
      'IBM',
      'Spotify Technology S.A.',
      'Uber Technologies Inc.',
      'Airbnb Inc.'
    ],
    table2: [
      'Apple',
      'Google',
      'Microsft',
      'Amazn',
      'Meta',
      'Netfix',
      'Nvidia Corp',
      'Tesla Motors',
      'Salesforce',
      'Adobe Systems',
      'Oracel',
      'Intell',
      'International Business Machines',
      'Spotfy',
      'Uber'
    ]
  },
  {
    id: 'consulting-finance',
    name: 'Global Finance & Consulting',
    description: 'Financial institutions, investment banking, and management consulting benchmarks.',
    table1: [
      'JPMorgan Chase & Co.',
      'Goldman Sachs Group Inc.',
      'Morgan Stanley',
      'Bank of America Corp',
      'Citigroup Inc.',
      'Accenture PLC',
      'Deloitte Touche Tohmatsu LLC',
      'PricewaterhouseCoopers LLP',
      'Ernst & Young Global Limited',
      'KPMG International Limited',
      'McKinsey & Company',
      'Boston Consulting Group'
    ],
    table2: [
      'JP Morgan',
      'Goldman Sachs',
      'Morgan Stanly',
      'BofA',
      'Citi',
      'Accenture',
      'Deloitte',
      'PwC',
      'EY',
      'KPMG',
      'McKinsey',
      'BCG'
    ]
  },
  {
    id: 'ph-conglomerates',
    name: 'Philippine Conglomerates (Local Benchmark)',
    description: 'Regional corporate entities matching colloquial abbreviations against master SEC registrants.',
    table1: [
      'Jollibee Foods Corporation',
      'Ayala Corporation',
      'San Miguel Corporation',
      'SM Investments Corporation',
      'BDO Unibank Inc.',
      'Bank of the Philippine Islands',
      'PLDT Inc.',
      'Globe Telecom Inc.',
      'Manila Electric Company (Meralco)',
      'Aboitiz Equity Ventures Inc.'
    ],
    table2: [
      'Jollibee',
      'Ayala Corp',
      'San Miguel',
      'SM Investments',
      'BDO',
      'BPI',
      'PLDT',
      'Globe',
      'Meralco',
      'Aboitiz'
    ]
  }
];
