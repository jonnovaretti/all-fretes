const FALLBACK_YEAR = 1900;

function createFallbackDate(): Date {
  return new Date(FALLBACK_YEAR, 0, 1, 0, 0, 0, 0);
}

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

export function parseBRDate(dateToConvert: string): Date {
  const match = dateToConvert.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return createFallbackDate();

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const convertedDate = new Date(year, month - 1, day, 0, 0, 0, 0);

  // Reject rolled-over dates like 31/02/2026.
  if (
    !isValidDate(convertedDate) ||
    convertedDate.getFullYear() !== year ||
    convertedDate.getMonth() !== month - 1 ||
    convertedDate.getDate() !== day
  ) {
    return createFallbackDate();
  }

  return convertedDate;
}

export function parseBRDateTime(dateStr: string, timeStr: string): Date {
  const parsedDate = parseBRDate(dateStr);
  if (parsedDate.getFullYear() === FALLBACK_YEAR) {
    return parsedDate;
  }

  const timeMatch = timeStr?.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) return parsedDate;

  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (hour > 23 || minute > 59) {
    return parsedDate;
  }

  const result = new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate(),
    hour,
    minute,
    0,
    0,
  );

  return isValidDate(result) ? result : createFallbackDate();
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
