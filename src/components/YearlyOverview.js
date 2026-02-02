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

        return (
            <Card className="h-100 shadow-sm mini-month-card">
                <Card.Header className="py-1 bg-gradient-purple text-white text-center fw-bold" style={{ fontSize: '0.9rem' }}>
                    {monthName}
                </Card.Header>
                <Card.Body className="p-1">
                    <div className="mini-calendar-grid">
                        <div className="day-header">M</div>
                        <div className="day-header">D</div>
                        <div className="day-header">M</div>
                        <div className="day-header">D</div>
                        <div className="day-header">F</div>
                        <div className="day-header text-danger">S</div>
                        <div className="day-header text-danger">S</div>

                        {/* Leading empty cells for first week */}
                        {Array.from({ length: (startOfMonth.weekday - 1) }).map((_, i) => (
                            <div key={`empty-${i}`} className="mini-day empty"></div>
                        ))}

                        {days.map(day => {
                            const dateStr = day.toISODate();
                            const isHoliday = holidays.some(h => h.date === dateStr);
                            const isWknd = isWeekend(dateStr);
                            const schoolHoliday = schoolHolidays.find(sh => {
                                const start = DateTime.fromISO(sh.start);
                                const end = DateTime.fromISO(sh.end);
                                return day >= start && day <= end.minus({ days: 1 }); // Backend end is exclusive usually
                            });

                            // Find who is away
                            const peopleAway = team.filter(member => {
                                const vList = memberVacations[member.name] || [];
                                return vList.some(v => day >= v.start && day < v.end);
                            });

                            let className = "mini-day";
                            if (isWknd) className += " weekend";
                            if (isHoliday) className += " holiday";
                            if (schoolHoliday) className += " school-holiday";

                            return (
                                <div
                                    key={dateStr}
                                    className={className}
                                    title={`${day.toLocaleString(DateTime.DATE_HUGE)}${isHoliday ? ': ' + holidays.find(h => h.date === dateStr).name : ''}${peopleAway.length > 0 ? '\nAbwesend: ' + peopleAway.map(p => p.name).join(', ') : ''}`}
                                >
                                    <span className="day-number">{day.day}</span>
                                    {peopleAway.length > 0 && (
                                        <div className="away-indicators">
                                            {peopleAway.map(p => (
                                                <div
                                                    key={p.name}
                                                    className="away-dot"
                                                    style={{ backgroundColor: p.color }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card.Body>
            </Card>
        );
    };

    return (
        <div className="yearly-overview animate-in">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="mb-0 gradient-text">📅 Jahresübersicht {year}</h3>
                <div className="d-flex gap-3 align-items-center">
                    <div className="d-flex gap-2 flex-wrap">
                        {team.map(member => (
                            <Badge
                                key={member.id}
                                style={{
                                    backgroundColor: member.color,
                                    fontSize: '0.75rem',
                                    border: '1px solid rgba(0,0,0,0.1)'
                                }}
                            >
                                {member.name}
                            </Badge>
                        ))}
                    </div>
                    <Button variant="outline-primary" size="sm" onClick={() => window.print()}>
                        🖨️ Drucken
                    </Button>
                </div>
            </div>

            <Row g={3} className="row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 g-3">
                {months.map(m => (
                    <Col key={m}>
                        {renderMonth(m)}
                    </Col>
                ))}
            </Row>

            <style jsx>{`
                .mini-calendar-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 1px;
                    background: #eee;
                    border: 1px solid #eee;
                    border-radius: 4px;
                    overflow: hidden;
                }
                .day-header {
                    background: #f8f9fa;
                    font-size: 0.65rem;
                    font-weight: bold;
                    text-align: center;
                    padding: 2px 0;
                    color: #666;
                }
                .mini-day {
                    background: white;
                    min-height: 35px;
                    padding: 2px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    position: relative;
                }
                .mini-day.empty {
                    background: #fdfdfd;
                }
                .mini-day.weekend {
                    background: #fff5f5;
                }
                .mini-day.holiday {
                    background: #ffe3e3;
                }
                .mini-day.school-holiday {
                    background: #f2fdf5;
                    border: 1px dashed #dcfce7;
                }
                .day-number {
                    font-size: 0.7rem;
                    color: #444;
                    font-weight: 500;
                    margin-bottom: 2px;
                }
                .away-indicators {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 1px;
                    justify-content: center;
                    width: 100%;
                }
                .away-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    box-shadow: 0 0 1px rgba(0,0,0,0.2);
                }
                .animate-in {
                    animation: fadeIn 0.4s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @media print {
                    .no-print { display: none !important; }
                    .yearly-overview { background: white; padding: 0; }
                    .mini-month-card { border: 1px solid #ddd; break-inside: avoid; }
                    .app-bg { background: transparent !important; }
                }
            `}</style>
        </div>
    );
}
