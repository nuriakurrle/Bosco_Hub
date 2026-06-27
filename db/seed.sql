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


-- ============================================================
-- Realistische Beispiel-Anfragen aus den Interview-Dokumenten
-- ============================================================
-- Realistische Beispiel-Anfragen (aus interviews/*.docx, anonymisiert).
-- Feldwerte sind so gewählt, dass sie WÖRTLICH im raw_body vorkommen, damit die
-- Markierungen (Schule/Kontakt/Datum/Personen/Programm) im Text greifen.
DELETE FROM inquiries WHERE conversation_id LIKE 'iv-%';

-- A) Umweltwoche mit detaillierten Allergien/Diät (Küchenplan-Demo)
INSERT INTO inquiries
  (received_at, channel, email_type, tracker_status, responsible_area, assigned_to, customer_email,
   original_subject, conversation_id, school_name, contact_person, program_type, house,
   date_range, number_of_people, grade_level, special_requirements, missing_fields, summary, raw_body)
VALUES
  (NOW() - INTERVAL '3 hours', 'email', 'booking', 'ready_for_review', 'Bildungszentrum', 'vanessa',
   'lehrerin.a@beispiel-schule.de', 'Umweltwoche 06.07.2026 – Allergien',
   'iv-uw-0706', 'Musterschule', 'Lehrerin A', 'Umweltwoche', 'Bildungszentrum',
   '06.07.2026 – 10.07.2026', '28 + 2 Lehrkräfte', '9.',
   '3 vegetarisch (inkl. 2 Lehrkräfte); 2 ohne Schweinefleisch; Unverträglichkeiten Gluten, Laktose, Mais (1 Kind) und Pilze (1 Kind); Allergien Tierhaar/Heuschnupfen',
   '', 'Umweltwoche; detaillierte Allergien/Diät gemeldet — relevant für die Küche.',
   E'Sehr geehrte Damen und Herren,\n\nwir möchten mit unserer Musterschule die Umweltwoche vom 06.07.2026 bis 10.07.2026 bei Ihnen verbringen — 28 Schüler:innen + 2 Lehrkräfte (9. Klasse).\n\nZu den Essens-Besonderheiten: 3 vegetarisch (darunter zwei Lehrkräfte), 2 ohne Schweinefleisch; Unverträglichkeiten Gluten, Laktose und Mais (ein Kind) sowie Pilze (ein Kind); Allergien Tierhaar und Heuschnupfen (Medikamente sind dabei).\n\nHerzliche Grüße\nLehrerin A · Musterschule');

-- B) Klassenfahrt Sonderschule (mögliche Dublette)
INSERT INTO inquiries
  (received_at, channel, email_type, tracker_status, responsible_area, customer_email,
   original_subject, conversation_id, school_name, contact_person, program_type, house,
   date_range, number_of_people, grade_level, special_requirements, missing_fields, summary, raw_body)
VALUES
  (NOW() - INTERVAL '20 hours', 'email', 'booking', 'ready_for_review', 'Gästehaus',
   'lehrerin.a@beispiel-schule.de', 'Klassenfahrt 28.09.2026 – 02.10.2026',
   'iv-klf-2809', 'Musterschule', 'Lehrerin A', 'Klassenfahrt', 'Gästehaus',
   '28.09.2026 – 02.10.2026', '6 + ggf. 2 Mädchen + 1 Lehrerin', '9.',
   'fix: 6 Jungs + 1 Lehrerin; +2 Mädchen nur falls Kapazität; Termin zur Not ±1 Tag; ruhige Klasse',
   '', 'Klassenfahrt 9. Klasse; evtl. Dublette (Reservierung läuft auf andere Lehrkraft).',
   E'Sehr geehrte Damen und Herren,\n\nhaben Sie für eine Klassenfahrt vom 28.09.2026 bis 02.10.2026 noch Platz für uns: 6 Jungs + ggf. 2 Mädchen + 1 Lehrerin? Die Klasse ist eine 9. Realschulklasse, ruhig und nett. Zur Not kann es auch 1 Tag früher oder später sein.\n\nFreundliche Grüße\nLehrerin A · Musterschule (SBBZ Hören und Sprache)');

-- C) Orientierungstage Zweitanfrage (Stammkunde, Teilnehmerzahl reduziert)
INSERT INTO inquiries
  (received_at, channel, email_type, tracker_status, responsible_area, assigned_to, customer_email,
   original_subject, conversation_id, school_name, contact_person, program_type, house,
   date_range, number_of_people, grade_level, special_requirements, missing_fields, summary, raw_body)
VALUES
  (NOW() - INTERVAL '1 day 2 hours', 'email', 'booking', 'needs_info', 'Gästehaus', 'andrea',
   'lehrer.a@beispiel-schule.de', 'Orientierungstage 05.10.2026 – 07.10.2026',
   'iv-ot-0510', 'Musterschule', 'Lehrer A', 'Orientierungstage', 'Gästehaus',
   '05.10.2026 – 07.10.2026', '90', '9.',
   'Stammkunde; statt 4 Klassen jetzt 3 Klassen à ca. 30; verbindliche Zahlen ~2 Wochen vor Anreise',
   'number_of_people', 'Stammschule; Teilnehmerzahl von ~100 auf 90 reduziert; verbindliche Zahlen folgen.',
   E'Liebe Mitarbeiterinnen und Mitarbeiter,\n\nseit vielen Jahren kommen wir als Musterschule sehr gerne zu den Orientierungstagen. Auch vom 05.10.2026 bis 07.10.2026 wären wir wieder gern bei Ihnen. Statt der vertraglich gemeldeten rund 100 Schüler:innen werden es nun 90 sein — drei Klassen (9. Jahrgang) à rund 30.\n\nVerbindliche Zahlen nenne ich ca. zwei Wochen vor Anreise.\n\nHerzliche Grüße\nLehrer A · Musterschule');

-- D) Firmwochenende 2028 — EINE Anfrage, ZWEI Wochenenden (Mehrfach-Anfrage / SplitDetail)
INSERT INTO inquiries
  (received_at, channel, email_type, tracker_status, responsible_area, customer_email,
   original_subject, conversation_id, school_name, contact_person, program_type, house,
   date_range, number_of_people, grade_level, special_requirements, missing_fields, summary, raw_body)
VALUES
  (NOW() - INTERVAL '2 days', 'email', 'booking', 'ready_for_review', 'Bildungszentrum',
   'anfragender.a@beispiel-organisation.de', 'Firmwochenenden 2028',
   'iv-firm-2028', 'Muster-Pfarrverband', 'Anfragender A', 'Firmwochenende', 'Bildungszentrum',
   '05.05.2028 – 07.05.2028', '47', '', 'ohne Referent:in', '',
   'Firmvorbereitung 2028, erstes von zwei Wochenenden (47 Personen), ohne Referent.',
   E'Liebe Mitarbeiterin 3,\n\ngerne würden wir die Firmwochenenden 2028 wieder in Benediktbeuern machen — die ersten beiden Mai-Wochenenden:\n05.05.2028 – 07.05.2028 (47 Personen)\n12.05.2028 – 14.05.2028 (25 Personen)\nOhne Referent:in.\n\nViele Grüße!\nAnfragender A · Muster-Pfarrverband');
INSERT INTO inquiries
  (received_at, channel, email_type, tracker_status, responsible_area, customer_email,
   original_subject, conversation_id, school_name, contact_person, program_type, house,
   date_range, number_of_people, grade_level, special_requirements, missing_fields, summary, raw_body)
VALUES
  (NOW() - INTERVAL '2 days', 'email', 'booking', 'ready_for_review', 'Bildungszentrum',
   'anfragender.a@beispiel-organisation.de', 'Firmwochenenden 2028',
   'iv-firm-2028', 'Muster-Pfarrverband', 'Anfragender A', 'Firmwochenende', 'Bildungszentrum',
   '12.05.2028 – 14.05.2028', '25', '', 'ohne Referent:in', '',
   'Firmvorbereitung 2028, zweites von zwei Wochenenden (25 Personen), ohne Referent.',
   E'Liebe Mitarbeiterin 3,\n\ngerne würden wir die Firmwochenenden 2028 wieder in Benediktbeuern machen — die ersten beiden Mai-Wochenenden:\n05.05.2028 – 07.05.2028 (47 Personen)\n12.05.2028 – 14.05.2028 (25 Personen)\nOhne Referent:in.\n\nViele Grüße!\nAnfragender A · Muster-Pfarrverband');

-- E) Konfirmandenfreizeit (Personenzahl: Konfis + Teamer fürs Vertrag)
INSERT INTO inquiries
  (received_at, channel, email_type, tracker_status, responsible_area, assigned_to, customer_email,
   original_subject, conversation_id, school_name, contact_person, program_type, house,
   date_range, number_of_people, grade_level, special_requirements, missing_fields, summary, raw_body)
VALUES
  (NOW() - INTERVAL '4 hours', 'email', 'booking', 'ready_for_review', 'Bildungszentrum', 'vanessa',
   'anfragender.a@beispiel-organisation.de', 'Konfirmandenfreizeit 16.10.2026 – 18.10.2026',
   'iv-konfi-1610', 'Ev. Kirchengemeinde', 'Anfragender A', 'Konfirmandenfreizeit', 'Bildungszentrum',
   '16.10.2026 – 18.10.2026', '25 Konfis + 10 Teamer + 2 Hauptamtliche', '',
   'Teamer alle unter 27, keine Einzelzimmer; für den Vertrag Konfis + Teamer zusammenzählen',
   '', 'Konfifreizeit Wochenende; Teamer (unter 27, keine EZ) zur Gesamtzahl hinzuzählen.',
   E'Liebe Mitarbeiterin 2,\n\nwir haben uns für die Konfirmandenfreizeit am Wochenende vom 16.10.2026 bis 18.10.2026 entschieden. Wir werden etwa 25 Konfis + 10 Teamer + 2 Hauptamtliche sein. Die Teamer sind alle unter 27 Jahre und benötigen keine Einzelzimmer.\n\nHerzliche Grüße\nAnfragender A · Ev. Kirchengemeinde');

-- F) Ferienfreizeit Pfingsten 2027 (Grundschule/Hort)
INSERT INTO inquiries
  (received_at, channel, email_type, tracker_status, responsible_area, customer_email,
   original_subject, conversation_id, school_name, contact_person, program_type, house,
   date_range, number_of_people, grade_level, special_requirements, missing_fields, summary, raw_body)
VALUES
  (NOW() - INTERVAL '6 hours', 'email', 'booking', 'ready_for_review', 'Bildungszentrum',
   'anfragender.a@beispiel-organisation.de', 'Ferienfreizeit 18.05.2027 – 21.05.2027',
   'iv-ff-1805', 'Grundschule/Hort Musterstadt', 'Anfragender A', 'Ferienfreizeit', 'Bildungszentrum',
   '18.05.2027 – 21.05.2027', '20–25 Kinder + 5 Erzieher:innen', '',
   'Mehrbettzimmer für Kinder + 5 Einzelzimmer; Vollpension, mittags Lunchpakete; Anreise zum Mittagessen, Abreise nach dem Frühstück',
   '', 'Ferienfreizeit Pfingsten; Vollpension + Lunchpakete; Mehrbettzimmer + 5 EZ.',
   E'Liebes Team,\n\nwir als Grundschule/Hort Musterstadt fragen für unsere Ferienfreizeit vom 18.05.2027 bis 21.05.2027 an. Wir kämen mit 20–25 Kinder + 5 Erzieher:innen. Mehrbettzimmer für die Kinder und gerne 5 Einzelzimmer für die Erwachsenen. Wir würden Vollpension buchen, mittags Lunchpakete. Anreise zum Mittagessen, Abreise nach dem Frühstück.\n\nMit freundlichen Grüßen\nAnfragender A · Grundschule/Hort Musterstadt');

-- Verpflegung (board_type) für die Beispiel-Anfragen

UPDATE inquiries SET board_type='Halbpension' WHERE conversation_id='iv-firm-2028';
UPDATE inquiries SET board_type='Vollpension' WHERE conversation_id IN ('iv-uw-0706','iv-klf-2809','iv-ot-0510','iv-konfi-1610','iv-ff-1805');
UPDATE inquiries SET board_type='Vollpension'    WHERE board_type IS NULL AND special_requirements ILIKE '%vollpension%';
UPDATE inquiries SET board_type='Halbpension'    WHERE board_type IS NULL AND special_requirements ILIKE '%halbpension%';
UPDATE inquiries SET board_type='Selbstversorgung' WHERE board_type IS NULL AND special_requirements ILIKE '%selbstvers%';
-- Buchungen aus drei realistischen Anfragen (künftige Anreisen)
INSERT INTO bookings (inquiry_id, house_id, start_date, end_date, date_range_text, number_of_people, group_label, contact_person, program_type, board_type, status, contract_status, created_by)
SELECT i.id, h.id, DATE '2026-07-06', DATE '2026-07-10', i.date_range, 28, 'Musterschule · Umweltwoche', i.contact_person, i.program_type, i.board_type, 'confirmed', 'draft', 'vanessa'
FROM inquiries i, houses h WHERE i.conversation_id='iv-uw-0706' AND h.name='Bildungszentrum' AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.inquiry_id=i.id);
INSERT INTO bookings (inquiry_id, house_id, start_date, end_date, date_range_text, number_of_people, group_label, contact_person, program_type, board_type, status, contract_status, created_by)
SELECT i.id, h.id, DATE '2026-10-05', DATE '2026-10-07', i.date_range, 90, 'Musterschule · Orientierungstage', i.contact_person, i.program_type, i.board_type, 'reserved', 'draft', 'andrea'
FROM inquiries i, houses h WHERE i.conversation_id='iv-ot-0510' AND h.name='Gästehaus' AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.inquiry_id=i.id);
INSERT INTO bookings (inquiry_id, house_id, start_date, end_date, date_range_text, number_of_people, group_label, contact_person, program_type, board_type, status, contract_status, created_by)
SELECT i.id, h.id, DATE '2026-10-16', DATE '2026-10-18', i.date_range, 37, 'Ev. Kirchengemeinde · Konfifreizeit', i.contact_person, i.program_type, i.board_type, 'confirmed', 'sent', 'vanessa'
FROM inquiries i, houses h WHERE i.conversation_id='iv-konfi-1610' AND h.name='Bildungszentrum' AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.inquiry_id=i.id);
UPDATE inquiries SET tracker_status='booking_created' WHERE conversation_id IN ('iv-uw-0706','iv-ot-0510','iv-konfi-1610');
