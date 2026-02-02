"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Container, Row, Col, Card, Button, Form, Modal, Alert, ListGroup, Spinner, Badge } from "react-bootstrap";
import {
  fetchVacations,
  addVacation,
  deleteVacation,
  updateVacation,
  fetchTeamWithColors,
  addTeamMember,
  deleteTeamMember,
  getColorForMember
} from "@/lib/api";
import { getHolidaysForYears, getSchoolHolidaysBW } from "@/lib/holidays";
import Dashboard from "@/components/Dashboard";

const LOGIN_PASSWORD = 'Admin';
const CORRECTION_PASSWORD = 'sapfi';

export default function Home() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Data state
  const [vacations, setVacations] = useState([]);
  const [team, setTeam] = useState([]);
  const [availableColors, setAvailableColors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calendar view state for dashboard
  const [currentViewStart, setCurrentViewStart] = useState(null);
  const [currentViewEnd, setCurrentViewEnd] = useState(null);

  // Booking modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedRange, setSelectedRange] = useState({ start: '', end: '' });
  const [selectedMember, setSelectedMember] = useState('');
  const [vertreter, setVertreter] = useState('');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');

  // Team management state
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberColor, setNewMemberColor] = useState('');
  const [showTeamDeleteConfirm, setShowTeamDeleteConfirm] = useState(null);
  const [teamDeletePassword, setTeamDeletePassword] = useState('');

  // UI state
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const calendarRef = useRef(null);

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [vacData, teamData] = await Promise.all([
        fetchVacations(),
        fetchTeamWithColors()
      ]);
      setVacations(Array.isArray(vacData) ? vacData : []);
      setTeam(Array.isArray(teamData.team) ? teamData.team : teamData);
      setAvailableColors(teamData.availableColors || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
    }
  }, [isLoggedIn]);

  // Login handler
  const handleLogin = (e) => {
    e.preventDefault();
    if (loginPassword === LOGIN_PASSWORD) {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Falsches Passwort!');
    }
  };

  // Handle calendar date selection
  const handleDateSelect = (info) => {
    setSelectedRange({
      start: info.startStr,
      end: info.endStr
    });
    setSelectedMember(team.length > 0 ? team[0].name : '');
    setVertreter('');
    setErrorMsg('');
    setShowModal(true);
  };

  // Handle event click for deletion
  const handleEventClick = (info) => {
    const vacation = vacations.find(v => v.id === info.event.id);
    if (vacation) {
      setDeleteTarget(vacation);
      setDeletePassword('');
      setShowDeleteModal(true);
    }
  };

  // Handle calendar view change - update dashboard period
  const handleDatesSet = (dateInfo) => {
    setCurrentViewStart(dateInfo.startStr);
    setCurrentViewEnd(dateInfo.endStr);
  };

  // Book vacation
  const handleBooking = async () => {
    if (!selectedMember) {
      setErrorMsg('Bitte wähle ein Teammitglied aus.');
      return;
    }

    if (new Date(selectedRange.end) < new Date(selectedRange.start)) {
      setErrorMsg('Das Enddatum darf nicht vor dem Startdatum liegen.');
      return;
    }

    const result = await addVacation({
      name: selectedMember,
      start: selectedRange.start,
      end: selectedRange.end,
      vertreter
    });

    if (result.success) {
      setSuccessMsg('Urlaub erfolgreich eingetragen!');
      setShowModal(false);
      loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setErrorMsg(result.message || 'Fehler beim Buchen.');
    }
  };

  // Delete vacation
  const handleDelete = async () => {
    if (!deleteTarget) return;

    const result = await deleteVacation(deleteTarget.id, deletePassword);

    if (result.success) {
      setSuccessMsg('Eintrag gelöscht!');
      setShowDeleteModal(false);
      setDeleteTarget(null);
      loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setErrorMsg(result.message || 'Fehler beim Löschen.');
    }
  };

  // Handle drag and drop / resize
  const handleEventChange = async (info) => {
    const result = await updateVacation(
      info.event.id,
      info.event.startStr,
      info.event.endStr || info.event.startStr
    );

    if (!result.success) {
      info.revert();
      setErrorMsg(result.message || 'Fehler beim Aktualisieren.');
      setTimeout(() => setErrorMsg(''), 3000);
    } else {
      loadData();
    }
  };

  // Add team member with color
  const handleAddMember = async () => {
    if (!newMemberName.trim()) {
      setErrorMsg('Bitte gib einen Namen ein.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }
    if (!newMemberColor) {
      setErrorMsg('Bitte wähle eine Farbe.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    const result = await addTeamMember(newMemberName.trim(), newMemberColor);

    if (result.success) {
      setNewMemberName('');
      setNewMemberColor('');
      loadData();
    } else {
      setErrorMsg(result.message || 'Fehler beim Hinzufügen.');
      setTimeout(() => setErrorMsg(''), 3000);
    }
  };

  // Remove team member
  const handleRemoveMember = async (id) => {
    const result = await deleteTeamMember(id, teamDeletePassword);

    if (result.success) {
      setShowTeamDeleteConfirm(null);
      setTeamDeletePassword('');
      loadData();
    } else {
      setErrorMsg(result.message || 'Fehler beim Entfernen.');
      setTimeout(() => setErrorMsg(''), 3000);
    }
  };

  // Convert vacations to calendar events
  const calendarEvents = vacations.map(v => ({
    id: v.id,
    title: v.vertreter ? `${v.name} (V: ${v.vertreter})` : v.name,
    start: v.start,
    end: v.end,
    allDay: true,
    backgroundColor: getColorForMember(team, v.name),
    borderColor: getColorForMember(team, v.name),
    textColor: '#333'
  }));

  // Get holidays for display in calendar
  const holidayEvents = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const holidays = getHolidaysForYears([currentYear - 1, currentYear, currentYear + 1]);

    return holidays.map(h => ({
      id: `holiday-${h.date}`,
      title: `🚩 ${h.name} (Feiertag)`,
      start: h.date,
      allDay: true,
      display: 'background',
      backgroundColor: 'rgba(255, 107, 107, 0.2)', // Semi-transparent red
      borderColor: '#ff6b6b',
      classNames: ['holiday-event']
    }));
  }, []);

  // Get school holidays
  const schoolHolidayEvents = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const schoolHolidays = getSchoolHolidaysBW(currentYear);

    return schoolHolidays.map(s => ({
      id: `school-${s.name}-${s.start}`,
      title: `🎓 ${s.name}`,
      start: s.start,
      end: s.end,
      allDay: true,
      display: 'background',
      backgroundColor: 'rgba(52, 168, 83, 0.15)', // Semi-transparent green
      borderColor: '#34a853',
      classNames: ['school-holiday-event']
    }));
  }, []);

  // Combine all events
  const allCalendarEvents = [...calendarEvents, ...holidayEvents, ...schoolHolidayEvents];

  // Get used color IDs
  const usedColorIds = team.map(m => m.colorId).filter(Boolean);

  // Dynamic "Dream Team" background elements
  const dreamTeamElements = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      delay: Math.random() * 10,
      duration: 15 + Math.random() * 25,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 0.8 + Math.random() * 2,
      opacity: 0.05 + Math.random() * 0.1
    }));
  }, []);

  // Login Screen
  if (!isLoggedIn) {
    return (
      <Container fluid className="vh-100 d-flex align-items-center justify-content-center login-bg position-relative overflow-hidden">
        {/* Dynamic Background Elements */}
        <div className="dream-team-container">
          {dreamTeamElements.map(el => (
            <div
              key={el.id}
              className="dream-team-text"
              style={{
                left: `${el.left}%`,
                top: `${el.top}%`,
                animationDelay: `-${el.delay}s`,
                animationDuration: `${el.duration}s`,
                fontSize: `${el.size}rem`,
                opacity: el.opacity
              }}
            >
              Dream Team
            </div>
          ))}
        </div>
        <Card className="shadow-lg login-card">
          <Card.Body className="p-5">
            <div className="text-center mb-4">
              <img src="/beach-logo.svg" alt="Logo" width="80" height="auto" className="mb-3 app-logo" />
              <h3 className="gradient-text mb-0">FI Team Vacation Hub</h3>
              <div className="text-muted small">2026 Edition</div>
              <div className="mt-2" style={{ fontSize: '0.9rem', color: '#666' }}>
                created for Dream Team ❤️ <br />
                <span style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>für bessere Planung</span>
              </div>
            </div>
            <Form onSubmit={handleLogin}>
              <Form.Group className="mb-3">
                <Form.Control
                  type="password"
                  placeholder="Passwort eingeben..."
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="text-center login-input"
                />
              </Form.Group>
              {loginError && <Alert variant="danger" className="py-2">{loginError}</Alert>}
              <Button variant="primary" type="submit" className="w-100 login-btn">
                Anmelden
              </Button>
            </Form>
          </Card.Body>
        </Card>
        <style jsx global>{`
                    .login-bg {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    }
                    .login-card {
                        max-width: 400px;
                        width: 100%;
                        border-radius: 20px;
                        border: none;
                    }
                    .gradient-text {
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        font-weight: 700;
                    }
                    .login-input {
                        border-radius: 10px;
                        padding: 12px;
                        border: 2px solid #eee;
                    }
                    .login-input:focus {
                        border-color: #667eea;
                        box-shadow: none;
                    }
                    .login-btn {
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        border: none;
                        border-radius: 10px;
                        padding: 12px;
                        font-weight: 600;
                    }
                `}</style>
        <style jsx>{`
                    .dream-team-container {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        pointer-events: none;
                        z-index: 0;
                    }
                    .dream-team-text {
                        position: absolute;
                        color: white;
                        font-weight: 900;
                        white-space: nowrap;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        user-select: none;
                        animation: floatAround linear infinite;
                        filter: blur(1px);
                        transition: all 0.5s ease;
                    }
                    @keyframes floatAround {
                        0% { transform: translate(0, 0) rotate(0deg); }
                        25% { transform: translate(50px, 50px) rotate(5deg); }
                        50% { transform: translate(0, 100px) rotate(0deg); }
                        75% { transform: translate(-50px, 50px) rotate(-5deg); }
                        100% { transform: translate(0, 0) rotate(0deg); }
                    }
                    .login-card {
                        z-index: 10;
                        position: relative;
                        backdrop-filter: blur(10px);
                        background: rgba(255, 255, 255, 0.9);
                    }
                    .app-logo {
                        transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                        cursor: pointer;
                        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
                    }
                    .app-logo:hover {
                        transform: scale(1.15) rotate(5deg);
                        filter: drop-shadow(0 8px 15px rgba(102, 126, 234, 0.4)) brightness(1.1);
                    }
                `}</style>
      </Container>
    );
  }

  // Main Application
  return (
    <Container fluid className="py-3 app-bg">
      {/* Header */}
      <Row className="mb-3">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-0 d-flex align-items-center">
                <img src="/beach-logo.svg" alt="Logo" width="40" height="auto" className="me-2 app-logo" />
                <span className="gradient-text">FI Team Vacation Hub 2026</span>
              </h2>
            </div>
            <Button variant="outline-secondary" size="sm" onClick={() => setIsLoggedIn(false)}>
              Abmelden
            </Button>
          </div>
        </Col>
      </Row>

      {/* Success/Error Alerts */}
      {successMsg && <Alert variant="success" className="mb-3">{successMsg}</Alert>}
      {errorMsg && <Alert variant="danger" className="mb-3" onClose={() => setErrorMsg('')} dismissible>{errorMsg}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Lade Daten...</p>
        </div>
      ) : (
        <Row>
          {/* Left Column - Team Management & Calendar */}
          <Col lg={8} xl={9}>
            {/* Team Management */}
            <Card className="mb-3 shadow-sm">
              <Card.Header className="bg-gradient-purple text-white fw-bold d-flex justify-content-between align-items-center">
                <span>👥 Teammitglieder</span>
                <Badge bg="light" text="dark">{team.length} Mitglieder</Badge>
              </Card.Header>
              <Card.Body className="py-2">
                {/* Team List */}
                <div className="team-list d-flex flex-wrap gap-2 mb-3">
                  {team.map(member => (
                    <div
                      key={member.id}
                      className="team-badge d-flex align-items-center"
                      style={{ backgroundColor: member.color + '33', borderColor: member.color }}
                    >
                      <span
                        className="color-dot me-2"
                        style={{ backgroundColor: member.color }}
                      />
                      <span className="me-2 fw-medium">{member.name}</span>
                      {showTeamDeleteConfirm === member.id ? (
                        <div className="d-flex align-items-center">
                          <Form.Control
                            type="password"
                            size="sm"
                            placeholder="sapfi"
                            value={teamDeletePassword}
                            onChange={(e) => setTeamDeletePassword(e.target.value)}
                            style={{ width: 80 }}
                          />
                          <Button
                            variant="danger"
                            size="sm"
                            className="ms-1 py-0"
                            onClick={() => handleRemoveMember(member.id)}
                          >✓</Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="ms-1 py-0"
                            onClick={() => {
                              setShowTeamDeleteConfirm(null);
                              setTeamDeletePassword('');
                            }}
                          >✕</Button>
                        </div>
                      ) : (
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 text-danger"
                          onClick={() => setShowTeamDeleteConfirm(member.id)}
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add New Member Form */}
                <div className="add-member-form">
                  <Row className="align-items-end g-2">
                    <Col xs={12} md={4}>
                      <Form.Label className="small mb-1">Name</Form.Label>
                      <Form.Control
                        size="sm"
                        placeholder="Neues Mitglied..."
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                      />
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Label className="small mb-1">Farbe wählen</Form.Label>
                      <div className="color-picker d-flex flex-wrap gap-1">
                        {availableColors.map(color => {
                          const isUsed = usedColorIds.includes(color.id);
                          const isSelected = newMemberColor === color.id;
                          return (
                            <div
                              key={color.id}
                              className={`color-option ${isSelected ? 'selected' : ''} ${isUsed ? 'used' : ''}`}
                              style={{ backgroundColor: color.hex }}
                              title={isUsed ? `${color.name} (vergeben)` : color.name}
                              onClick={() => !isUsed && setNewMemberColor(color.id)}
                            >
                              {isSelected && '✓'}
                              {isUsed && '✕'}
                            </div>
                          );
                        })}
                      </div>
                    </Col>
                    <Col xs={12} md={2}>
                      <Button
                        variant="success"
                        size="sm"
                        className="w-100"
                        onClick={handleAddMember}
                      >
                        + Hinzufügen
                      </Button>
                    </Col>
                  </Row>
                </div>
              </Card.Body>
            </Card>

            {/* Calendar */}
            <Card className="shadow-sm calendar-card">
              <Card.Body>
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  locale="de"
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth'
                  }}
                  events={allCalendarEvents}
                  eventDisplay="block"
                  selectable={true}
                  editable={true}
                  eventResizableFromStart={true}
                  select={handleDateSelect}
                  eventClick={handleEventClick}
                  eventDrop={handleEventChange}
                  eventResize={handleEventChange}
                  datesSet={handleDatesSet}
                  height="auto"
                  firstDay={1}
                  buttonText={{
                    today: 'Heute',
                    month: 'Monat'
                  }}
                  eventContent={(arg) => {
                    if (arg.event.display === 'background') {
                      return (
                        <div className={`fc-bg-event-content ${arg.event.classNames.join(' ')}`} style={{
                          fontSize: '0.65rem',
                          padding: '2px',
                          display: 'block',
                          width: '100%',
                          height: '100%',
                          position: 'relative'
                        }}>
                          <span className="bg-label" style={{
                            position: 'absolute',
                            left: '2px',
                            maxWidth: '95%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            zIndex: 2,
                            ...(arg.event.id.startsWith('holiday') ? { top: '2px', fontWeight: 'bold', color: '#b91c1c' } : { bottom: '2px', fontStyle: 'italic', color: '#15803d' })
                          }}>
                            {arg.event.title}
                          </span>
                        </div>
                      );
                    }
                    // For normal vacation events, we want the visible bar with title
                    return (
                      <div style={{
                        padding: '2px 4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: '500',
                        fontSize: '0.85rem'
                      }}>
                        {arg.event.title}
                      </div>
                    );
                  }}
                  eventDidMount={(info) => {
                    // Add tooltip for all events
                    if (info.event.title) {
                      info.el.title = info.event.title;
                    }
                  }}
                />
              </Card.Body>
            </Card>
          </Col>

          {/* Right Column - Dashboard */}
          <Col lg={4} xl={3}>
            <Dashboard
              vacations={vacations}
              team={team}
              currentViewStart={currentViewStart}
              currentViewEnd={currentViewEnd}
            />
          </Col>
        </Row>
      )}

      {/* Booking Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="bg-gradient-purple text-white">
          <Modal.Title>🗓️ Urlaub buchen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

          <Form.Group className="mb-3">
            <Form.Label>Mitarbeiter</Form.Label>
            <Form.Select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
            >
              <option value="">-- Bitte wählen --</option>
              {team.map(m => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Row>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Von</Form.Label>
                <Form.Control
                  type="date"
                  value={selectedRange.start}
                  onChange={(e) => setSelectedRange(prev => ({ ...prev, start: e.target.value }))}
                />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Bis</Form.Label>
                <Form.Control
                  type="date"
                  value={selectedRange.end}
                  onChange={(e) => setSelectedRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Vertretung (optional)</Form.Label>
            <Form.Select
              value={vertreter}
              onChange={(e) => setVertreter(e.target.value)}
            >
              <option value="">-- Keine --</option>
              {team.filter(m => m.name !== selectedMember).map(m => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Abbrechen
          </Button>
          <Button variant="primary" onClick={handleBooking}>
            Jetzt buchen
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title>🗑️ Eintrag löschen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteTarget && (
            <div className="mb-3">
              <p><strong>{deleteTarget.name}</strong></p>
              <p>{deleteTarget.start} bis {deleteTarget.end}</p>
            </div>
          )}
          <Form.Group>
            <Form.Label>Passwort für Korrektur (sapfi)</Form.Label>
            <Form.Control
              type="password"
              placeholder="sapfi eingeben..."
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Abbrechen
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Löschen
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx global>{`
                /* Animations */
                @keyframes gradientBG {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }

                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                    100% { transform: translateY(0px); }
                }

                /* Backgrounds */
                .app-bg {
                    min-height: 100vh;
                    background: linear-gradient(-45deg, #f3f4f6, #e0e7ff, #f3e8ff, #f3f4f6);
                    background-size: 400% 400%;
                    animation: gradientBG 20s ease infinite;
                }

                .login-bg {
                    background: linear-gradient(-45deg, #667eea, #764ba2, #6B8DD6, #8E37D7);
                    background-size: 400% 400%;
                    animation: gradientBG 10s ease infinite;
                }

                .bg-gradient-purple {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                }

                /* Typography */
                .gradient-text {
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    font-weight: 800;
                    letter-spacing: -0.5px;
                }

                /* Interactive Team Badges */
                .team-badge {
                    padding: 8px 14px;
                    border-radius: 20px;
                    border: 2px solid;
                    font-size: 0.85rem;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                    cursor: default;
                    background: rgba(255,255,255,0.8);
                    backdrop-filter: blur(5px);
                }

                .team-badge:hover {
                    transform: scale(1.1) translateY(-2px) rotate(1deg);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.1);
                    z-index: 10;
                }

                /* Premium Buttons */
                .btn-primary, .login-btn {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                    border: none !important;
                    box-shadow: 0 4px 6px rgba(50, 50, 93, 0.11), 0 1px 3px rgba(0, 0, 0, 0.08);
                    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
                    position: relative;
                    overflow: hidden;
                    z-index: 1;
                }

                .btn-primary:hover, .login-btn:hover {
                    transform: translateY(-3px) scale(1.02);
                    box-shadow: 0 12px 20px rgba(118, 75, 162, 0.4), 0 4px 8px rgba(0, 0, 0, 0.1);
                    filter: brightness(1.1);
                }
                
                .btn-primary:active, .login-btn:active {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px rgba(50, 50, 93, 0.11);
                }

                /* Color Picker Interactions */
                .color-option {
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    cursor: pointer;
                    border: 3px solid white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    font-weight: bold;
                    color: white;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }

                .color-option:hover:not(.used) {
                    transform: scale(1.25);
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                    z-index: 5;
                }

                .color-option.selected {
                    border-color: #333;
                    transform: scale(1.1);
                }

                /* Calendar Styling Enhancements */
                .calendar-card {
                    border: none;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.05) !important;
                    transition: transform 0.3s ease;
                }
                
                .calendar-card:hover {
                    transform: translateY(-2px);
                }

                .calendar-card .fc-button-primary {
                    background: linear-gradient(135deg, #667eea, #764ba2) !important;
                    border: none !important;
                    transition: all 0.3s ease;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .calendar-card .fc-button-primary:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
                    filter: brightness(1.1);
                }
                
                .fc-bg-event {
                    opacity: 0.4 !important;
                }
                
                .holiday-event {
                    background: repeating-linear-gradient(
                        45deg,
                        rgba(255, 107, 107, 0.1),
                        rgba(255, 107, 107, 0.1) 10px,
                        rgba(255, 107, 107, 0.15) 10px,
                        rgba(255, 107, 107, 0.15) 20px
                    ) !important;
                }

                .school-holiday-event {
                    background: repeating-linear-gradient(
                        -45deg,
                        rgba(52, 168, 83, 0.05),
                        rgba(52, 168, 83, 0.05) 10px,
                        rgba(52, 168, 83, 0.1) 10px,
                        rgba(52, 168, 83, 0.1) 20px
                    ) !important;
                }
                
                .fc-bg-event-content {
                    pointer-events: none !important;
                }
                
                /* Custom styling for the vacation bars to make them look premium */
                .fc-h-event {
                    border: none !important;
                    border-radius: 4px !important;
                    margin-bottom: 1px !important;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    transition: all 0.2s ease;
                }
                
                .fc-h-event:hover {
                    filter: brightness(0.95);
                    transform: translateY(-1px);
                    box-shadow: 0 3px 6px rgba(0,0,0,0.15);
                    z-index: 10 !important;
                }

                .fc-daygrid-day-number {
                    color: #555;
                    font-weight: 600;
                    text-decoration: none !important;
                }

                .fc-daygrid-day-top {
                    flex-direction: row;
                }

                /* Weekend Colors */
                .fc-daygrid-day.fc-day-sat, .fc-daygrid-day.fc-day-sun {
                    background-color: rgba(248, 249, 250, 0.5);
                }

                .fc-daygrid-day.fc-day-sat .fc-daygrid-day-number,
                .fc-daygrid-day.fc-day-sun .fc-daygrid-day-number {
                    color: #ff6b6b !important;
                }
            `}</style>
    </Container>
  );
}
