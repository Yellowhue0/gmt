import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hash } from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  const adminPass = await hash('admin123!', 12)
  const trainerPass = await hash('trainer123!', 12)
  const memberPass = await hash('member123!', 12)
  const fmtAdminPass = await hash('ChuckyMonstaz9!', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@gmt.se' },
    update: {},
    create: {
      name: 'Admin GMT',
      email: 'admin@gmt.se',
      password: adminPass,
      role: 'ADMIN',
      membershipPaid: true,
      membershipEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.user.upsert({
    where: { email: 'admin@falkenbergmt.com' },
    update: { password: fmtAdminPass, role: 'ADMIN', membershipPaid: true },
    create: {
      name: 'Admin Falkenberg MT',
      email: 'admin@falkenbergmt.com',
      password: fmtAdminPass,
      role: 'ADMIN',
      membershipPaid: true,
      membershipEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  })

  const trainer = await prisma.user.upsert({
    where: { email: 'tränare@gmt.se' },
    update: {},
    create: {
      name: 'Karl Tränaren',
      email: 'tränare@gmt.se',
      password: trainerPass,
      role: 'TRAINER',
      membershipPaid: true,
      membershipEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.user.upsert({
    where: { email: 'medlem@gmt.se' },
    update: {},
    create: {
      name: 'Anna Medlem',
      email: 'medlem@gmt.se',
      password: memberPass,
      role: 'MEMBER',
      swishNumber: '070-111 22 33',
      membershipPaid: false,
    },
  })

  console.log('Users created')

  // Test fighters
  const fighterPass = await hash('fighter123!', 12)
  const fighter1 = await prisma.user.upsert({
    where: { email: 'fighter1@gmt.se' },
    update: {},
    create: {
      name: 'Erik Svensson',
      email: 'fighter1@gmt.se',
      password: fighterPass,
      role: 'FIGHTER',
      membershipPaid: true,
      isConfirmed: true,
      membershipEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      fighterCardNumber: 'SMF-2024-001',
      fighterCardExpiry: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000),
      weightClass: 'Lightweight',
      currentWeight: 70.5,
      wins: 4,
      losses: 2,
      draws: 1,
    },
  })

  const fighter2 = await prisma.user.upsert({
    where: { email: 'fighter2@gmt.se' },
    update: {},
    create: {
      name: 'Sofia Lindqvist',
      email: 'fighter2@gmt.se',
      password: fighterPass,
      role: 'FIGHTER',
      membershipPaid: true,
      isConfirmed: true,
      membershipEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      fighterCardNumber: 'SMF-2024-002',
      fighterCardExpiry: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      weightClass: 'Strawweight',
      currentWeight: 51.0,
      wins: 2,
      losses: 1,
      draws: 0,
    },
  })

  await prisma.user.upsert({
    where: { email: 'fighter3@gmt.se' },
    update: {},
    create: {
      name: 'Marcus Johansson',
      email: 'fighter3@gmt.se',
      password: fighterPass,
      role: 'FIGHTER',
      membershipPaid: true,
      isConfirmed: true,
      membershipEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      weightClass: 'Welterweight',
      currentWeight: 77.0,
      wins: 0,
      losses: 0,
      draws: 0,
    },
  })

  // Competition entries for fighter1
  const smEvent = await prisma.event.findFirst({ where: { title: { contains: 'SM i Muay Thai' } } })
  const galaEvent = await prisma.event.findFirst({ where: { title: { contains: 'Falkenberg Fight Night' } } })

  if (smEvent) {
    const existing = await prisma.fighterCompetitionEntry.findFirst({ where: { fighterId: fighter1.id, eventId: smEvent.id } })
    if (!existing) {
      await prisma.fighterCompetitionEntry.create({
        data: {
          fighterId: fighter1.id,
          eventId: smEvent.id,
          weightAtEntry: 70.0,
          opponent: 'TBC',
          result: null,
          enteredBy: admin.id,
        },
      })
    }
  }

  if (galaEvent) {
    const existing = await prisma.fighterCompetitionEntry.findFirst({ where: { fighterId: fighter2.id, eventId: galaEvent.id } })
    if (!existing) {
      await prisma.fighterCompetitionEntry.create({
        data: {
          fighterId: fighter2.id,
          eventId: galaEvent.id,
          weightAtEntry: 51.0,
          opponent: 'Anna Berg',
          result: null,
          enteredBy: admin.id,
        },
      })
    }
  }

  console.log('Fighters created')

  // Clear check-ins first (FK dependency), then recreate sessions
  await prisma.checkIn.deleteMany({})
  await prisma.gymSession.deleteMany({})

  const sessions = [
    // Monday
    {
      name: 'Cirkelfys (60+)',
      dayOfWeek: 1,
      startTime: '09:30',
      endTime: '10:30',
      type: 'conditioning',
      description: 'Cirkelfysträning för seniorer 60+',
      maxCapacity: 15,
    },
    {
      name: 'Nybörjar/Motionärer',
      dayOfWeek: 1,
      startTime: '18:00',
      endTime: '19:30',
      type: 'regular',
      description: 'Muay Thai för nybörjare och motionärer',
      maxCapacity: 20,
    },
    // Tuesday
    {
      name: 'Fortsättningsgrupp',
      dayOfWeek: 2,
      startTime: '18:00',
      endTime: '19:30',
      type: 'regular',
      description: 'Muay Thai för de som tränat tidigare',
      maxCapacity: 20,
    },
    // Wednesday
    {
      name: 'Nybörjar/Motionärer',
      dayOfWeek: 3,
      startTime: '18:00',
      endTime: '19:30',
      type: 'regular',
      description: 'Muay Thai för nybörjare och motionärer',
      maxCapacity: 20,
    },
    // Thursday
    {
      name: 'Fortsättningsgrupp',
      dayOfWeek: 4,
      startTime: '18:00',
      endTime: '19:30',
      type: 'regular',
      description: 'Avancerad teknik och kombinationer',
      maxCapacity: 20,
    },
    // Friday
    {
      name: 'Tjejklass',
      dayOfWeek: 5,
      startTime: '18:00',
      endTime: '19:00',
      type: 'girls',
      description: 'Muay Thai för tjejer – alla nivåer välkomna',
      maxCapacity: 20,
    },
    // Saturday
    {
      name: 'Alla grupper',
      dayOfWeek: 6,
      startTime: '10:00',
      endTime: '11:30',
      type: 'regular',
      description: 'Öppen träning för alla grupper',
      maxCapacity: 30,
    },
    {
      name: 'Barnklass (8–14 år)',
      dayOfWeek: 6,
      startTime: '11:40',
      endTime: '12:40',
      type: 'youth',
      description: 'Muay Thai för barn och ungdomar 8–14 år',
      maxCapacity: 15,
    },
    // Sunday
    {
      name: 'Sparringklass',
      dayOfWeek: 0,
      startTime: '12:00',
      endTime: '14:00',
      type: 'sparring',
      description: 'Sparring – tid kan variera, kolla Community för aktuell tid',
      maxCapacity: 30,
    },
  ]

  for (const s of sessions) {
    await prisma.gymSession.create({
      data: { ...s, trainerId: trainer.id },
    })
  }

  console.log('Sessions created')

  const events = [
    {
      title: 'SM i Muay Thai 2025',
      description: 'Svenska Mästerskapen i Muay Thai. Flera av våra medlemmar tävlar!',
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      location: 'Stockholm, Eriksdalsbadet',
      type: 'COMPETITION',
    },
    {
      title: 'Gala: Falkenberg Fight Night',
      description: 'Lokal tävlingsgala med deltagare från hela Sverige.',
      date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      location: 'Falkenberg Sporthall',
      type: 'FIGHT',
    },
    {
      title: 'Teknik-seminarium med gästtränare',
      description: 'Lär dig avancerade klinch- och kombinationstekniker med erkänd tränare.',
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      location: 'GMT Gym, Falkenberg',
      type: 'SEMINAR',
    },
  ]

  for (const e of events) {
    const existing = await prisma.event.findFirst({ where: { title: e.title } })
    if (!existing) await prisma.event.create({ data: e })
  }

  console.log('Events created')

  const posts = [
    {
      content: 'Söndagssparring denna vecka: kl 13:00! Kom och kör. Alla nivåer välkomna.',
      category: 'SPARRING',
      pinned: true,
      authorId: trainer.id,
    },
    {
      content: 'Välkomna till GMT:s nya community-sida! Här kan ni kommunicera med varandra, ställa frågor och hålla koll på söndagssparringen. Hör av er om ni har frågor!',
      category: 'ANNOUNCEMENT',
      pinned: true,
      authorId: admin.id,
    },
    {
      content: 'Kom ihåg att checka in på passen via appen! Det hjälper oss planera kapacitet och se vem som tränar.',
      category: 'ANNOUNCEMENT',
      pinned: false,
      authorId: admin.id,
    },
  ]

  for (const p of posts) {
    const existing = await prisma.post.findFirst({ where: { content: p.content } })
    if (!existing) await prisma.post.create({ data: p })
  }

  console.log('Posts created')
  console.log('\n✅ Seed complete!')
  console.log('\nTest accounts:')
  console.log('  Admin:   admin@gmt.se / admin123!')
  console.log('  Tränare: tränare@gmt.se / trainer123!')
  console.log('  Medlem:  medlem@gmt.se / member123!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
