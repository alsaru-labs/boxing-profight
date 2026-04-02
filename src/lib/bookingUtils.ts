/**
 * Checks if a class is cancellable based on the strict policy:
 * "The student is allowed to cancel their reservation up to 1 minute before the start of the class."
 * 
 * @param dateStr Date string in YYYY-MM-DD or ISO format
 * @param timeStr Time string in "HH:MM - HH:MM" format
 * @param now Current Date object
 * @returns boolean true if cancellable, false otherwise
 */
export function isCancellable(dateStr: string, timeStr: string, now: Date): boolean {
  try {
    const [year, month, day] = dateStr.substring(0, 10).split("-").map(Number);
    const startTimeStr = timeStr.split('-')[0].trim();
    const [hours, minutes] = startTimeStr.split(":").map(Number);
    
    // Class start time
    const classStart = new Date(year, month - 1, day, hours, minutes);
    
    // Policy: at least 1 minute (60,000 ms) before start
    const limit = classStart.getTime() - 60000;
    
    return now.getTime() < limit;
  } catch (error) {
    console.error("Error parsing class date/time in isCancellable:", error);
    return false;
  }
}
