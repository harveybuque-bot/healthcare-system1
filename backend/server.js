const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const db = new Database(path.join(__dirname, '..', 'database', 'healthcare.db'));
db.pragma('foreign_keys = ON');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));
    
// READ all patients
app.get('/api/patients', (req, res) => {
  const patients = db.prepare('SELECT * FROM patients').all();
  res.json(patients);
});

// READ one patient
app.get('/api/patients/:id', (req, res) => {
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  res.json(patient);
});

// CREATE a patient
app.post('/api/patients', (req, res) => {
  const { name, birthdate, contact } = req.body;
  if (!name || !birthdate) {
    return res.status(400).json({ error: 'Name and birthdate are required' });
  }
  const result = db
    .prepare('INSERT INTO patients (name, birthdate, contact) VALUES (?, ?, ?)')
    .run(name, birthdate, contact || null);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Patient created' });
});

// UPDATE a patient
app.put('/api/patients/:id', (req, res) => {
  const { name, birthdate, contact } = req.body;
  if (!name || !birthdate) {
    return res.status(400).json({ error: 'Name and birthdate are required' });
  }
  const result = db
    .prepare('UPDATE patients SET name = ?, birthdate = ?, contact = ? WHERE id = ?')
    .run(name, birthdate, contact || null, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Patient not found' });
  res.json({ message: 'Patient updated' });
});

// DELETE a patient
app.delete('/api/patients/:id', (req, res) => {
  const result = db.prepare('DELETE FROM patients WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Patient not found' });
  res.json({ message: 'Patient deleted' });
});

// ---------- DOCTORS ----------
app.get('/api/doctors', (req, res) => {
  const doctors = db.prepare(`
    SELECT doctors.*, departments.name AS department
    FROM doctors
    JOIN departments ON doctors.department_id = departments.id
  `).all();
  res.json(doctors);
});

app.post('/api/doctors', (req, res) => {
  const { name, specialization, department_id } = req.body;
  if (!name || !specialization || !department_id) {
    return res.status(400).json({ error: 'Name, specialization and department are required' });
  }
  try {
    const result = db
      .prepare('INSERT INTO doctors (name, specialization, department_id) VALUES (?, ?, ?)')
      .run(name, specialization, department_id);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Doctor created' });
  } catch (err) {
    res.status(400).json({ error: 'Invalid department' });
  }
});

app.put('/api/doctors/:id', (req, res) => {
  const { name, specialization, department_id } = req.body;
  if (!name || !specialization || !department_id) {
    return res.status(400).json({ error: 'Name, specialization and department are required' });
  }
  try {
    const result = db
      .prepare('UPDATE doctors SET name = ?, specialization = ?, department_id = ? WHERE id = ?')
      .run(name, specialization, department_id, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Doctor not found' });
    res.json({ message: 'Doctor updated' });
  } catch (err) {
    res.status(400).json({ error: 'Invalid department' });
  }
});

app.delete('/api/doctors/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM doctors WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Doctor not found' });
    res.json({ message: 'Doctor deleted' });
  } catch (err) {
    res.status(400).json({ error: 'Cannot delete a doctor who has appointments' });
  }
});

// ---------- DEPARTMENTS ----------
app.get('/api/departments', (req, res) => {
  res.json(db.prepare('SELECT * FROM departments').all());
});

// ---------- APPOINTMENTS ----------
app.get('/api/appointments', (req, res) => {
  const appointments = db.prepare(`
    SELECT appointments.*, patients.name AS patient_name, doctors.name AS doctor_name
    FROM appointments
    JOIN patients ON appointments.patient_id = patients.id
    JOIN doctors ON appointments.doctor_id = doctors.id
    ORDER BY date, time
  `).all();
  res.json(appointments);
});

app.post('/api/appointments', (req, res) => {
  const { patient_id, doctor_id, date, time, notes } = req.body;
  if (!patient_id || !doctor_id || !date || !time) {
    return res.status(400).json({ error: 'Patient, doctor, date and time are required' });
  }
  try {
    const result = db
      .prepare('INSERT INTO appointments (patient_id, doctor_id, date, time, notes) VALUES (?, ?, ?, ?, ?)')
      .run(patient_id, doctor_id, date, time, notes || null);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Appointment Successfully Booked' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'That doctor is already booked at this date and time' });
    }
    res.status(400).json({ error: 'Invalid patient or doctor' });
  }
});

const VALID_TRANSITIONS = {
  'Pending': ['Confirmed', 'Cancelled'],
  'Confirmed': ['Completed', 'Cancelled'],
  'Completed': [],
  'Cancelled': ['Pending']
};

app.put('/api/appointments/:id', (req, res) => {
  const { patient_id, doctor_id, date, time, status, notes } = req.body;
  if (!patient_id || !doctor_id || !date || !time || !status) {
    return res.status(400).json({ error: 'All fields except notes are required' });
  }

  const current = db.prepare('SELECT status FROM appointments WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Appointment not found' });

  if (current.status !== status) {
    const validNext = VALID_TRANSITIONS[current.status] || [];
    if (!validNext.includes(status)) {
      return res.status(400).json({
        error: `Cannot change status from "${current.status}" to "${status}". Allowed next statuses: ${validNext.join(', ') || 'None (visit is already completed)'}`
      });
    }
  }

  try {
    const result = db
      .prepare('UPDATE appointments SET patient_id = ?, doctor_id = ?, date = ?, time = ?, status = ?, notes = ? WHERE id = ?')
      .run(patient_id, doctor_id, date, time, status, notes || null, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ message: 'Appointment updated' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'That doctor is already booked at this date and time' });
    }
    res.status(400).json({ error: 'Invalid data (check status, patient and doctor)' });
  }
});

app.delete('/api/appointments/:id', (req, res) => {
  const result = db.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Appointment not found' });
  res.json({ message: 'Appointment deleted' });
});

app.patch('/api/appointments/:id/status', (req, res) => {
  const { status } = req.body;
  const allowed = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const current = db.prepare('SELECT status FROM appointments WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Appointment not found' });

  if (current.status !== status) {
    const validNext = VALID_TRANSITIONS[current.status] || [];
    if (!validNext.includes(status)) {
      return res.status(400).json({
        error: `Cannot change status from "${current.status}" to "${status}". Allowed next statuses: ${validNext.join(', ') || 'None (visit is already completed)'}`
      });
    }
  }

  const result = db
    .prepare('UPDATE appointments SET status = ? WHERE id = ?')
    .run(status, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Appointment not found' });
  res.json({ message: `Appointment marked as ${status}` });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));