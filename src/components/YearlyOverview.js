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
            <Card className="h-100 mini-month-card">
                <Card.Header className="month-title">
                    {monthName}
                </Card.Header>
                <Card.Body className="p-0">
                    <div className="mini-calendar-grid">
                        <div className="day-header text-danger">S</div>
                        <div className="day-header">M</div>
                        <div className="day-header">T</div>
                        <div className="day-header">W</div>
                        <div className="day-header">T</div>
                        <div className="day-header">F</div>
                        <div className="day-header">S</div>

                        {/* Leading empty cells */}
                        {Array.from({ length: firstDayWeekday }).map((_, i) => (
                            <div key={`empty-${i}`} className="mini-day empty"></div>
                        ))}

                        {days.map(day => {
                            const dateStr = day.toISODate();
                            const isHoliday = holidays.some(h => h.date === dateStr);
                            const isWknd = day.weekday === 6 || day.weekday === 7;
                            const schoolHoliday = schoolHolidays.find(sh => {
                                const start = DateTime.fromISO(sh.start);
                                const end = DateTime.fromISO(sh.end);
                                return day >= start && day < end;
                            });

                            // Track system to keep lines consistent
                            const tracks = team.map(member => {
                                const vList = memberVacations[member.name] || [];
                                if (vList.some(v => day >= v.start && day < v.end)) {
                                    return member.color;
                                }
                                return null;
                            });

                            let className = "mini-day";
                            if (isWknd) className += " weekend";
                            if (isHoliday) className += " holiday";
                            if (schoolHoliday) className += " school-holiday";

                            return (
                                <div
                                    key={dateStr}
                                    className={className}
                                    title={`${day.toLocaleString(DateTime.DATE_HUGE)}${isHoliday ? ': ' + holidays.find(h => h.date === dateStr).name : ''}`}
                                >
                                    <span className="day-number">{day.day}</span>
                                    <div className="away-bars">
                                        {tracks.map((color, idx) => (
                                            <div
                                                key={idx}
                                                className="away-bar"
                                                style={{
                                                    backgroundColor: color || 'transparent',
                                                    height: color ? '3px' : '3px',
                                                    visibility: color ? 'visible' : 'hidden'
                                                }}
                                            />
                                        ))}
                                    </div>
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
            <div className="d-flex justify-content-between align-items-center mb-4 no-print">
                <h3 className="mb-0 gradient-text">📅 Jahresübersicht {year}</h3>
                <div className="d-flex gap-3 align-items-center">
                    <Button variant="outline-primary" size="sm" onClick={() => window.print()}>
                        🖨️ Bericht drucken
                    </Button>
                    <Button variant="secondary" size="sm" onClick={onClose}>
                        Zurück
                    </Button>
                </div>
            </div>

            <Row className="row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-3 g-5 mb-5">
                {months.map(m => (
                    <Col key={m}>
                        {renderMonth(m)}
                    </Col>
                ))}
            </Row>

            <div className="legend mt-5 p-4 bg-white rounded shadow-sm no-print">
                <h6 className="mb-3 fw-bold text-uppercase" style={{ letterSpacing: '1px' }}>Team-Legende</h6>
                <div className="d-flex flex-wrap gap-4">
                    {team.map(member => (
                        <div key={member.id} className="d-flex align-items-center gap-2">
                            <div className="away-dot" style={{ backgroundColor: member.color, width: 14, height: 14 }}></div>
                            <span className="fw-semibold" style={{ fontSize: '0.9rem' }}>{member.name}</span>
                        </div>
                    ))}
                </div>
                <hr />
                <div className="d-flex gap-4 mt-3">
                    <div className="d-flex align-items-center gap-2">
                        <div className="mini-day holiday" style={{ width: 22, height: 22, minHeight: 'auto' }}></div>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Feiertag</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <div className="mini-day school-holiday" style={{ width: 22, height: 22, minHeight: 'auto' }}></div>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Schulferien</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <div className="mini-day weekend" style={{ width: 22, height: 22, minHeight: 'auto' }}></div>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Wochenende</span>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .yearly-overview {
                    max-width: 1300px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .mini-calendar-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    border: none;
                }
                .day-header {
                    font-size: 0.85rem;
                    font-weight: 800;
                    text-align: center;
                    padding: 10px 0;
                    color: #111;
                    border-bottom: 2px solid #111;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                }
                .mini-day {
                    background: transparent;
                    min-height: 52px;
                    padding: 4px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    position: relative;
                    transition: background 0.2s ease;
                }
                .mini-day:hover:not(.empty) {
                    background: #f8fafc;
                    border-radius: 4px;
                }
                .mini-day.weekend .day-number {
                    color: #ef4444;
                }
                .mini-day.holiday {
                    background-color: #fee2e2;
                    border-radius: 4px;
                }
                .mini-day.school-holiday {
                    border-bottom: 2px solid #22c55e;
                }
                .day-number {
                    font-size: 0.85rem;
                    color: #111;
                    font-weight: 700;
                    margin-bottom: 2px;
                }
                .away-bars {
                    display: flex;
                    flex-direction: column;
                    gap: 0px;
                    width: 100%;
                }
                .away-bar {
                    width: 100%;
                    transition: all 0.2s;
                }
                .month-title {
                    background: transparent !important;
                    color: #000 !important;
                    font-size: 1.8rem !important;
                    font-weight: 800 !important;
                    border: none;
                    text-align: center;
                    padding-bottom: 10px;
                    letter-spacing: -0.5px;
                }
                .legend {
                    max-width: 1300px;
                    margin-left: auto;
                    margin-right: auto;
                }
                @media print {
                    .no-print { display: none !important; }
                    .yearly-overview { background: white; padding: 0; max-width: 100%; }
                    .mini-month-card { break-inside: avoid; margin-bottom: 40px; }
                    .month-title { font-size: 2.2rem !important; }
                }
            `}</style>
        </div>
    );
}
