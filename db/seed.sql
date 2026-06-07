-- db/seed.sql — Demo data for the dashboard.
-- These are the same German sample inquiries from the design prototype, loaded into
-- the `inquiries` table so the dashboard can be seen populated without real emails.
--
-- Run:
--   PGPASSWORD=zuk_prototype_2026 psql -h localhost -p 5434 -U zuk -d zuk -f db/seed.sql
--
-- Start over (deletes only the demo inquiries):
--   DELETE FROM inquiries WHERE conversation_id LIKE 'demo-%';

DELETE FROM inquiries WHERE conversation_id LIKE 'demo-%';

-- 1) Phone call — Pfarrjugend St. Michael (Sommerfreizeit, ready for review)
INSERT INTO inquiries
  (received_at, channel, tracker_status, responsible_area, customer_email,
   original_subject, conversation_id, school_name, contact_person, program_type,
   house, date_range, number_of_people, grade_level, special_requirements,
   missing_fields, contains_sensitive_data, sensitive_data_note, summary, raw_body)
VALUES
  (NOW() - INTERVAL '12 minutes', 'phone', 'ready_for_review', 'Jugendherberge bookings',
   'l.brunner@pfarrei-st-michael-augsburg.de', 'Anruf: Sommerfreizeit 12.–17. Juli',
   'demo-phone-0412', 'Pfarrjugend St. Michael, Augsburg', 'Lukas Brunner', 'Sommerfreizeit',
   'Jugendherberge', '12.07.2026–17.07.2026', '28 + 3 Leitung', '', 'Vollpension; Vegetarier offen',
   '', FALSE, '', 'Telefonische Anfrage für eine Sommerfreizeit, 28 Jugendliche, Vollpension.',
   E'DB: Don Bosco Buchungsbüro, guten Morgen.\nAnrufer: Guten Morgen, hier ist Lukas Brunner von der Pfarrjugend St. Michael in Augsburg.\nAnrufer: Wir würden gern eine Sommerfreizeit machen, vom zwölften bis siebzehnten Juli.\nDB: Sehr schön. Für wie viele Personen?\nAnrufer: Wir wären 28 Jugendliche und 3 Begleitpersonen.\nDB: Und Verpflegung?\nAnrufer: Vollpension wäre super. Vegetarier muss ich noch nachfragen.');

-- 2) Email with 4 bookings — Realschule Bruckmühl (same conversation)
INSERT INTO inquiries
  (received_at, channel, tracker_status, responsible_area, customer_email,
   original_subject, conversation_id, school_name, contact_person, program_type,
   house, date_range, number_of_people, grade_level, special_requirements,
   missing_fields, summary, raw_body)
VALUES
  (NOW() - INTERVAL '1 hour', 'email', 'ready_for_review', 'Jugendherberge bookings',
   'baggi@realschule-bruckmuehl.de', '4 Klassen · 15.–20. Februar (Schullandheim)',
   'demo-0411', 'Realschule Bruckmühl', 'Sabine Baggi', 'Schullandheim',
   'Jugendherberge', '15.02.2026–17.02.2026', '27 + 2', '8a', 'Vollpension',
   '', 'Eine E-Mail mit vier Klassen, zwei Terminen. Vollpension wie immer.',
   E'Sehr geehrte Damen und Herren,\n\nzunächst möchte ich mich für die schönen Tage im letzten Jahr bedanken. Wir würden gern erneut mit vier Klassen kommen:\n\nKlasse 8a und 8b gemeinsam vom 15.–17. Februar, je rund 27 Schüler + 2 Begleitungen; Klasse 9a und 9b vom 18.–20. Februar, ebenfalls je ca. 28 Schüler.\n\nIst das bei Ihnen möglich? Vollpension wäre wie immer super.\n\nHerzliche Grüße\nSabine Baggi · Realschule Bruckmühl'),
  (NOW() - INTERVAL '1 hour', 'email', 'ready_for_review', 'Jugendherberge bookings',
   'baggi@realschule-bruckmuehl.de', '4 Klassen · 15.–20. Februar (Schullandheim)',
   'demo-0411', 'Realschule Bruckmühl', 'Sabine Baggi', 'Schullandheim',
   'Jugendherberge', '15.02.2026–17.02.2026', '26 + 2', '8b', 'Vollpension',
   '', 'Klasse 8b.', E'(siehe Sammelmail Realschule Bruckmühl)'),
  (NOW() - INTERVAL '1 hour', 'email', 'ready_for_review', 'Jugendherberge bookings',
   'baggi@realschule-bruckmuehl.de', '4 Klassen · 15.–20. Februar (Schullandheim)',
   'demo-0411', 'Realschule Bruckmühl', 'Sabine Baggi', 'Schullandheim',
   'Jugendherberge', '18.02.2026–20.02.2026', '29 + 2', '9a', 'Vollpension',
   '', 'Klasse 9a.', E'(siehe Sammelmail Realschule Bruckmühl)'),
  (NOW() - INTERVAL '1 hour', 'email', 'ready_for_review', 'Jugendherberge bookings',
   'baggi@realschule-bruckmuehl.de', '4 Klassen · 15.–20. Februar (Schullandheim)',
   'demo-0411', 'Realschule Bruckmühl', 'Sabine Baggi', 'Schullandheim',
   'Jugendherberge', '18.02.2026–20.02.2026', '28 + 2', '9b', 'Vollpension',
   '', 'Klasse 9b.', E'(siehe Sammelmail Realschule Bruckmühl)');

-- 3) Incomplete call — Schule unbekannt (missing data)
INSERT INTO inquiries
  (received_at, channel, tracker_status, responsible_area, customer_email,
   original_subject, conversation_id, school_name, contact_person, program_type,
   house, date_range, number_of_people, grade_level, special_requirements,
   missing_fields, summary, raw_body)
VALUES
  (NOW() - INTERVAL '2 hours', 'phone', 'needs_info', 'unassigned',
   '', 'Anruf: Allgemeine Anfrage Sommer',
   'demo-phone-0410', '', 'Max Mustermann', '',
   '', 'Sommer (unklar)', '', '', '',
   'school_name, number_of_people', 'Unklare Anfrage, Schule und Personenzahl fehlen.',
   E'DB: Don Bosco Buchungsbüro, guten Tag.\nAnrufer: Hallo, ich bin Max Mustermann. Wir würden gern mal im Sommer vorbeikommen.\nDB: Gern. Um welche Gruppe oder Schule handelt es sich?\nAnrufer: Ach, das sage ich Ihnen später, ich muss los — ich melde mich nochmal.');

-- 4) Email — Gymnasium Holzkirchen (Orientierungstage, assigned to Andrea)
INSERT INTO inquiries
  (received_at, channel, tracker_status, responsible_area, customer_email,
   original_subject, conversation_id, school_name, contact_person, program_type,
   house, date_range, number_of_people, grade_level, special_requirements,
   missing_fields, assigned_to, summary, raw_body)
VALUES
  (NOW() - INTERVAL '1 day', 'email', 'ready_for_review', 'Aktionszentrum bookings',
   'wieland@gym-holzkirchen.de', 'Orientierungstage Herbst, 9. Jahrgangsstufe',
   'demo-0409', 'Gymnasium Holzkirchen', 'Thomas Wieland', 'Orientierungstage',
   'Aktionszentrum', 'Mitte Oktober 2026', 'ca. 60 (2 Klassen)', '9. Jahrgangsstufe', '',
   '', 'andrea', 'Orientierungstage im Herbst für zwei 9. Klassen.',
   E'Hallo zusammen,\n\nwir sind eine 9. Jahrgangsstufe und interessieren uns für Orientierungstage im Herbst, am liebsten Mitte Oktober. Es wären rund 60 Schüler in zwei Klassen.\n\nKönnen Sie uns mögliche Termine nennen?\n\nBeste Grüße\nThomas Wieland');

-- 5) Phone call — KJG Sankt Anna (Schulungswochenende, assigned to Andrea)
INSERT INTO inquiries
  (received_at, channel, tracker_status, responsible_area, customer_email,
   original_subject, conversation_id, school_name, contact_person, program_type,
   house, date_range, number_of_people, grade_level, special_requirements,
   missing_fields, assigned_to, summary, raw_body)
VALUES
  (NOW() - INTERVAL '1 day', 'phone', 'ready_for_review', 'Aktionszentrum bookings',
   'vorstand@kjg-st-anna.de', 'Anruf: Schulungswochenende August',
   'demo-phone-0408', 'KJG Sankt Anna, Regensburg', 'Theresa Aigner', 'Gruppenleiter-Schulung',
   'Aktionszentrum', '03.08.2026–07.08.2026', '22', '', 'Vollpension; 1 Seminarraum',
   '', 'andrea', 'Schulungswochenende, 22 Personen, Vollpension + Seminarraum.',
   E'DB: Don Bosco Buchungsbüro.\nAnrufer: Hallo, Theresa Aigner von der KJG Sankt Anna. Wir bräuchten ein Schulungswochenende.\nAnrufer: Vom 3. bis 7. August, wir sind 22 Personen.\nDB: Verpflegung?\nAnrufer: Vollpension, bitte. Einen Seminarraum bräuchten wir auch.');

-- 6) Email — Mittelschule Miesbach (sensitive data: allergy!)
INSERT INTO inquiries
  (received_at, channel, tracker_status, responsible_area, customer_email,
   original_subject, conversation_id, school_name, contact_person, program_type,
   house, date_range, number_of_people, grade_level, special_requirements,
   missing_fields, contains_sensitive_data, sensitive_data_note, summary, raw_body)
VALUES
  (NOW() - INTERVAL '2 days', 'email', 'ready_for_review', 'Jugendherberge bookings',
   'hofstetter@ms-miesbach.de', 'Finale Zahlen + Allergien für Aufenthalt 03.06.',
   'demo-0407', 'Mittelschule Miesbach', 'Verena Hofstetter', 'Schullandheim (Bestandsvorgang)',
   'Jugendherberge', '03.06.2026', '24 + 2', '', '14 w / 10 m; 2 vegetarisch; Anreise ca. 11:00',
   '', TRUE, 'Allergie (Nuss) bei einzelner Person genannt — vertraulich behandeln.',
   'Finale Teilnehmerzahlen und Allergie-Hinweis für bestehenden Aufenthalt.',
   E'Guten Tag,\n\nanbei wie gewünscht die finalen Zahlen: 24 Schüler (14 w / 10 m) und 2 Begleitungen.\n\nEs gibt 2 vegetarische Teilnehmer und eine Nussallergie. Anreise wie geplant am 3. Juni gegen 11 Uhr.\n\nVielen Dank\nVerena Hofstetter');
