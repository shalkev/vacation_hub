import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_FILE = path.join(process.cwd(), 'data', 'vacations.json');
const ADMIN_PASSWORD = 'Admin'; // Default password

// Helper to read data
function readVacations() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
            fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
            return [];
        }
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading vacations:', error);
        return [];
    }
}

// Helper to write data
function writeVacations(vacations) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(vacations, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error('Error writing vacations:', error);
        return false;
    }
}

// GET: Fetch all vacations
export async function GET() {
    const vacations = readVacations();
    return NextResponse.json(vacations);
}

// POST: Add or Delete vacation
export async function POST(request) {
    try {
        const body = await request.json();
        const { action } = body;

        if (action === 'ADD') {
            const { name, start, end, vertreter } = body;

            if (!name || !start || !end) {
                return NextResponse.json(
                    { success: false, message: 'Name, Start und Ende sind erforderlich.' },
                    { status: 400 }
                );
            }

            const vacations = readVacations();

            // Overlapping bookings are now ALLOWED - no blocking check
            // The dashboard will show overlap warnings instead

            const newVacation = {
                id: uuidv4(),
                name,
                start,
                end,
                vertreter: vertreter || '',
                createdAt: new Date().toISOString()
            };

            vacations.push(newVacation);

            if (writeVacations(vacations)) {
                return NextResponse.json({ success: true, message: 'Urlaub erfolgreich eingetragen.', vacation: newVacation });
            } else {
                return NextResponse.json(
                    { success: false, message: 'Fehler beim Speichern.' },
                    { status: 500 }
                );
            }
        }

        if (action === 'DELETE') {
            const { id, password } = body;

            if (password !== ADMIN_PASSWORD) {
                return NextResponse.json(
                    { success: false, message: 'Falsches Admin-Passwort.' },
                    { status: 403 }
                );
            }

            const vacations = readVacations();
            const index = vacations.findIndex(v => v.id === id);

            if (index === -1) {
                return NextResponse.json(
                    { success: false, message: 'Eintrag nicht gefunden.' },
                    { status: 404 }
                );
            }

            vacations.splice(index, 1);

            if (writeVacations(vacations)) {
                return NextResponse.json({ success: true, message: 'Eintrag gelöscht.' });
            } else {
                return NextResponse.json(
                    { success: false, message: 'Fehler beim Löschen.' },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json(
            { success: false, message: 'Ungültige Aktion.' },
            { status: 400 }
        );

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { success: false, message: 'Server Fehler.' },
            { status: 500 }
        );
    }
}

// PUT: Update vacation (for drag & drop)
export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, start, end } = body;

        if (!id || !start || !end) {
            return NextResponse.json(
                { success: false, message: 'ID, Start und Ende sind erforderlich.' },
                { status: 400 }
            );
        }

        const vacations = readVacations();
        const index = vacations.findIndex(v => v.id === id);

        if (index === -1) {
            return NextResponse.json(
                { success: false, message: 'Eintrag nicht gefunden.' },
                { status: 404 }
            );
        }

        // Overlapping bookings are now ALLOWED - no blocking check

        vacations[index].start = start;
        vacations[index].end = end;
        vacations[index].updatedAt = new Date().toISOString();

        if (writeVacations(vacations)) {
            return NextResponse.json({ success: true, message: 'Urlaub aktualisiert.', vacation: vacations[index] });
        } else {
            return NextResponse.json(
                { success: false, message: 'Fehler beim Speichern.' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { success: false, message: 'Server Fehler.' },
            { status: 500 }
        );
    }
}
