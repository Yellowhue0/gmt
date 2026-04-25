import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

export const DAY_NAMES = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag']

export function getDayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] ?? 'Okänd'
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatRelative(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'Just nu'
  if (minutes < 60) return `${minutes} min sedan`
  if (hours < 24) return `${hours} tim sedan`
  if (days < 7) return `${days} dagar sedan`
  return formatDate(d)
}

export function getSessionTypeLabel(type: string, t?: (key: string) => string): string {
  if (t) {
    const keyMap: Record<string, string> = {
      regular: 'type_regular',
      sparring: 'type_sparring',
      youth: 'type_youth',
      conditioning: 'type_conditioning',
      girls: 'type_girls',
    }
    const key = keyMap[type]
    if (key) return t(key as never)
  }
  const labels: Record<string, string> = {
    regular: 'Träning',
    sparring: 'Sparring',
    yoga: 'Yoga',
    youth: 'Ungdom',
    conditioning: 'Kondition',
    girls: 'Tjejklass',
  }
  return labels[type] ?? type
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    GENERAL: 'Allmänt',
    ANNOUNCEMENT: 'Meddelande',
    SPARRING: 'Sparring',
    QUESTION: 'Fråga',
  }
  return labels[category] ?? category
}

export function getEventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    COMPETITION: 'Tävling',
    FIGHT: 'Gala',
    SEMINAR: 'Seminarium',
    OTHER: 'Övrigt',
  }
  return labels[type] ?? type
}

export const SWISH_NUMBER = '123 456 789'
export const MEMBERSHIP_PRICE = 400
export const MEMBERSHIP_MONTHS = 3
