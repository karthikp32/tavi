export function validateArrivalWindow(start: string, end: string): string | undefined {
  if (start && end && new Date(end) <= new Date(start)) {
    return "Arrival window end must be after the start";
  }
  return undefined;
}
