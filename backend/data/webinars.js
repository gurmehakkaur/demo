// Hardcoded webinars + in-memory registrations — no database
// Mutate these arrays directly (they persist for the lifetime of the server process)

const webinars = [
  {
    id: 1,
    title: "Express Entry 2026 Updates",
    description: "A deep dive into the latest Express Entry draw changes, CRS score trends, and what applicants should expect in 2026.",
    host_id: 2,
    scheduled_time: "2026-03-28T15:00:00Z",
    status: "SCHEDULED",
  },
  {
    id: 2,
    title: "Study Permit: Common Mistakes",
    description: "Immigration lawyer Sarah Chen covers the top 10 mistakes on study permit applications and how to avoid them.",
    host_id: 2,
    scheduled_time: "2026-04-05T17:00:00Z",
    status: "DRAFT",
  },
];

const registrations = [];

let nextWebinarId = 3;
let nextRegistrationId = 1;

function getNextWebinarId()      { return nextWebinarId++; }
function getNextRegistrationId() { return nextRegistrationId++; }

module.exports = { webinars, registrations, getNextWebinarId, getNextRegistrationId };
