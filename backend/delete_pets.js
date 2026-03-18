const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  const names = ['TestPet', 'DemoPet2', 'APItest', 'PetWithId'];
  const deleted = await prisma.pet.deleteMany({
    where: { name: { in: names } },
  });
  console.log('deleted', deleted.count, 'pets');
  await prisma.$disconnect();
})();
