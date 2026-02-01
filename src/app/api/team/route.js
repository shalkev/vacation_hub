import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const TEAM_FILE = path.join(process.cwd(), 'data', 'team.json');
const VACATIONS_FILE = path.join(process.cwd(), 'data', 'vacations.json');
const ADMIN_PASSWORD = 'Admin';

// Available colors for team members to choose
const AVAILABLE_COLORS = [
    { id: 'coral', name: 'Koralle', hex: '#FF6B6B' },
    { id: 'teal', name: 'Türkis', hex: '#4ECDC4' },
    { id: 'blue', name: 'Himmelblau', hex: '#45B7D1' },
    { id: 'mint', name: 'Mint', hex: '#96CEB4' },
    { id: 'yellow', name: 'Sonnengelb', hex: '#FFEAA7' },
    { id: 'lavender', name: 'Lavendel', hex: '#DDA0DD' },
    { id: 'sage', name: 'Salbei', hex: '#98D8C8' },
    { id: 'gold', name: 'Gold', hex: '#F7DC6F' },
    { id: 'violet', name: 'Violett', hex: '#BB8FCE' },
    { id: 'skyblue', name: 'Babyblau', hex: '#85C1E9' },
    { id: 'salmon', name: 'Lachs', hex: '#F1948A' },
    { id: 'emerald', name: 'Smaragd', hex: '#82E0AA' },
    { id: 'orange', name: 'Orange', hex: '#E59866' },
    { id: 'pink', name: 'Rosa', hex: '#F5B7B1' },
    { id: 'purple', name: 'Lila', hex: '#C39BD3' },
];

function readTeam() {
    try {
        if (!fs.existsSync(TEAM_FILE)) {
            fs.mkdirSync(path.dirname(TEAM_FILE), { recursive: true });
            fs.writeFileSync(TEAM_FILE, '[]', 'utf-8');
            return [];
        }
        const data = fs.readFileSync(TEAM_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading team:', error);
        return [];
    }
}

function writeTeam(team) {
    try {
        fs.writeFileSync(TEAM_FILE, JSON.stringify(team, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error('Error writing team:', error);
        return false;
    }
}

function readVacations() {
    try {
        if (!fs.existsSync(VACATIONS_FILE)) {
            return [];
        }
        const data = fs.readFileSync(VACATIONS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading vacations:', error);
        return [];
    }
}

function writeVacations(vacations) {
    try {
        fs.writeFileSync(VACATIONS_FILE, JSON.stringify(vacations, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error('Error writing vacations:', error);
        return false;
    }
}

// GET: Fetch all team members and available colors
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const includeColors = searchParams.get('colors') === 'true';
    
    const team = readTeam();
    
    if (includeColors) {
        return NextResponse.json({ team, availableColors: AVAILABLE_COLORS });
    }
    
    return NextResponse.json(team);
}

// POST: Add or Delete team member
export async function POST(request) {
    try {
        const body = await request.json();
        const { action } = body;

        if (action === 'ADD') {
            const { name, color } = body;
            
            if (!name || !name.trim()) {
                return NextResponse.json(
                    { success: false, message: 'Name ist erforderlich.' },
                    { status: 400 }
                );
            }

            if (!color) {
                return NextResponse.json(
                    { success: false, message: 'Bitte wähle eine Farbe.' },
                    { status: 400 }
                );
            }

            const team = readTeam();
            
            // Check if name already exists
            if (team.some(m => m.name.toLowerCase() === name.trim().toLowerCase())) {
                return NextResponse.json(
                    { success: false, message: 'Dieser Name existiert bereits.' },
                    { status: 409 }
                );
            }

            // Find the color hex value
            const colorInfo = AVAILABLE_COLORS.find(c => c.id === color);
            const colorHex = colorInfo ? colorInfo.hex : color;

            const newMember = {
                id: uuidv4(),
                name: name.trim(),
                color: colorHex,
                colorId: color,
                createdAt: new Date().toISOString()
            };

            team.push(newMember);
            
            if (writeTeam(team)) {
                return NextResponse.json({ success: true, message: 'Teammitglied hinzugefügt.', member: newMember });
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

            const team = readTeam();
            const memberIndex = team.findIndex(m => m.id === id);

            if (memberIndex === -1) {
                return NextResponse.json(
                    { success: false, message: 'Mitglied nicht gefunden.' },
                    { status: 404 }
                );
            }

            const memberName = team[memberIndex].name;

            // CASCADE DELETE: Remove all vacations for this member
            // and clear their name from "vertreter" field
            const vacations = readVacations();
            const updatedVacations = vacations
                .filter(v => v.name !== memberName) // Remove their vacations
                .map(v => ({
                    ...v,
                    vertreter: v.vertreter === memberName ? '' : v.vertreter // Clear as substitute
                }));
            
            writeVacations(updatedVacations);

            // Remove team member
            team.splice(memberIndex, 1);

            if (writeTeam(team)) {
                return NextResponse.json({ 
                    success: true, 
                    message: `Mitglied "${memberName}" und zugehörige Urlaubseinträge entfernt.` 
                });
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
