export function parseBRDate(dateToConvert: string): Date {
  try {
    const [day, month, year] = dateToConvert.split('/');
    return new Date(Number(year), Number(month) - 1, Number(day));
  } catch {
    return new Date(1900, 1, 1);
  }
}

export function parseBRDateTime(dateStr: string, timeStr: string): Date {
  const [day, month, year] = dateStr.split('/').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function parseBRL(value: string): number {
  return Number(
    value
      .replace(/\s/g, '') // remove spaces
      .replace('R$', '') // remove currency
      .replace(/\./g, '') // remove thousands separator
      .replace(',', '.'), // convert decimal separator
  );
}
