"use client";

import { useMemo } from 'react';
import { Card, Row, Col, Badge, Table, Button } from 'react-bootstrap';
import { DateTime, Interval } from 'luxon';
import { getHolidaysBW, getSchoolHolidaysBW, isWeekend } from '@/lib/holidays';

export default function YearlyOverview({ vacations, team, year, onClose }) {
    const months = useMemo(() => {
        return Array.from({ length: 12 }, (_, i) => i + 1);
    }, []);

    const holidays = useMemo(() => getHolidaysBW(year), [year]);
    const schoolHolidays = useMemo(() => getSchoolHolidaysBW(year), [year]);

    // Pre-calculate days for each person
    const memberVacations = useMemo(() => {
        const map = {};
        vacations.forEach(v => {
            if (!map[v.name]) map[v.name] = [];
            map[v.name].push({
                start: DateTime.fromISO(v.start),
                end: DateTime.fromISO(v.end),
                color: team.find(m => m.name === v.name)?.color || '#ccc'
            });
        });
        return map;
    }, [vacations, team]);

    const renderMonth = (monthNum) => {
        const startOfMonth = DateTime.local(year, monthNum, 1);
        const daysInMonth = startOfMonth.daysInMonth;
        const monthName = startOfMonth.monthLong;

        const days = Array.from({ length: daysInMonth }, (_, i) => startOfMonth.set({ day: i + 1 }));

        // Sunday-based weekday (0-6)
        const firstDayWeekday = startOfMonth.weekday === 7 ? 0 : startOfMonth.weekday;

        return (
            <div className="mini-month-card" style={{ marginBottom: '40px' }}>
                <h2 style={{
                    textAlign: 'center',
                    fontSize: '1.8rem',
                    fontWeight: '800',
                    marginBottom: '10px',
                    letterSpacing: '-0.5px'
                }}>
                    {monthName}
                </h2>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    width: '100%',
                    borderTop: '2px solid #111'
                }}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((h, i) => (
                        <div key={i} style={{
                            textAlign: 'center',
                            fontWeight: '800',
                            fontSize: '0.85rem',
                            padding: '10px 0',
                            color: i === 0 ? '#ef4444' : '#111',
                            borderBottom: '2px solid #111'
                        }}>
                            {h}
                        </div>
                    ))}

                    {/* Leading empty cells */}
                    {Array.from({ length: firstDayWeekday }).map((_, i) => (
                        <div key={`empty-${i}`} style={{ minHeight: '50px' }}></div>
                    ))}

                    {days.map(day => {
                        const dateStr = day.toISODate();
                        const isHoliday = holidays.some(h => h.date === dateStr);
                        const isWeekendDay = day.weekday === 6 || day.weekday === 7;
                        const schoolHoliday = schoolHolidays.find(sh => {
                            const start = DateTime.fromISO(sh.start);
                            const end = DateTime.fromISO(sh.end);
                            return day >= start && day < end;
                        });

                        // Each member gets a dedicated track for vacation strips
                        const tracks = team.map(member => {
                            const vList = memberVacations[member.name] || [];
                            const isAway = vList.some(v => day >= v.start && day < v.end);
                            return isAway ? member.color : null;
                        });

                        return (
                            <div
                                key={dateStr}
                                style={{
                                    minHeight: '60px',
                                    padding: '4px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    backgroundColor: isHoliday ? '#fee2e2' : 'transparent',
                                    borderBottom: schoolHoliday ? '3px solid #22c55e' : 'none',
                                    transition: 'background 0.2s',
                                    borderRadius: isHoliday ? '4px' : '0'
                                }}
                                title={`${day.toLocaleString(DateTime.DATE_HUGE)}${isHoliday ? ': ' + holidays.find(h => h.date === dateStr).name : ''}`}
                            >
                                <span style={{
                                    fontSize: '1rem',
                                    fontWeight: '700',
                                    color: isWeekendDay ? '#ef4444' : '#111',
                                    marginBottom: '4px'
                                }}>
                                    {day.day}
                                </span>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1px',
                                    width: '100%',
                                    marginTop: 'auto'
                                }}>
                                    {tracks.map((color, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                width: '100%',
                                                height: '3px',
                                                backgroundColor: color || 'transparent',
                                                visibility: color ? 'visible' : 'hidden',
                                                borderRadius: '1px'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="yearly-overview animate-in" style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
            <div className="d-flex justify-content-between align-items-center mb-5 no-print">
                <h3 className="mb-0 gradient-text" style={{ fontSize: '2.5rem' }}>📅 Jahresübersicht {year}</h3>
                <div className="d-flex gap-2">
                    <Button variant="outline-primary" onClick={() => window.print()}>
                        🖨️ Bericht drucken
                    </Button>
                    <Button variant="secondary" onClick={onClose}>
                        Schließen
                    </Button>
                </div>
            </div>

            <Row className="row-cols-1 row-cols-md-3 g-5">
                {months.map(m => (
                    <Col key={m} style={{ padding: '0 30px' }}>
                        {renderMonth(m)}
                    </Col>
                ))}
            </Row>

            <div className="legend mt-5 p-4 bg-white rounded shadow-sm no-print" style={{ maxWidth: '1200px', margin: '40px auto' }}>
                <h6 className="mb-3 fw-bold text-uppercase" style={{ letterSpacing: '1px', fontSize: '0.8rem' }}>Farblegende & Kürzel</h6>
                <div className="d-flex flex-wrap gap-4 mb-3">
                    {team.map(member => (
                        <div key={member.id} className="d-flex align-items-center gap-2">
                            <div style={{ backgroundColor: member.color, width: 14, height: 14, borderRadius: '50%' }}></div>
                            <span className="fw-semibold" style={{ fontSize: '0.9rem' }}>{member.name}</span>
                        </div>
                    ))}
                </div>
                <hr />
                <div className="d-flex gap-4 mt-3">
                    <div className="d-flex align-items-center gap-2">
                        <div style={{ width: 18, height: 18, backgroundColor: '#fee2e2', borderRadius: '4px' }}></div>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Feiertag</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <div style={{ width: 18, borderBottom: '3px solid #22c55e' }}></div>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Schulferien</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <span style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 'bold' }}>12</span>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Wochenende</span>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .animate-in {
                    animation: fadeIn 0.4s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @media print {
                    .no-print { display: none !important; }
                    .yearly-overview { background: white !important; padding: 0 !important; max-width: 100% !important; }
                    .mini-month-card { break-inside: avoid; margin-bottom: 50px !important; }
                    body { background: white !important; }
                }
            `}</style>
        </div>
    );
}
