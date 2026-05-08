export const DEMO_PASSWORD = "Password123!";

export type DemoAccount = {
  email: string;
  name: string;
  detail?: string;
};

export const DEMO_HOSTS: DemoAccount[] = [
  { email: "host.alice@demo.commuvent.app", name: "Alice Chen", detail: "Acme Tech Talks" },
  { email: "host.bob@demo.commuvent.app", name: "Bob Rivera", detail: "Trailblazers Outdoors" },
  { email: "host.clara@demo.commuvent.app", name: "Clara Moreno", detail: "Culinary Collective" },
];

export const DEMO_CHECKERS: DemoAccount[] = [
  { email: "checker.dan@demo.commuvent.app", name: "Dan Park", detail: "Acme Tech Talks" },
  { email: "checker.eve@demo.commuvent.app", name: "Eve Larsen", detail: "Trailblazers Outdoors" },
  { email: "checker.finn@demo.commuvent.app", name: "Finn O'Hara", detail: "Culinary Collective" },
];

export const DEMO_ATTENDEES: DemoAccount[] = [
  { email: "att.gina@demo.commuvent.app", name: "Gina Suzuki" },
  { email: "att.henry@demo.commuvent.app", name: "Henry Adler" },
  { email: "att.ivy@demo.commuvent.app", name: "Ivy Patel" },
  { email: "att.jack@demo.commuvent.app", name: "Jack Nguyen" },
  { email: "att.kate@demo.commuvent.app", name: "Kate Müller" },
  { email: "att.liam@demo.commuvent.app", name: "Liam Walsh" },
  { email: "att.mia@demo.commuvent.app", name: "Mia Rossi" },
  { email: "att.noah@demo.commuvent.app", name: "Noah Becker" },
];
