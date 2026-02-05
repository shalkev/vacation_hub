"use client";

import { useMemo, useRef } from 'react';
import { Card, Badge, ListGroup, ProgressBar, Alert, Button, Table } from 'react-bootstrap';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { DateTime } from 'luxon';
import { calculateWorkingDays, getHolidaysBW, getWorkingDaysInRange } from '@/lib/holidays';

const TOTAL_VACATION_DAYS = 30;

export default function Dashboard({ vacations, team, currentViewStart, currentViewEnd }) {
    const printRef = useRef(null);

    // Get current view period label
    const periodLabel = useMemo(() => {
        if (!currentViewStart) return DateTime.now().toFormat(' ' + 'MMMM yyyy');
        const start = DateTime.fromISO(currentViewStart);
        return start.toFormat('MMMM yyyy');
    }, [currentViewStart]);

    // Calculate days booked per person - ONLY working days (no weekends/holidays)
    const vacationStats = useMemo(() => {
        const stats = {};
        const teamNames = new Set(team.map(m => m.name));

        // Initialize stats only for team members
        team.forEach(member => {
            stats[member.name] = {
                daysBooked: 0,
                color: member.color || '#CCCCCC',
                vacations: []
            };
        });

        // Count working days only for vacations belonging to current team members
        vacations.forEach(v => {
            if (!teamNames.has(v.name)) return; // Skip orphaned data

            const workingDays = calculateWorkingDays(v.start, v.end);

            if (stats[v.name]) {
                stats[v.name].daysBooked += workingDays;
                stats[v.name].vacations.push({
                    start: v.start,
                    end: v.end,
                    workingDays,
                    vertreter: v.vertreter
                });
            }
        });

        return Object.entries(stats).map(([name, data]) => ({
            name,
            ...data,
            remaining: Math.max(0, TOTAL_VACATION_DAYS - data.daysBooked)
        }));
    }, [vacations, team]);

    // Calculate absence rate for the CURRENTLY VIEWED period using Man-Days (Arbeitstage)
    const absenceData = useMemo(() => {
        let periodStart, periodEnd;
        const teamNames = new Set(team.map(m => m.name));

        if (currentViewStart && currentViewEnd) {
            periodStart = DateTime.fromISO(currentViewStart);
            periodEnd = DateTime.fromISO(currentViewEnd);
        } else {
            const now = DateTime.now();
            periodStart = now.startOf('month');
            periodEnd = now.endOf('month');
        }

        const workingDaysInPeriod = getWorkingDaysInRange(periodStart.toISODate(), periodEnd.toISODate());
        const totalTeamWorkingDays = workingDaysInPeriod * team.length;

        let totalVacationWorkingDays = 0;

        vacations.forEach(v => {
            if (!teamNames.has(v.name)) return;

            const vacStart = DateTime.fromISO(v.start);
            const vacEnd = DateTime.fromISO(v.end);

            // Calculate overlap between vacation and period
            const overlapStart = vacStart > periodStart ? vacStart : periodStart;
            const overlapEnd = vacEnd < periodEnd ? vacEnd : periodEnd;

            if (overlapStart <= overlapEnd) {
                const overlapWorkingDays = calculateWorkingDays(overlapStart.toISODate(), overlapEnd.toISODate());
                totalVacationWorkingDays += overlapWorkingDays;
            }
        });

        const presentDays = Math.max(0, totalTeamWorkingDays - totalVacationWorkingDays);

        return [
            { name: 'Anwesenheit (Tag)', value: presentDays, color: '#4ECDC4' },
            { name: 'Urlaub (Tag)', value: totalVacationWorkingDays, color: '#FF6B6B' }
        ];
    }, [vacations, team, currentViewStart, currentViewEnd]);

    // Find collision warnings
    const collisions = useMemo(() => {
        const warnings = [];
        const teamNames = new Set(team.map(m => m.name));
        const teamVacations = vacations.filter(v => teamNames.has(v.name));

        for (let i = 0; i < teamVacations.length; i++) {
            for (let j = i + 1; j < teamVacations.length; j++) {
                const a = teamVacations[i];
                const b = teamVacations[j];

                const aStart = new Date(a.start);
                const aEnd = new Date(a.end);
                const bStart = new Date(b.start);
                const bEnd = new Date(b.end);

                if (aStart <= bEnd && aEnd >= bStart) {
                    const overlapStart = new Date(Math.max(aStart, bStart));
                    const overlapEnd = new Date(Math.min(aEnd, bEnd));

                    warnings.push({
                        people: [a.name, b.name],
                        from: DateTime.fromJSDate(overlapStart).toFormat('dd.MM'),
                        to: DateTime.fromJSDate(overlapEnd).toFormat('dd.MM')
                    });
                }
            }
        }

        return warnings;
    }, [vacations, team]);

    // Yearly heatmap data
    const monthlyDensity = useMemo(() => {
        const months = Array(12).fill(0);
        const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
        const teamNames = new Set(team.map(m => m.name));

        vacations.filter(v => teamNames.has(v.name)).forEach(v => {
            const start = DateTime.fromISO(v.start);
            const end = DateTime.fromISO(v.end);

            let current = start;
            while (current <= end) {
                months[current.month - 1]++;
                current = current.plus({ months: 1 }).startOf('month');
            }
        });

        const maxDensity = Math.max(...months, 1);

        return months.map((count, i) => ({
            name: monthNames[i],
            count,
            opacity: count / maxDensity
        }));
    }, [vacations, team]);

    // Print report function
    const handlePrint = () => {
        const printContent = document.getElementById('print-report');
        const printWindow = window.open('', '_blank');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Urlaubsbericht ${DateTime.now().year}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
                    h2 { color: #333; margin-top: 30px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                    th { background: #667eea; color: white; }
                    tr:nth-child(even) { background: #f9f9fa; }
                    .color-dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
                    .summary { background: #f0f4ff; padding: 15px; border-radius: 8px; margin-top: 20px; }
                    .summary-item { display: inline-block; margin-right: 30px; }
                    .footer { margin-top: 40px; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
                    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                </style>
            </head>
            <body>
                ${printContent.innerHTML}
                <div class="footer">
                    Erstellt am: ${DateTime.now().toFormat('dd.MM.yyyy HH:mm')} | Team Vacation Hub 2026
                </div>
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.print();
    };

    const currentYear = DateTime.now().year;
    const holidays = getHolidaysBW(currentYear);

    return (
        <div className="dashboard">
            {/* Print Button */}
            <Button
                variant="outline-primary"
                size="sm"
                className="w-100 mb-3"
                onClick={handlePrint}
            >
                🖨️ Bericht drucken
            </Button>

            {/* Hidden Print Report */}
            <div id="print-report" style={{ display: 'none' }}>
                <h1>🏖️ Urlaubsübersicht {currentYear}</h1>
                <p><strong>Baden-Württemberg</strong> | Arbeitstage (ohne Wochenenden und Feiertage)</p>

                <h2>Urlaubstage pro Mitarbeiter</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Mitarbeiter</th>
                            <th>Gebucht</th>
                            <th>Verfügbar</th>
                            <th>Gesamt</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vacationStats.map(stat => (
                            <tr key={stat.name}>
                                <td>
                                    <span className="color-dot" style={{ backgroundColor: stat.color }}></span>
                                    {stat.name}
                                </td>
                                <td>{stat.daysBooked} Tage</td>
                                <td>{stat.remaining} Tage</td>
                                <td>{TOTAL_VACATION_DAYS} Tage</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <h2>Gebuchte Zeiträume</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Mitarbeiter</th>
                            <th>Von</th>
                            <th>Bis</th>
                            <th>Arbeitstage</th>
                            <th>Vertretung</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vacationStats.flatMap(stat =>
                            stat.vacations.map((v, i) => (
                                <tr key={`${stat.name}-${i}`}>
                                    <td>{stat.name}</td>
                                    <td>{DateTime.fromISO(v.start).toFormat('dd.MM.yyyy')}</td>
                                    <td>{DateTime.fromISO(v.end).toFormat('dd.MM.yyyy')}</td>
                                    <td>{v.workingDays}</td>
                                    <td>{v.vertreter || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                <div className="summary">
                    <h3>Zusammenfassung</h3>
                    <div className="summary-item">
                        <strong>Team-Größe:</strong> {team.length} Mitarbeiter
                    </div>
                    <div className="summary-item">
                        <strong>Gesamte gebuchte Tage:</strong> {vacationStats.reduce((sum, s) => sum + s.daysBooked, 0)}
                    </div>
                    <div className="summary-item">
                        <strong>Überschneidungen:</strong> {collisions.length}
                    </div>
                </div>

                <h2>Feiertage Baden-Württemberg {currentYear}</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Datum</th>
                            <th>Feiertag</th>
                        </tr>
                    </thead>
                    <tbody>
                        {holidays.map(h => (
                            <tr key={h.date}>
                                <td>{DateTime.fromISO(h.date).toFormat('dd.MM.yyyy (cccc)')}</td>
                                <td>{h.name}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Team Vacation Counter */}
            <Card className="mb-3 shadow-sm">
                <Card.Header className="bg-gradient-purple text-white fw-bold">
                    📊 Urlaubstage (Arbeitstage)
                </Card.Header>
                <Card.Body className="p-2">
                    {vacationStats.length === 0 ? (
                        <p className="text-muted small mb-0">Keine Teammitglieder registriert.</p>
                    ) : (
                        <ListGroup variant="flush">
                            {vacationStats.map((stat) => (
                                <ListGroup.Item key={stat.name} className="px-2 py-2">
                                    <div className="d-flex align-items-center mb-1">
                                        <span
                                            className="me-2"
                                            style={{
                                                width: 12,
                                                height: 12,
                                                borderRadius: '50%',
                                                backgroundColor: stat.color,
                                                display: 'inline-block'
                                            }}
                                        />
                                        <span className="fw-bold small">{stat.name}</span>
                                        <Badge bg="secondary" className="ms-auto small">
                                            {stat.daysBooked}/{TOTAL_VACATION_DAYS}
                                        </Badge>
                                    </div>
                                    <ProgressBar
                                        now={(stat.daysBooked / TOTAL_VACATION_DAYS) * 100}
                                        style={{ height: 6 }}
                                        variant={stat.daysBooked > TOTAL_VACATION_DAYS * 0.8 ? 'danger' : 'success'}
                                    />
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    )}
                    <small className="text-muted d-block mt-2">
                        ℹ️ Ohne Wochenenden & Feiertage (BW)
                    </small>
                </Card.Body>
            </Card>

            {/* Absence Chart */}
            <Card className="mb-3 shadow-sm">
                <Card.Header className="bg-gradient-purple text-white fw-bold">
                    📈 Abwesenheit {periodLabel}
                </Card.Header>
                <Card.Body className="p-2">
                    <ResponsiveContainer width="100%" height={120}>
                        <PieChart>
                            <Pie
                                data={absenceData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={50}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {absenceData.map((entry, index) => (
                                    <Cell key={index} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="text-center mt-1">
                        <small className="text-muted">
                            <span style={{ color: '#4ECDC4' }}>●</span> Anwesenheit: {absenceData[0]?.value || 0} Tage |
                            <span style={{ color: '#FF6B6B' }}> ●</span> Urlaub: {absenceData[1]?.value || 0} Tage
                        </small>
                    </div>
                </Card.Body>
            </Card>

            {/* Collision Warnings */}
            <Card className="mb-3 shadow-sm">
                <Card.Header className="bg-gradient-purple text-white fw-bold">
                    ⚠️ Überschneidungen
                </Card.Header>
                <Card.Body className="p-2">
                    {collisions.length === 0 ? (
                        <Alert variant="success" className="mb-0 py-2 small">
                            ✓ Keine Überschneidungen
                        </Alert>
                    ) : (
                        <ListGroup variant="flush">
                            {collisions.slice(0, 5).map((c, i) => (
                                <ListGroup.Item key={i} className="px-2 py-2 small">
                                    <strong>{c.people.join(' & ')}</strong>
                                    <br />
                                    <span className="text-danger">{c.from} - {c.to}</span>
                                </ListGroup.Item>
                            ))}
                            {collisions.length > 5 && (
                                <small className="text-muted">+{collisions.length - 5} weitere</small>
                            )}
                        </ListGroup>
                    )}
                </Card.Body>
            </Card>

            {/* Yearly Heatmap */}
            <Card className="shadow-sm">
                <Card.Header className="bg-gradient-purple text-white fw-bold">
                    🗓️ Jahres-Trend
                </Card.Header>
                <Card.Body className="p-2">
                    <div className="heatmap-grid">
                        {monthlyDensity.map((m) => (
                            <div
                                key={m.name}
                                className="heatmap-cell"
                                title={`${m.name}: ${m.count} Buchungen`}
                                style={{
                                    backgroundColor: `rgba(102, 126, 234, ${0.1 + m.opacity * 0.9})`,
                                    color: m.opacity > 0.5 ? 'white' : '#333'
                                }}
                            >
                                {m.name}
                            </div>
                        ))}
                    </div>
                </Card.Body>
            </Card>

            <style jsx>{`
                .heatmap-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 4px;
                }
                .heatmap-cell {
                    text-align: center;
                    padding: 6px 2px;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    font-weight: 600;
                }
            `}</style>
        </div>
    );
}
