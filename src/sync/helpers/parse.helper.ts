export function parseBRDate(value: string): Date {
  const [day, month, year] = value.split('/');
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function parseBRL(value: string): number {
  return Number(
    value
      .replace(/\s/g, '') // remove spaces
      .replace('R$', '') // remove currency
      .replace(/\./g, '') // remove thousands separator
      .replace(',', '.') // convert decimal separator
  );
}
