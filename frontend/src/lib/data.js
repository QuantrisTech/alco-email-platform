const avatarColors = [
  "bg-[oklch(0.55_0.18_290)]",
  "bg-[oklch(0.6_0.13_200)]",
  "bg-[oklch(0.62_0.15_150)]",
  "bg-[oklch(0.65_0.15_40)]",
  "bg-[oklch(0.55_0.15_20)]",
  "bg-[oklch(0.5_0.12_260)]",
]

export function avatarColor(seed) {
  let sum = 0
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i)
  return avatarColors[sum % avatarColors.length]
}

export function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("")
}

export const contacts = [
  { id: "1", name: "Nida Akhtar", email: "nidaakhtar2629@gmail.com", batch: "Spring 2025", course: "Full Stack", status: "active", addedAt: "2025-01-12" },
  { id: "2", name: "Esha Ch", email: "chesha265@gmail.com", batch: "Spring 2025", course: "UI/UX Design", status: "active", addedAt: "2025-01-14" },
  { id: "3", name: "Rohma Safi", email: "rohmasafi20@gmail.com", batch: "Winter 2024", course: "Data Science", status: "active", addedAt: "2025-01-15" },
  { id: "4", name: "Wajiha Butt", email: "wajihajawedbutt@gmail.com", batch: "Winter 2024", course: "Full Stack", status: "active", addedAt: "2025-01-16" },
  { id: "5", name: "Ahmed Raza", email: "ahmed.raza@gmail.com", batch: "Spring 2025", course: "Cloud & DevOps", status: "active", addedAt: "2025-01-18" },
  { id: "6", name: "Sana Malik", email: "sana.malik@outlook.com", batch: "Winter 2024", course: "UI/UX Design", status: "unsubscribed", addedAt: "2025-01-20" },
  { id: "7", name: "Bilal Hussain", email: "bilal.h@gmail.com", batch: "Spring 2025", course: "Data Science", status: "active", addedAt: "2025-01-22" },
  { id: "8", name: "Zoya Khan", email: "zoya.khan@gmail.com", batch: "Fall 2024", course: "Full Stack", status: "bounced", addedAt: "2025-01-25" },
]

export const stats = {
  totalContacts: 1551,
  activeContacts: 1543,
  unsubscribed: 8,
  templates: 6,
  campaigns: 4,
  automations: 3,
  openRate: 48.2,
  clickRate: 12.7,
  deliveredRate: 98.4,
}

export const templates = [
  { id: "1", name: "Welcome Testing", subject: "Welcome to the course", preview: "Hi {name}, Welcome to our course. We are thrilled to have you on board and can’t wait to get started.", variables: ["name"], updatedAt: "2025-01-20", usageCount: 214 },
  { id: "2", name: "Course Reminder", subject: "Your {course} class starts soon", preview: "Hey {name}, a quick reminder that your {course} session begins tomorrow at {time}.", variables: ["name", "course", "time"], updatedAt: "2025-01-18", usageCount: 132 },
  { id: "3", name: "Payment Receipt", subject: "Payment received — thank you!", preview: "Hi {name}, we’ve received your payment of {amount} for {course}. Your seat is confirmed.", variables: ["name", "amount", "course"], updatedAt: "2025-01-15", usageCount: 89 },
  { id: "4", name: "Re-engagement", subject: "We miss you, {name}", preview: "It’s been a while! Come back and continue your learning journey with a special offer.", variables: ["name"], updatedAt: "2025-01-10", usageCount: 47 },
]

export const campaigns = [
  { id: "1", name: "Spring 2025 Onboarding", template: "Welcome Testing", audience: "Spring 2025 · Active", recipients: 642, status: "sent", openRate: 52.4, clickRate: 14.1, date: "2025-01-19" },
  { id: "2", name: "Full Stack Class Reminder", template: "Course Reminder", audience: "Full Stack · Active", recipients: 318, status: "scheduled", openRate: null, clickRate: null, date: "2025-01-28" },
  { id: "3", name: "January Re-engagement", template: "Re-engagement", audience: "Inactive 30d+", recipients: 205, status: "draft", openRate: null, clickRate: null, date: "2025-01-30" },
  { id: "4", name: "Payment Confirmations", template: "Payment Receipt", audience: "New enrolments", recipients: 74, status: "sending", openRate: 41.9, clickRate: 9.8, date: "2025-01-24" },
]

export const automations = [
  { id: "1", name: "Welcome to AL&Co Family", trigger: "New Contact (Webhook)", template: "Welcome Testing", active: true, enrolled: 1551, sent: 1487 },
  { id: "2", name: "Class Reminder — 24h before", trigger: "Course scheduled", template: "Course Reminder", active: true, enrolled: 318, sent: 296 },
  { id: "3", name: "Win-back inactive students", trigger: "No activity 30 days", template: "Re-engagement", active: false, enrolled: 205, sent: 0 },
]

export const performanceData = [
  { month: "Aug", sent: 820, opened: 390, clicked: 96 },
  { month: "Sep", sent: 940, opened: 461, clicked: 118 },
  { month: "Oct", sent: 1120, opened: 574, clicked: 149 },
  { month: "Nov", sent: 1310, opened: 655, clicked: 172 },
  { month: "Dec", sent: 1480, opened: 762, clicked: 201 },
  { month: "Jan", sent: 1620, opened: 848, clicked: 226 },
]

export const engagementData = [
  { name: "Opened", value: 848 },
  { name: "Clicked", value: 226 },
  { name: "No action", value: 546 },
]

export const recentCampaigns = campaigns.filter((c) => c.status === "sent" || c.status === "sending")