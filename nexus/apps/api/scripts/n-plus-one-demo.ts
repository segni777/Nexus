import 'dotenv/config';
import DataLoader from 'dataloader';
import { PrismaClient, type Deliverable } from '@prisma/client';

let queryCount = 0;
const prisma = new PrismaClient({
  log: [{ emit: 'event', level: 'query' }],
});

prisma.$on('query', (event) => {
  queryCount += 1;
  console.log(`${queryCount}. ${event.query.replace(/\s+/g, ' ').trim()}`);
});

const creators = await prisma.creator.findMany({
  orderBy: { id: 'asc' },
  take: 10,
});

console.log('\nNAIVE: one deliverable query per creator');
queryCount = 0;
for (const creator of creators) {
  await prisma.deliverable.findMany({ where: { creatorId: creator.id } });
}
console.log(`Naive child queries: ${queryCount}`);

console.log('\nBATCHED: all creator ids in one query');
queryCount = 0;
const loader = new DataLoader<string, Deliverable[]>(async (creatorIds) => {
  const rows = await prisma.deliverable.findMany({
    where: { creatorId: { in: [...creatorIds] } },
  });
  return creatorIds.map((id) => rows.filter((row) => row.creatorId === id));
});

await Promise.all(creators.map((creator) => loader.load(creator.id)));
console.log(`Batched child queries: ${queryCount}`);

await prisma.$disconnect();