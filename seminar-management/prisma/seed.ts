import { PrismaClient, CourseStatus, AvailabilityType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Dates are relative to "now" so the dashboard always shows a sensible mix of
// upcoming and completed courses regardless of when the seed runs.
function daysFromNow(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function main() {
  // Idempotent: wipe and re-create so `npx prisma db seed` can run repeatedly.
  await prisma.assignmentHistory.deleteMany();
  await prisma.trainerAvailability.deleteMany();
  await prisma.course.deleteMany();
  await prisma.trainer.deleteMany();

  // The login account. Upserted rather than wiped with the domain data: a
  // re-seed refreshes the demo courses without silently resetting a password
  // someone changed. The hash is computed here, so no hash literal has to live
  // in the repo; override the password with SEED_ADMIN_PASSWORD.
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      displayName: "Admin",
      passwordHash: await bcrypt.hash(adminPassword, 10),
    },
  });

  // Locations are reference data selected from the UI, never typed. A few more
  // than the demo rows use, so the dropdown has something to choose between.
  const LOCATION_NAMES = [
    "Berlin, Germany",
    "Cologne, Germany",
    "Frankfurt, Germany",
    "Hamburg, Germany",
    "Munich, Germany",
    "Stuttgart, Germany",
    "Vienna, Austria",
    "Zurich, Switzerland",
  ];
  const locationIds = new Map<string, string>();
  for (const name of LOCATION_NAMES) {
    // Upserted, not wiped: courses and trainers reference these by FK.
    const location = await prisma.location.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    locationIds.set(name, location.id);
  }
  // Fails loudly on a typo rather than seeding a course into the wrong city.
  const loc = (name: string): string => {
    const id = locationIds.get(name);
    if (!id) throw new Error(`Seed references unknown location: ${name}`);
    return id;
  };

  const sarah = await prisma.trainer.create({
    data: {
      name: "Sarah Johnson",
      subjects: ["React.js", "Next.js", "TypeScript"],
      locationId: loc("Berlin, Germany"),
      email: "sarah.johnson@example.com",
      hourlyRate: 120,
      rating: 5,
      availability: {
        create: [
          // On holiday in ~3 weeks — the conflict/matching logic must skip her then.
          { type: AvailabilityType.BLACKOUT, startDate: daysFromNow(21), endDate: daysFromNow(28) },
        ],
      },
    },
  });

  await prisma.trainer.create({
    data: {
      name: "Markus Weber",
      subjects: ["Node.js", "Express", "PostgreSQL"],
      locationId: loc("Stuttgart, Germany"),
      email: "markus.weber@example.com",
      hourlyRate: 95,
      rating: 4,
    },
  });

  await prisma.trainer.create({
    data: {
      name: "Aylin Demir",
      subjects: ["React.js", "Vue.js", "JavaScript"],
      locationId: loc("Stuttgart, Germany"),
      email: "aylin.demir@example.com",
      hourlyRate: 85,
      rating: 4,
    },
  });

  const james = await prisma.trainer.create({
    data: {
      name: "James O'Connor",
      subjects: ["Python", "Django", "Machine Learning"],
      locationId: loc("Munich, Germany"),
      email: "james.oconnor@example.com",
      hourlyRate: 140,
      rating: 5,
    },
  });

  await prisma.trainer.create({
    data: {
      name: "Elena Petrova",
      subjects: ["TypeScript", "Angular", "Next.js"],
      locationId: loc("Hamburg, Germany"),
      email: "elena.petrova@example.com",
      hourlyRate: 70,
      rating: 3,
    },
  });

  // Assigned + upcoming course, with its assignment recorded in history.
  const reactWorkshop = await prisma.course.create({
    data: {
      name: "Advanced React.js & Next.js Workshop",
      date: daysFromNow(14),
      subjects: ["React.js", "Next.js"],
      locationId: loc("Stuttgart, Germany"),
      participants: 25,
      notes: "Focus on server-side rendering and performance optimization",
      price: 2500,
      trainerPrice: 800,
      status: CourseStatus.SCHEDULED,
      trainerId: sarah.id,
    },
  });
  await prisma.assignmentHistory.create({
    data: {
      courseId: reactWorkshop.id,
      action: "ASSIGNED",
      trainerId: sarah.id,
      trainerName: sarah.name,
      trainerEmail: sarah.email,
      note: "Seeded assignment",
    },
  });

  // Same location + same day as the React workshop -> location conflict demo.
  await prisma.course.create({
    data: {
      name: "Node.js API Bootcamp",
      date: daysFromNow(14),
      subjects: ["Node.js", "Express"],
      locationId: loc("Stuttgart, Germany"),
      participants: 12,
      price: 1800,
      trainerPrice: 650,
      status: CourseStatus.DRAFT,
    },
  });

  // Unassigned upcoming course — the AI matching demo target.
  await prisma.course.create({
    data: {
      name: "TypeScript Fundamentals",
      date: daysFromNow(30),
      subjects: ["TypeScript", "JavaScript"],
      locationId: loc("Berlin, Germany"),
      participants: 18,
      notes: "Beginner-friendly, hands-on exercises",
      price: 1500,
      trainerPrice: 500,
      status: CourseStatus.SCHEDULED,
    },
  });

  // Falls inside Sarah's blackout window — availability edge case for matching.
  await prisma.course.create({
    data: {
      name: "Next.js in Production",
      date: daysFromNow(24),
      subjects: ["Next.js", "React.js"],
      locationId: loc("Berlin, Germany"),
      participants: 20,
      price: 2200,
      trainerPrice: 750,
      status: CourseStatus.DRAFT,
    },
  });

  const completedPython = await prisma.course.create({
    data: {
      name: "Python for Data Analysis",
      date: daysFromNow(-20),
      subjects: ["Python", "Machine Learning"],
      locationId: loc("Munich, Germany"),
      participants: 15,
      price: 3000,
      trainerPrice: 1100,
      status: CourseStatus.COMPLETED,
      trainerId: james.id,
    },
  });
  await prisma.assignmentHistory.create({
    data: {
      courseId: completedPython.id,
      action: "ASSIGNED",
      trainerId: james.id,
      trainerName: james.name,
      trainerEmail: james.email,
      note: "Seeded assignment",
    },
  });

  await prisma.course.create({
    data: {
      name: "Vue.js Crash Course",
      date: daysFromNow(-5),
      subjects: ["Vue.js"],
      locationId: loc("Stuttgart, Germany"),
      participants: 8,
      price: 900,
      trainerPrice: 400,
      status: CourseStatus.CANCELLED,
      notes: "Cancelled due to low enrollment",
    },
  });

  const counts = {
    users: await prisma.user.count(),
    locations: await prisma.location.count(),
    trainers: await prisma.trainer.count(),
    courses: await prisma.course.count(),
  };
  console.log(
    `Seeded ${counts.users} users, ${counts.locations} locations, ` +
      `${counts.trainers} trainers, ${counts.courses} courses.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
