/**
 * Seed events mirroring what runs on fleg.in today, shaped like ./events-live.
 * Replaced by the `events_v_public` read-view at cutover; screens never import this.
 */
import type { EventSummary, EventDetail } from "./events-live";

export const SEED_EVENTS: EventSummary[] = [
  {
    slug: "nspg26", title: "Nagaland State & Para Games 2026", kind: "tournament", sport: null,
    status: "upcoming", startDate: "2026-11-02T09:00:00+05:30", city: "Chümoukedima", venue: "Multiple venues",
    bannerUrl: null, paid: false, priceFrom: null, isNspg: true, organiser: "Nagaland Olympic Association",
  },
  {
    slug: "rmlcf-pickleball", title: "RMLCF Pickleball Fundraiser", kind: "fundraiser", sport: "pickleball",
    status: "past", startDate: "2026-09-28T08:00:00+05:30", city: "Kohima", venue: "Kohima",
    bannerUrl: null, paid: true, priceFrom: 500, isNspg: false, organiser: "RMLCF",
  },
  {
    slug: "coffee-run-2", title: "Coffee Run 2.0", kind: "run", sport: "running",
    status: "registration_open", startDate: "2026-10-25T15:00:00+05:30", city: "Dimapur", venue: "Papershop Brews, Duncan",
    bannerUrl: null, paid: true, priceFrom: 399, isNspg: false, organiser: "Dash Nation × Papershop",
  },
  {
    slug: "amateur-weekend-league-awl", title: "Amateur Weekend League", kind: "league", sport: "futsal",
    status: "live", startDate: "2026-10-18T17:30:00+05:30", city: "Dimapur", venue: "Genesis Grounds",
    bannerUrl: null, paid: false, priceFrom: null, isNspg: false, organiser: "Amateur Weekend League",
  },
  {
    slug: "womens-pickleball-clinic", title: "Women's Pickleball Clinic", kind: "clinic", sport: "pickleball",
    status: "past", startDate: "2026-09-23T09:00:00+05:30", city: "Kohima", venue: "Kohima",
    bannerUrl: null, paid: false, priceFrom: null, isNspg: false, organiser: "FLEG",
  },
  {
    slug: "one-nagaland-run", title: "One Nagaland Run", kind: "run", sport: "running",
    status: "past", startDate: "2026-09-12T05:30:00+05:30", city: "Kohima", venue: "Kohima",
    bannerUrl: null, paid: true, priceFrom: 500, isNspg: false, organiser: "FLEG",
  },
  {
    slug: "nagaland-darts", title: "Nagaland Darts Championship 2026", kind: "tournament", sport: "darts",
    status: "past", startDate: "2026-08-21T08:41:50+05:30", city: "Dimapur", venue: "Hotel Saramati",
    bannerUrl: null, paid: true, priceFrom: 300, isNspg: false, organiser: "Nagaland Darts Association",
  },
];

export const SEED_EVENT_DETAIL: Record<string, EventDetail> = {
  "nagaland-darts": {
    ...SEED_EVENTS[3],
    description: "Open singles darts tournament. All skill levels welcome.",
    rules: "501 double-out, best of 5 legs from quarter-finals.",
    importantNotes: "Report 30 minutes before your scheduled match.",
    categories: [{ id: "open", name: "Open Singles", price: 300 }],
    requiresLogin: true, registrationCloseAt: "2026-12-04T18:00:00+05:30",
  },
  "coffee-run-2": {
    ...SEED_EVENTS[2],
    description: "A feel-good 8K social run through Dimapur, followed by fresh Papershop brews.",
    rules: null,
    importantNotes: "Limited to 60 runners. Goodie bag for all registered runners.",
    categories: [{ id: "8k", name: "8K social run", price: 399 }],
    requiresLogin: true, registrationCloseAt: "2026-10-24T18:30:00+05:30",
  },
  "amateur-weekend-league-awl": {
    ...SEED_EVENTS[3],
    description: "Eight teams compete in a 14-gameweek Friday-night futsal league.",
    rules: "Double round-robin league. Follow fixtures, live scores, and the table on FLEG.",
    importantNotes: "Genesis Grounds, Dimapur.",
    categories: [],
    requiresLogin: false, registrationCloseAt: null,
  },
  "womens-pickleball-clinic": {
    ...SEED_EVENTS[4],
    description: "Beginner-friendly coaching clinic for women.",
    rules: null, importantNotes: "Paddles provided. Wear court shoes.",
    categories: [{ id: "adult", name: "Adult clinic", price: 0 }, { id: "kids", name: "Kids clinic", price: 0 }],
    requiresLogin: true, registrationCloseAt: "2026-11-20T18:00:00+05:30",
  },
};
