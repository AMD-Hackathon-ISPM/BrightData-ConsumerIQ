export type MarketRegion =
  | 'Africa'
  | 'Asia'
  | 'Europe'
  | 'North America'
  | 'South America'
  | 'Oceania'

export type CountryOption = {
  name: string
  code: string
  region: MarketRegion
  currencyCode: string
  dataStatus: 'available' | 'unavailable'
}

export const COUNTRIES: CountryOption[] = [
  { name: 'South Africa', code: 'za', region: 'Africa', currencyCode: 'ZAR', dataStatus: 'available' },
  { name: 'Egypt', code: 'eg', region: 'Africa', currencyCode: 'EGP', dataStatus: 'available' },
  { name: 'Nigeria', code: 'ng', region: 'Africa', currencyCode: 'NGN', dataStatus: 'available' },
  { name: 'Morocco', code: 'ma', region: 'Africa', currencyCode: 'MAD', dataStatus: 'available' },
  { name: 'Kenya', code: 'ke', region: 'Africa', currencyCode: 'KES', dataStatus: 'unavailable' },
  { name: 'Ghana', code: 'gh', region: 'Africa', currencyCode: 'GHS', dataStatus: 'available' },
  { name: 'Algeria', code: 'dz', region: 'Africa', currencyCode: 'DZD', dataStatus: 'available' },
  { name: 'Tunisia', code: 'tn', region: 'Africa', currencyCode: 'TND', dataStatus: 'available' },
  { name: 'Ethiopia', code: 'et', region: 'Africa', currencyCode: 'ETB', dataStatus: 'unavailable' },
  { name: 'Tanzania', code: 'tz', region: 'Africa', currencyCode: 'TZS', dataStatus: 'unavailable' },

  { name: 'Japan', code: 'jp', region: 'Asia', currencyCode: 'JPY', dataStatus: 'available' },
  { name: 'India', code: 'in', region: 'Asia', currencyCode: 'INR', dataStatus: 'unavailable' },
  { name: 'Singapore', code: 'sg', region: 'Asia', currencyCode: 'SGD', dataStatus: 'available' },
  { name: 'United Arab Emirates', code: 'ae', region: 'Asia', currencyCode: 'AED', dataStatus: 'unavailable' },
  { name: 'Saudi Arabia', code: 'sa', region: 'Asia', currencyCode: 'SAR', dataStatus: 'unavailable' },
  { name: 'Turkey', code: 'tr', region: 'Asia', currencyCode: 'TRY', dataStatus: 'unavailable' },
  { name: 'China', code: 'cn', region: 'Asia', currencyCode: 'CNY', dataStatus: 'unavailable' },
  { name: 'South Korea', code: 'kr', region: 'Asia', currencyCode: 'KRW', dataStatus: 'unavailable' },
  { name: 'Indonesia', code: 'id', region: 'Asia', currencyCode: 'IDR', dataStatus: 'available' },
  { name: 'Thailand', code: 'th', region: 'Asia', currencyCode: 'THB', dataStatus: 'unavailable' },

  { name: 'Germany', code: 'de', region: 'Europe', currencyCode: 'EUR', dataStatus: 'available' },
  { name: 'United Kingdom', code: 'gb', region: 'Europe', currencyCode: 'GBP', dataStatus: 'available' },
  { name: 'France', code: 'fr', region: 'Europe', currencyCode: 'EUR', dataStatus: 'unavailable' },
  { name: 'Italy', code: 'it', region: 'Europe', currencyCode: 'EUR', dataStatus: 'unavailable' },
  { name: 'Spain', code: 'es', region: 'Europe', currencyCode: 'EUR', dataStatus: 'unavailable' },
  { name: 'Netherlands', code: 'nl', region: 'Europe', currencyCode: 'EUR', dataStatus: 'unavailable' },
  { name: 'Poland', code: 'pl', region: 'Europe', currencyCode: 'PLN', dataStatus: 'unavailable' },
  { name: 'Sweden', code: 'se', region: 'Europe', currencyCode: 'SEK', dataStatus: 'unavailable' },
  { name: 'Belgium', code: 'be', region: 'Europe', currencyCode: 'EUR', dataStatus: 'unavailable' },
  { name: 'Ireland', code: 'ie', region: 'Europe', currencyCode: 'EUR', dataStatus: 'unavailable' },

  { name: 'United States', code: 'us', region: 'North America', currencyCode: 'USD', dataStatus: 'available' },
  { name: 'Canada', code: 'ca', region: 'North America', currencyCode: 'CAD', dataStatus: 'available' },
  { name: 'Mexico', code: 'mx', region: 'North America', currencyCode: 'MXN', dataStatus: 'unavailable' },
  { name: 'Panama', code: 'pa', region: 'North America', currencyCode: 'PAB / USD', dataStatus: 'unavailable' },
  { name: 'Costa Rica', code: 'cr', region: 'North America', currencyCode: 'CRC', dataStatus: 'unavailable' },
  { name: 'Dominican Republic', code: 'do', region: 'North America', currencyCode: 'DOP', dataStatus: 'unavailable' },
  { name: 'Guatemala', code: 'gt', region: 'North America', currencyCode: 'GTQ', dataStatus: 'unavailable' },
  { name: 'Jamaica', code: 'jm', region: 'North America', currencyCode: 'JMD', dataStatus: 'unavailable' },
  { name: 'El Salvador', code: 'sv', region: 'North America', currencyCode: 'USD', dataStatus: 'unavailable' },
  { name: 'Honduras', code: 'hn', region: 'North America', currencyCode: 'HNL', dataStatus: 'unavailable' },

  { name: 'Brazil', code: 'br', region: 'South America', currencyCode: 'BRL', dataStatus: 'unavailable' },
  { name: 'Argentina', code: 'ar', region: 'South America', currencyCode: 'ARS', dataStatus: 'unavailable' },
  { name: 'Chile', code: 'cl', region: 'South America', currencyCode: 'CLP', dataStatus: 'unavailable' },
  { name: 'Colombia', code: 'co', region: 'South America', currencyCode: 'COP', dataStatus: 'unavailable' },
  { name: 'Peru', code: 'pe', region: 'South America', currencyCode: 'PEN', dataStatus: 'unavailable' },
  { name: 'Ecuador', code: 'ec', region: 'South America', currencyCode: 'USD', dataStatus: 'unavailable' },
  { name: 'Uruguay', code: 'uy', region: 'South America', currencyCode: 'UYU', dataStatus: 'unavailable' },
  { name: 'Paraguay', code: 'py', region: 'South America', currencyCode: 'PYG', dataStatus: 'unavailable' },
  { name: 'Bolivia', code: 'bo', region: 'South America', currencyCode: 'BOB', dataStatus: 'unavailable' },
  { name: 'Venezuela', code: 've', region: 'South America', currencyCode: 'VES', dataStatus: 'unavailable' },

  { name: 'Australia', code: 'au', region: 'Oceania', currencyCode: 'AUD', dataStatus: 'available' },
  { name: 'New Zealand', code: 'nz', region: 'Oceania', currencyCode: 'NZD', dataStatus: 'unavailable' },
]

export function getCountryCurrency(countryName: string) {
  return (
    COUNTRIES.find((country) => country.name === countryName)?.currencyCode ??
    'Currency'
  )
}
