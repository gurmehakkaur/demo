const { client, db } = require("./client");

async function init() {
  // Wait for MongoDB
  let retries = 15;
  while (retries > 0) {
    try {
      await client.connect();
      await db.command({ ping: 1 });
      console.log("MongoDB connected");
      break;
    } catch {
      retries--;
      console.log(`Waiting for MongoDB... (${retries} retries left)`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  if (retries === 0) throw new Error("Could not connect to MongoDB");

  await seedWebinars();
}

async function seedWebinars() {
  const count = await db.collection("webinars").countDocuments();
  if (count > 0) return;

  await db.collection("webinars").insertMany([
    {
      title: "Express Entry 2026 Updates",
      description: "A deep dive into the latest Express Entry draw changes, CRS score trends, and what applicants should expect in 2026.",
      host_id: 2,
      scheduled_time: new Date("2026-03-28T15:00:00Z"),
      status: "SCHEDULED",
    },
    {
      title: "Study Permit: Common Mistakes",
      description: "Immigration lawyer Sarah Chen covers the top 10 mistakes on study permit applications and how to avoid them.",
      host_id: 2,
      scheduled_time: new Date("2026-04-05T17:00:00Z"),
      status: "DRAFT",
    },
  ]);

  console.log("Seeded 2 webinars into MongoDB");
}

module.exports = { init };
