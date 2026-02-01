import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

const ADMIN_PASSWORD = 'Admin';

export async function GET() {
    try {
        const vacations = await prisma.vacation.findMany({
            orderBy: { start: 'asc' },
        });
        return NextResponse.json(vacations);
    } catch (error) {
        console.error('Fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch vacations' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { action } = body;

        // --- HANDLE ADD ---
        if (action === 'ADD' || !action) {
            const { name, start, end, vertreter } = body;
            if (!name || !start || !end) return NextResponse.json({ success: false, message: 'Fehlende Daten.' }, { status: 400 });

            const newVacation = await prisma.vacation.create({
                data: { name, start, end, vertreter: vertreter || '' }
            });
            return NextResponse.json({ success: true, vacation: newVacation });
        }

        // --- HANDLE DELETE ---
        if (action === 'DELETE') {
            const { id, password } = body;
            if (password !== ADMIN_PASSWORD) return NextResponse.json({ success: false, message: 'Falsches Passwort.' }, { status: 403 });

            await prisma.vacation.delete({ where: { id } });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Request error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const { id, start, end } = await req.json();
        const updatedVacation = await prisma.vacation.update({
            where: { id },
            data: { start, end }
        });
        return NextResponse.json({ success: true, vacation: updatedVacation });
    } catch (error) {
        console.error('Update error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
