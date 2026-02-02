import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

const COLORS = [
    { id: 'blue', name: 'Blau', hex: '#3b82f6' },
    { id: 'green', name: 'Grün', hex: '#10b981' },
    { id: 'purple', name: 'Lila', hex: '#8b5cf6' },
    { id: 'orange', name: 'Orange', hex: '#f97316' },
    { id: 'pink', name: 'Pink', hex: '#ec4899' },
    { id: 'teal', name: 'Türkis', hex: '#14b8a6' },
    { id: 'indigo', name: 'Indigo', hex: '#6366f1' },
    { id: 'cyan', name: 'Cyan', hex: '#06b6d4' },
];

const ADMIN_PASSWORD = 'sapfi';

export async function GET() {
    try {
        const team = await prisma.teamMember.findMany();

        // Determine used/available colors
        const usedColors = team.map(m => m.colorId);
        const availableColors = COLORS.map(c => ({
            ...c,
            isUsed: usedColors.includes(c.id)
        }));

        return NextResponse.json({ team, availableColors });
    } catch (error) {
        console.error('Fetch error:', error);
        return NextResponse.json({ team: [], availableColors: [] }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { action } = body;

        // --- HANDLE ADD ---
        if (action === 'ADD' || !action) {
            const { name, color } = body; // color is ID here (e.g., 'blue')
            const selectedColor = COLORS.find(c => c.id === color);
            if (!selectedColor) return NextResponse.json({ success: false, message: 'Ungültige Farbe.' }, { status: 400 });

            try {
                const newMember = await prisma.teamMember.create({
                    data: {
                        name,
                        colorId: selectedColor.id,
                        color: selectedColor.hex
                    }
                });
                return NextResponse.json({ success: true, message: 'Mitglied hinzugefügt.', member: newMember });
            } catch (e) {
                if (e.code === 'P2002') return NextResponse.json({ success: false, message: 'Name existiert bereits.' }, { status: 400 });
                throw e;
            }
        }

        // --- HANDLE DELETE ---
        if (action === 'DELETE') {
            const { id, password } = body;
            if (password !== ADMIN_PASSWORD) return NextResponse.json({ success: false, message: 'Falsches Passwort.' }, { status: 403 });

            // Find member first to handle cascade deletion by name manually (or check name)
            // Frontend uses ID. 
            const member = await prisma.teamMember.findUnique({ where: { id } });
            if (!member) return NextResponse.json({ success: false, message: 'Mitglied nicht gefunden.' }, { status: 404 });

            // Delete vacations for this member and then the member
            await prisma.$transaction([
                prisma.vacation.deleteMany({ where: { name: member.name } }),
                prisma.teamMember.delete({ where: { id } })
            ]);
            return NextResponse.json({ success: true, message: 'Mitglied gelöscht.' });
        }

        return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Request error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
