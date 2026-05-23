export type MarketRegion =
  | 'Africa'
  | 'Asia'
  | 'Europe'
  | 'North America'
  | 'South America'
  | 'Oceania'
  | 'Antarctica'

export type CountryOption = {
  name: string
  region: MarketRegion
  currencyCode: string
}

export const COUNTRIES: CountryOption[] = [
  { name: 'South Africa', region: 'Africa', currencyCode: 'ZAR' },
  { name: 'Egypt', region: 'Africa', currencyCode: 'EGP' },
  { name: 'Nigeria', region: 'Africa', currencyCode: 'NGN' },
  { name: 'Morocco', region: 'Africa', currencyCode: 'MAD' },
  { name: 'Kenya', region: 'Africa', currencyCode: 'KES' },
  { name: 'Ghana', region: 'Africa', currencyCode: 'GHS' },
  { name: 'Algeria', region: 'Africa', currencyCode: 'DZD' },
  { name: 'Tunisia', region: 'Africa', currencyCode: 'TND' },
  { name: 'Ethiopia', region: 'Africa', currencyCode: 'ETB' },
  { name: 'Tanzania', region: 'Africa', currencyCode: 'TZS' },

  { name: 'Japan', region: 'Asia', currencyCode: 'JPY' },
  { name: 'India', region: 'Asia', currencyCode: 'INR' },
  { name: 'Singapore', region: 'Asia', currencyCode: 'SGD' },
  { name: 'United Arab Emirates', region: 'Asia', currencyCode: 'AED' },
  { name: 'Saudi Arabia', region: 'Asia', currencyCode: 'SAR' },
  { name: 'Turkey', region: 'Asia', currencyCode: 'TRY' },
  { name: 'China', region: 'Asia', currencyCode: 'CNY' },
  { name: 'South Korea', region: 'Asia', currencyCode: 'KRW' },
  { name: 'Indonesia', region: 'Asia', currencyCode: 'IDR' },
  { name: 'Thailand', region: 'Asia', currencyCode: 'THB' },

  { name: 'Germany', region: 'Europe', currencyCode: 'EUR' },
  { name: 'United Kingdom', region: 'Europe', currencyCode: 'GBP' },
  { name: 'France', region: 'Europe', currencyCode: 'EUR' },
  { name: 'Italy', region: 'Europe', currencyCode: 'EUR' },
  { name: 'Spain', region: 'Europe', currencyCode: 'EUR' },
  { name: 'Netherlands', region: 'Europe', currencyCode: 'EUR' },
  { name: 'Poland', region: 'Europe', currencyCode: 'PLN' },
  { name: 'Sweden', region: 'Europe', currencyCode: 'SEK' },
  { name: 'Belgium', region: 'Europe', currencyCode: 'EUR' },
  { name: 'Ireland', region: 'Europe', currencyCode: 'EUR' },

  { name: 'United States', region: 'North America', currencyCode: 'USD' },
  { name: 'Canada', region: 'North America', currencyCode: 'CAD' },
  { name: 'Mexico', region: 'North America', currencyCode: 'MXN' },
  { name: 'Panama', region: 'North America', currencyCode: 'PAB / USD' },
  { name: 'Costa Rica', region: 'North America', currencyCode: 'CRC' },
  { name: 'Dominican Republic', region: 'North America', currencyCode: 'DOP' },
  { name: 'Guatemala', region: 'North America', currencyCode: 'GTQ' },
  { name: 'Jamaica', region: 'North America', currencyCode: 'JMD' },
  { name: 'El Salvador', region: 'North America', currencyCode: 'USD' },
  { name: 'Honduras', region: 'North America', currencyCode: 'HNL' },

  { name: 'Brazil', region: 'South America', currencyCode: 'BRL' },
  { name: 'Argentina', region: 'South America', currencyCode: 'ARS' },
  { name: 'Chile', region: 'South America', currencyCode: 'CLP' },
  { name: 'Colombia', region: 'South America', currencyCode: 'COP' },
  { name: 'Peru', region: 'South America', currencyCode: 'PEN' },
  { name: 'Ecuador', region: 'South America', currencyCode: 'USD' },
  { name: 'Uruguay', region: 'South America', currencyCode: 'UYU' },
  { name: 'Paraguay', region: 'South America', currencyCode: 'PYG' },
  { name: 'Bolivia', region: 'South America', currencyCode: 'BOB' },
  { name: 'Venezuela', region: 'South America', currencyCode: 'VES' },

  { name: 'Australia', region: 'Oceania', currencyCode: 'AUD' },
  { name: 'New Zealand', region: 'Oceania', currencyCode: 'NZD' },
  { name: 'Papua New Guinea', region: 'Oceania', currencyCode: 'PGK' },
  { name: 'Fiji', region: 'Oceania', currencyCode: 'FJD' },
  { name: 'Samoa', region: 'Oceania', currencyCode: 'WST' },
  { name: 'Tonga', region: 'Oceania', currencyCode: 'TOP' },
  { name: 'Vanuatu', region: 'Oceania', currencyCode: 'VUV' },
  { name: 'Solomon Islands', region: 'Oceania', currencyCode: 'SBD' },
  { name: 'Kiribati', region: 'Oceania', currencyCode: 'AUD' },
  { name: 'Micronesia', region: 'Oceania', currencyCode: 'USD' },

  { name: 'Antarctica', region: 'Antarctica', currencyCode: 'No official currency' },
]

export function getCountryCurrency(countryName: string) {
  return (
    COUNTRIES.find((country) => country.name === countryName)?.currencyCode ??
    'Currency'
  )
}
