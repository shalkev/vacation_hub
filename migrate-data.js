require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log('Starting data migration...');

    // Migrate Team Members
    const teamPath = path.join(__dirname, 'data', 'team.json');
    if (fs.existsSync(teamPath)) {
        const teamData = JSON.parse(fs.readFileSync(teamPath, 'utf-8'));
        for (const member of teamData) {
            const existing = await prisma.teamMember.findUnique({
                where: { name: member.name }
            });
            if (!existing) {
                await prisma.teamMember.create({
                    data: {
                        id: member.id,
                        name: member.name,
                        color: member.color,
                        colorId: member.colorId,
                        createdAt: new Date(member.createdAt)
                    }
                });
                console.log(`Migrated team member: ${member.name}`);
            } else {
                console.log(`Team member already exists: ${member.name}`);
            }
        }
    }

    // Migrate Vacations
    const vacationsPath = path.join(__dirname, 'data', 'vacations.json');
    if (fs.existsSync(vacationsPath)) {
        const vacationsData = JSON.parse(fs.readFileSync(vacationsPath, 'utf-8'));
        for (const vacation of vacationsData) {
            const existing = await prisma.vacation.findUnique({
                where: { id: vacation.id }
            });
            if (!existing) {
                await prisma.vacation.create({
                    data: {
                        id: vacation.id,
                        name: vacation.name,
                        start: vacation.start,
                        end: vacation.end,
                        vertreter: vacation.vertreter,
                        createdAt: new Date(vacation.createdAt),
                        updatedAt: new Date(vacation.updatedAt || vacation.createdAt)
                    }
                });
                console.log(`Migrated vacation for: ${vacation.name}`);
            } else {
                console.log(`Vacation already exists: ${vacation.id}`);
            }
        }
    }

    console.log('Migration complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
