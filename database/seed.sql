INSERT INTO departments (name) VALUES ('Cardiology'), ('Pediatrics'), ('General Medicine');

INSERT INTO doctors (name, specialization, department_id) VALUES
  ('Dr. Maria Santos', 'Cardiologist', 1),
  ('Dr. Juan Reyes', 'Pediatrician', 2),
  ('Dr. Ana Cruz', 'General Practitioner', 3);

INSERT INTO patients (name, birthdate, contact) VALUES
  ('Pedro Dela Cruz', '1990-05-14', '0917-000-0001'),
  ('Lisa Garcia', '1985-11-02', '0917-000-0002'),
  ('Mark Lim', '2015-03-21', '0917-000-0003');

INSERT INTO appointments (patient_id, doctor_id, date, time, status, notes) VALUES
  (1, 1, '2026-11-02', '09:00', 'Confirmed', 'Routine heart check'),
  (2, 3, '2026-11-03', '10:30', 'Pending', 'Fever and cough'),
  (3, 2, '2026-11-04', '14:00', 'Pending', 'Vaccination');