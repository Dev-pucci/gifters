// Customer testimonials for the homepage "Made With Love, Received With Joy" section.
//
// Add REAL reviews here (with the customer's permission) — e.g.
//   { quote: "…", name: "Wanjiru K.", location: "Nairobi", rating: 5 },
// The section is hidden from shoppers while this list is empty. During development it shows
// clearly-labelled samples so you can see the layout; those are never shown in production.

export interface Testimonial {
  quote: string;
  name: string;
  location: string;
  rating: 1 | 2 | 3 | 4 | 5;
}

export const testimonials: Testimonial[] = [];

/** Layout preview only (development builds). Not real customers. */
export const sampleTestimonials: Testimonial[] = [
  { quote: "Sample review — replace with a real customer's words about quality and packaging.", name: "Sample Customer", location: "City", rating: 5 },
  { quote: "Sample review — replace with a real customer's words about delivery and service.", name: "Sample Customer", location: "City", rating: 5 },
  { quote: "Sample review — replace with a real customer's words about finding the perfect gift.", name: "Sample Customer", location: "City", rating: 5 },
];
