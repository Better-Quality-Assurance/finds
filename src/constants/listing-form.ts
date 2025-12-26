/**
 * Consolidated constants for listing form components
 * Shared across all listing step components
 */

import type { PhotoCategory } from '@/domain/listing/rules'

// Vehicle Categories
export const CATEGORIES = [
  { value: 'CLASSIC_CAR', label: 'Classic Car' },
  { value: 'RETRO_CAR', label: 'Retro Car' },
  { value: 'BARN_FIND', label: 'Barn Find' },
  { value: 'PROJECT_CAR', label: 'Project Car' },
  { value: 'MOTORCYCLE', label: 'Motorcycle' },
  { value: 'PARTS', label: 'Parts' },
  { value: 'MEMORABILIA', label: 'Memorabilia' },
] as const

export const CATEGORY_LABELS: Record<string, string> = {
  CLASSIC_CAR: 'Classic Car',
  RETRO_CAR: 'Retro Car',
  BARN_FIND: 'Barn Find',
  PROJECT_CAR: 'Project Car',
  MOTORCYCLE: 'Motorcycle',
  PARTS: 'Parts',
  MEMORABILIA: 'Memorabilia',
}

// Common Vehicle Makes
export const COMMON_MAKES = [
  'Alfa Romeo', 'Aston Martin', 'Audi', 'Austin', 'BMW', 'Bentley',
  'Buick', 'Cadillac', 'Chevrolet', 'Chrysler', 'Citroën', 'Dacia',
  'Datsun', 'Dodge', 'Fiat', 'Ford', 'Honda', 'Jaguar', 'Jeep',
  'Lada', 'Lancia', 'Land Rover', 'Lincoln', 'Lotus', 'Maserati',
  'Mazda', 'Mercedes-Benz', 'MG', 'Mini', 'Mitsubishi', 'Morgan',
  'Moskvitch', 'Nissan', 'Oldsmobile', 'Opel', 'Peugeot', 'Plymouth',
  'Pontiac', 'Porsche', 'Renault', 'Rolls-Royce', 'Rover', 'Saab',
  'Seat', 'Skoda', 'Studebaker', 'Subaru', 'Sunbeam', 'Suzuki',
  'Toyota', 'Trabant', 'Triumph', 'Vauxhall', 'Volkswagen', 'Volvo',
  'Wartburg', 'Zastava', 'Other',
] as const

// Condition Ratings (1-10 scale)
export const CONDITION_RATINGS = [
  { value: 1, label: '1 - Parts only' },
  { value: 2, label: '2 - Heavily deteriorated' },
  { value: 3, label: '3 - Major restoration needed' },
  { value: 4, label: '4 - Restoration project' },
  { value: 5, label: '5 - Running but needs work' },
  { value: 6, label: '6 - Driver quality' },
  { value: 7, label: '7 - Good condition' },
  { value: 8, label: '8 - Very good condition' },
  { value: 9, label: '9 - Excellent condition' },
  { value: 10, label: '10 - Concours/Show quality' },
] as const

export const CONDITION_LABELS: Record<number, string> = {
  1: '1 - Parts only',
  2: '2 - Heavily deteriorated',
  3: '3 - Major restoration needed',
  4: '4 - Restoration project',
  5: '5 - Running but needs work',
  6: '6 - Driver quality',
  7: '7 - Good condition',
  8: '8 - Very good condition',
  9: '9 - Excellent condition',
  10: '10 - Concours/Show quality',
}

// EU Countries
export const EU_COUNTRIES = [
  { code: 'RO', name: 'Romania' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EE', name: 'Estonia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IT', name: 'Italy' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MT', name: 'Malta' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'NO', name: 'Norway' },
] as const

export const COUNTRY_NAMES: Record<string, string> = {
  RO: 'Romania',
  AT: 'Austria',
  BE: 'Belgium',
  BG: 'Bulgaria',
  HR: 'Croatia',
  CY: 'Cyprus',
  CZ: 'Czech Republic',
  DK: 'Denmark',
  EE: 'Estonia',
  FI: 'Finland',
  FR: 'France',
  DE: 'Germany',
  GR: 'Greece',
  HU: 'Hungary',
  IE: 'Ireland',
  IT: 'Italy',
  LV: 'Latvia',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  MT: 'Malta',
  NL: 'Netherlands',
  PL: 'Poland',
  PT: 'Portugal',
  SK: 'Slovakia',
  SI: 'Slovenia',
  ES: 'Spain',
  SE: 'Sweden',
  GB: 'United Kingdom',
  CH: 'Switzerland',
  NO: 'Norway',
}

// Currencies
export const CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
] as const

// Photo Categories
export const PHOTO_CATEGORY_LABELS: Record<PhotoCategory, string> = {
  exterior_front: 'Exterior - Front',
  exterior_rear: 'Exterior - Rear',
  exterior_left: 'Exterior - Left Side',
  exterior_right: 'Exterior - Right Side',
  exterior_detail: 'Exterior - Detail',
  interior_dashboard: 'Interior - Dashboard',
  interior_front_seats: 'Interior - Front Seats',
  interior_rear_seats: 'Interior - Rear Seats',
  interior_detail: 'Interior - Detail',
  engine_bay: 'Engine Bay',
  engine_detail: 'Engine - Detail',
  underbody: 'Underbody',
  trunk: 'Trunk',
  wheels: 'Wheels',
  vin_plate: 'VIN Plate',
  documentation: 'Documentation',
  defects: 'Defects/Issues',
  other: 'Other',
}
