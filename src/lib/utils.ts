import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts kilometers to miles
 * @param km - Distance in kilometers
 * @returns Distance in miles
 */
export function kmToMiles(km: number): number {
  return km * 0.621371
}

/**
 * Converts miles to kilometers
 * @param miles - Distance in miles
 * @returns Distance in kilometers
 */
export function milesToKm(miles: number): number {
  return miles / 0.621371
}

/**
 * Formats a distance value with the appropriate unit label
 * @param distance - Distance value
 * @param unit - Unit to display ("km" or "miles")
 * @returns Formatted string with distance and unit
 */
export function formatDistance(distance: number, unit: "km" | "miles"): string {
  const rounded = Math.round(distance * 10) / 10
  const unitLabel = unit === "km" ? "km" : "mi"
  return `${rounded}${unitLabel}`
}

/**
 * Formats a week date range for display
 * @param startDate - Start date of the week (YYYY-MM-DD format)
 * @returns Formatted string like "Jan 1-7" or "Jan 1 - Feb 7" for cross-month weeks
 */
export function formatWeekDateRange(startDate: string): string {
  const start = new Date(startDate)
  const end = new Date(start)
  end.setDate(end.getDate() + 6) // Add 6 days to get end of week

  const startMonth = start.toLocaleDateString("en-US", { month: "short" })
  const startDay = start.getDate()
  const endMonth = end.toLocaleDateString("en-US", { month: "short" })
  const endDay = end.getDate()

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`
  } else {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`
  }
}
