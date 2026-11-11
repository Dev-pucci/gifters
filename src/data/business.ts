// Business details shown on the Contact, Privacy and Terms pages.
// ⚠ Replace every value marked TODO with your real details before launch.

export const business = {
  name: "Heartfelt Gifts",
  /** TODO: registered business / company name. */
  legalName: "Heartfelt Gifts",
  /** TODO: your real support inbox. */
  email: "hello@heartfeltgifts.example",
  /** TODO: your real support number (also used for WhatsApp). */
  phone: "+254 700 000 000",
  whatsapp: "254700000000",
  /** TODO: your registered address. */
  address: "Nairobi, Kenya",
  hours: "Monday–Friday 8:00–18:00, Saturday 9:00–14:00 (EAT)",
  responseTime: "within one business day",
  /** Country whose law governs the Terms. */
  jurisdiction: "Kenya",
  /** Date the Privacy Policy and Terms were last revised. */
  policiesUpdated: "10 November 2026",
  /** Days after delivery to report a problem under the Love-It Guarantee. */
  guaranteeDays: 30,
  /** Hours after payment during which an order can still be changed or canceled. */
  changeWindowHours: 12,
} as const;

/** Countries offered at checkout (and listed on the Shipping page). */
export const SHIPS_TO = ["Kenya", "United States", "United Kingdom", "Canada", "Uganda", "Tanzania", "Nigeria", "South Africa", "Germany", "Australia"] as const;
