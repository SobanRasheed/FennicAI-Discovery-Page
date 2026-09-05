-- 0003: Landing page content — the study notes and articles shown on the
-- homepage (Popular study notes / Latest columns), plus a small set of
-- practice MCQs so the subject card Study Notes + MCQs claim is true.
--
-- Idempotent: inserts are guarded on natural unique columns (slug, r2_key,
-- tag slug, question text), so re-running or applying to a database that
-- already has this content is a no-op.
--
-- Note: the wrangler SQL splitter breaks on semicolons inside string
-- literals, so no string value in this file may contain a semicolon.
--
-- Featured thumbnails for the three articles live in R2 under
-- medical-study-notes-media (keys 2026/09/…). Upload the matching files from
-- public/assets/landing/ if the bucket is empty.

-- ---------------------------------------------------------------------------
-- Media: article thumbnails (metadata, bytes in R2)
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO media (r2_key, filename, mime_type, size_bytes, alt_text, title, created_at) VALUES
  ('2026/09/thumb-study-tips.png', 'thumb-study-tips.png', 'image/png', 4838,
   'A desk with open textbooks, highlighters, and a handwritten study schedule.',
   'Study tips thumbnail', '2026-09-05 09:00:00'),
  ('2026/09/thumb-anatomy-clinical.png', 'thumb-anatomy-clinical.png', 'image/png', 4203,
   'An anatomical illustration of the human upper body with clinical annotations.',
   'Anatomy in clinical practice thumbnail', '2026-09-05 09:00:00'),
  ('2026/09/thumb-mcq-exams.png', 'thumb-mcq-exams.png', 'image/png', 4575,
   'A multiple-choice answer sheet being filled in with a pencil.',
   'MCQ exam technique thumbnail', '2026-09-05 09:00:00');

-- ---------------------------------------------------------------------------
-- Tags (used as the kicker label on article cards)
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO tags (name, slug) VALUES
  ('Study Tips', 'study-tips'),
  ('Medical Education', 'medical-education'),
  ('Exam Preparation', 'exam-preparation');

-- ---------------------------------------------------------------------------
-- Study notes (Popular column)
-- ---------------------------------------------------------------------------

-- Gram Positive Bacteria — Microbiology
INSERT OR IGNORE INTO articles (
  title, slug, excerpt, content_html, article_type, status, subject_id,
  published_at, robots, reading_minutes, created_at, updated_at
) VALUES (
  'Gram Positive Bacteria',
  'gram-positive-bacteria',
  'Structure, characteristics, examples and clinical significance of gram-positive organisms.',
  '<h2>Definition</h2>
<p>Gram-positive bacteria are organisms whose cell wall retains the crystal violet stain during Gram staining, appearing purple-blue under the microscope. This property follows from the structure of their cell wall rather than from any single biochemical marker.</p>
<h2>Cell wall structure</h2>
<p>The gram-positive cell wall has a thick peptidoglycan layer (20–80 nm) containing teichoic and lipoteichoic acids, which anchor the wall to the cell membrane. There is no outer membrane — the key structural difference from gram-negative bacteria, whose thin peptidoglycan sits between two membranes and loses the primary stain during decolorisation.</p>
<ul>
<li><strong>Peptidoglycan</strong> — thick, cross-linked layer that retains crystal violet–iodine complexes.</li>
<li><strong>Teichoic acids</strong> — unique to gram-positive organisms, acting as surface antigens and mediating adhesion.</li>
<li><strong>No outer membrane</strong> — no lipopolysaccharide (endotoxin).</li>
</ul>
<h2>Classification</h2>
<p>Gram-positive organisms divide first by morphology — cocci versus bacilli — and then by the catalase test and arrangement.</p>
<ul>
<li><strong>Catalase-positive cocci in clusters:</strong> Staphylococcus (S. aureus, S. epidermidis, S. saprophyticus).</li>
<li><strong>Catalase-negative cocci in chains:</strong> Streptococcus and Enterococcus, classified further by haemolysis and Lancefield antigens.</li>
<li><strong>Aerobic spore-forming bacilli:</strong> Bacillus anthracis, B. cereus.</li>
<li><strong>Anaerobic spore-forming bacilli:</strong> Clostridium tetani, C. perfringens, C. botulinum, C. difficile.</li>
<li><strong>Non-spore-forming bacilli:</strong> Corynebacterium diphtheriae, Listeria monocytogenes (tumbling motility at 25 °C).</li>
</ul>
<h2>Clinical significance</h2>
<p>Gram-positive organisms cause a large share of skin, soft-tissue, respiratory, and bone infections. S. aureus produces pus-forming infections and toxin-mediated disease (TSST-1, scalded skin, food poisoning). Group A streptococci cause pharyngitis, cellulitis, and post-infectious rheumatic fever and glomerulonephritis. Clostridia cause tetanus, botulism, gas gangrene, and antibiotic-associated colitis.</p>
<h2>Treatment principles</h2>
<p>Gram-positive organisms are generally sensitive to beta-lactams (penicillin, cephalosporins) and vancomycin, with important exceptions: penicillinase-producing S. aureus needs anti-staphylococcal penicillins or vancomycin, and enterococci are intrinsically resistant to cephalosporins. Expect these associations in examinations.</p>
<h2>Key points</h2>
<ul>
<li>Gram-positive = thick peptidoglycan + teichoic acids, no outer membrane.</li>
<li>Stain purple because decolorisation cannot wash out the dye trapped in the mesh.</li>
<li>Catalase divides the cocci: Staphylococcus positive, Streptococcus negative.</li>
<li>Teichoic acids are unique to gram-positive walls and act as antigens.</li>
</ul>',
  'study-note', 'published', (SELECT id FROM subjects WHERE slug = 'microbiology'),
  '2026-09-04 09:00:00', 'index,follow', 11, '2026-09-04 08:00:00', '2026-09-04 09:00:00'
);

-- Cranial Nerves — Anatomy
INSERT OR IGNORE INTO articles (
  title, slug, excerpt, content_html, article_type, status, subject_id,
  published_at, robots, reading_minutes, created_at, updated_at
) VALUES (
  'Cranial Nerves',
  'cranial-nerves',
  'Complete anatomy of the twelve cranial nerves with modalities, nuclei, and clinical correlations.',
  '<h2>Overview</h2>
<p>Twelve paired cranial nerves emerge from the brain and brainstem and pass through named foramina of the skull. They carry somatic motor, visceral (parasympathetic) motor, somatic sensory, and special sensory fibres. A nerve is described by its modalities, its nuclei of origin or termination, its course, and its functional deficit when injured.</p>
<h2>The twelve nerves</h2>
<ul>
<li><strong>I Olfactory</strong> — special sensory (smell) through the cribriform plate. Deficit: anosmia, classically after head injury.</li>
<li><strong>II Optic</strong> — special sensory (vision) through the optic canal. Deficit: visual field loss.</li>
<li><strong>III Oculomotor</strong> — motor to most extraocular muscles plus parasympathetic pupillary constriction, through the superior orbital fissure. Deficit: down-and-out eye, ptosis, dilated pupil.</li>
<li><strong>IV Trochlear</strong> — motor to superior oblique. Deficit: impaired downward gaze, head tilt.</li>
<li><strong>V Trigeminal</strong> — sensory to the face and motor to mastication, in three divisions (V1 ophthalmic, V2 maxillary, V3 mandibular). Deficit: loss of facial sensation, jaw deviation, corneal reflex afferent limb.</li>
<li><strong>VI Abducens</strong> — motor to lateral rectus. Deficit: convergent squint, failure of abduction.</li>
<li><strong>VII Facial</strong> — motor to facial expression, taste from the anterior two-thirds, and parasympathetics to the lacrimal and submandibular glands. Deficit: ipsilateral facial palsy (Bell palsy when idiopathic).</li>
<li><strong>VIII Vestibulocochlear</strong> — hearing and balance through the internal acoustic meatus. Deficit: sensorineural deafness, vertigo.</li>
<li><strong>IX Glossopharyngeal</strong> — sensory to the posterior tongue and pharynx, motor to stylopharyngeus. Deficit: impaired gag reflex afferent limb.</li>
<li><strong>X Vagus</strong> — parasympathetic to thorax and abdomen, motor to palate, pharynx, larynx. Deficit: hoarseness, uvula deviation away from the lesion.</li>
<li><strong>XI Accessory</strong> — motor to trapezius and sternocleidomastoid. Deficit: shoulder droop, weak head turning.</li>
<li><strong>XII Hypoglossal</strong> — motor to tongue. Deficit: tongue deviation toward the lesion on protrusion.</li>
</ul>
<h2>Modality mnemonic</h2>
<p>Nerves III, IV, VI, XI, XII are purely (or predominantly) motor. Nerves I, II, VIII are purely sensory. Nerves V, VII, IX, X are mixed. This four-way split organises nearly every clinical vignette.</p>
<h2>Clinical correlations</h2>
<p>Commonly tested lesions include oculomotor palsy from posterior communicating artery aneurysm (pupil-involved) or diabetes (pupil-sparing), Bell palsy with loss of taste and hyperacusis, and hypoglossal injury after neck surgery. The corneal reflex (V afferent, VII efferent) and gag reflex (IX afferent, X efferent) tie the nerves into functional pairs.</p>
<h2>Key points</h2>
<ul>
<li>Learn each nerve as: modality, nucleus, foramen, deficit.</li>
<li>III palsy: eye down and out with a blown pupil when the parasympathetic fibres are involved.</li>
<li>VII is the most commonly injured cranial nerve in exams and practice.</li>
<li>XII lesion: the tongue deviates toward the damaged side.</li>
</ul>',
  'study-note', 'published', (SELECT id FROM subjects WHERE slug = 'anatomy'),
  '2026-09-02 09:00:00', 'index,follow', 12, '2026-09-02 08:00:00', '2026-09-02 09:00:00'
);

-- Cardiac Cycle — Physiology
INSERT OR IGNORE INTO articles (
  title, slug, excerpt, content_html, article_type, status, subject_id,
  published_at, robots, reading_minutes, created_at, updated_at
) VALUES (
  'Cardiac Cycle',
  'cardiac-cycle',
  'Mechanism, phases, pressure–volume changes and regulation of the cardiac cycle.',
  '<h2>Definition</h2>
<p>The cardiac cycle is the sequence of electrical and mechanical events in one heartbeat, from the start of one systole to the start of the next. At a heart rate of 75 beats/min the cycle lasts about 0.8 seconds: 0.3 s of systole and 0.5 s of diastole.</p>
<h2>Phases</h2>
<ul>
<li><strong>Isovolumetric contraction</strong> — ventricles contract with all valves closed, and pressure rises steeply with no change in volume. The AV valves bulge into the atria, producing the c wave.</li>
<li><strong>Rapid ejection</strong> — aortic and pulmonary valves open, and about 70% of stroke volume is ejected as ventricular pressure exceeds arterial pressure.</li>
<li><strong>Reduced ejection</strong> — outflow continues but slows as pressures converge. The T wave marks ventricular repolarisation.</li>
<li><strong>Isovolumetric relaxation</strong> — all valves closed again, and pressure falls until the AV valves open.</li>
<li><strong>Rapid filling</strong> — most of diastolic filling (about 70–80%) occurs passively here, producing the y descent on the atrial pressure trace.</li>
<li><strong>Atrial systole</strong> — the atrial kick contributes the final 20–30% of ventricular filling (the a wave). It is lost in atrial fibrillation, which is why rate control matters.</li>
</ul>
<h2>Heart sounds</h2>
<p>The first heart sound (S1) is closure of the mitral and tricuspid valves at the onset of systole. The second (S2) is closure of the aortic and pulmonary valves at its end. S3 (rapid filling) is normal in children and pregnancy. S4 (stiff ventricle) is almost always abnormal in adults.</p>
<h2>Regulation</h2>
<p>Stroke volume is set by preload (venous filling, the Frank–Starling relationship), contractility (sympathetic stimulation, calcium availability), and afterload (aortic pressure). Heart rate is set by autonomic tone on the SA node. Cardiac output = heart rate × stroke volume, and the cycle timing shortens mostly at the expense of diastole as rate rises — the mechanism behind angina at high heart rates, since coronary filling happens in diastole.</p>
<h2>Key points</h2>
<ul>
<li>All four valves are closed during both isovolumetric phases.</li>
<li>S1 = AV valves closing. S2 = semilunar valves closing.</li>
<li>Diastole shortens more than systole as heart rate rises.</li>
<li>The atrial kick supplies the last fifth of filling — its loss in AF is usually tolerable at rest, not in exercise.</li>
</ul>',
  'study-note', 'published', (SELECT id FROM subjects WHERE slug = 'physiology'),
  '2026-08-30 09:00:00', 'index,follow', 10, '2026-08-30 08:00:00', '2026-08-30 09:00:00'
);

-- Antibiotics — Pharmacology
INSERT OR IGNORE INTO articles (
  title, slug, excerpt, content_html, article_type, status, subject_id,
  published_at, robots, reading_minutes, created_at, updated_at
) VALUES (
  'Antibiotics',
  'antibiotics',
  'Classification, mechanism of action, clinical uses and side effects of the major antibiotic classes.',
  '<h2>Classification by mechanism</h2>
<p>Antibiotics group naturally by their target in the bacterial cell — a framework that predicts spectrum, toxicity, and mechanisms of resistance.</p>
<ul>
<li><strong>Cell wall synthesis inhibitors</strong> — beta-lactams (penicillins, cephalosporins, carbapenems) and vancomycin. Bactericidal, with allergy as the classic adverse effect.</li>
<li><strong>Protein synthesis inhibitors (50S)</strong> — macrolides (azithromycin), clindamycin, chloramphenicol, linezolid.</li>
<li><strong>Protein synthesis inhibitors (30S)</strong> — aminoglycosides (gentamicin), tetracyclines (doxycycline).</li>
<li><strong>DNA/RNA synthesis inhibitors</strong> — fluoroquinolones (ciprofloxacin inhibits DNA gyrase), rifampin (RNA polymerase), metronidazole (DNA strand breaks in anaerobes).</li>
<li><strong>Folate synthesis inhibitors</strong> — sulfonamides and trimethoprim as a sequential blockade, combined as co-trimoxazole.</li>
</ul>
<h2>Core uses</h2>
<p>Empirical therapy follows the likely organism and site: community-acquired pneumonia (a macrolide or doxycycline, or a beta-lactam plus a macrolide), urinary tract infection (nitrofurantoin, trimethoprim, or a cephalosporin), skin and soft-tissue infection (anti-staphylococcal penicillin or cephalosporin), and anaerobic or intra-abdominal infection (metronidazole plus a beta-lactam). Narrow the drug once culture and sensitivity results return — de-escalation is a core stewardship principle.</p>
<h2>Important side effects</h2>
<ul>
<li><strong>Beta-lactams</strong> — hypersensitivity, from rash to anaphylaxis. Ask about prior reactions before prescribing.</li>
<li><strong>Aminoglycosides</strong> — nephrotoxicity and ototoxicity. Monitor levels and renal function.</li>
<li><strong>Fluoroquinolones</strong> — tendinopathy, QT prolongation, aortic aneurysm risk. Restrict where alternatives exist.</li>
<li><strong>Macrolides</strong> — QT prolongation and CYP3A4 inhibition (clarithromycin interacts with statins).</li>
<li><strong>Clindamycin</strong> — C. difficile colitis.</li>
</ul>
<h2>Resistance</h2>
<p>Bacteria resist drugs by destroying them (beta-lactamases), changing the target (PBP2a in MRSA, ribosomal methylation), reducing permeability, or pumping drugs out (efflux). Stewardship — right drug, right dose, right duration — slows selection of resistant strains.</p>
<h2>Key points</h2>
<ul>
<li>Group antibiotics by target: wall, 50S, 30S, nucleic acid, folate.</li>
<li>Bactericidal vs bacteriostatic matters clinically in endocarditis and meningitis.</li>
<li>Know one classic toxicity per class — it is a favourite exam question.</li>
<li>Always take an allergy history before a beta-lactam.</li>
</ul>',
  'study-note', 'published', (SELECT id FROM subjects WHERE slug = 'pharmacology'),
  '2026-08-28 09:00:00', 'index,follow', 12, '2026-08-28 08:00:00', '2026-08-28 09:00:00'
);

-- ---------------------------------------------------------------------------
-- Articles (Latest column)
-- ---------------------------------------------------------------------------

-- How to Study Effectively in Medical School
-- (no subject, so the UNIQUE(subject_id, slug) constraint does not apply —
-- guard on slug explicitly instead of relying on INSERT OR IGNORE)
INSERT INTO articles (
  title, slug, excerpt, content_html, article_type, status, subject_id,
  featured_media_id, published_at, robots, reading_minutes, created_at, updated_at
)
  SELECT 'How to Study Effectively in Medical School',
  'how-to-study-effectively-in-medical-school',
  'Practical strategies to make your medical studies more productive and less stressful.',
  '<h2>Test yourself, do not reread</h2>
<p>Rereading a textbook feels productive and is one of the weakest ways to learn. Every controlled comparison finds that retrieval practice — closing the book and writing down what you remember — beats review by a wide margin. Make the default study action a question, not a highlight.</p>
<h2>Space your repetition</h2>
<p>Memory consolidates over days, not hours. Review each topic at increasing intervals: one day, one week, one month. A simple spreadsheet or any spaced-repetition app handles the scheduling. The discipline is doing the reviews on time even when they feel uncomfortable.</p>
<h2>Study the syllabus, not the whole textbook</h2>
<p>Medical curricula are enormous and exams are structured. Past papers and the stated learning objectives define the territory. Read around topics that interest you, but protect dedicated time for the material the exam actually samples.</p>
<h2>Work in short focused blocks</h2>
<p>Forty-five focused minutes with the phone in another room beat four distracted hours. Plan the week so every block has a topic and a task — listing the causes of pancreatitis from memory is a block, while looking at GI notes is not.</p>
<h2>Protect the foundations</h2>
<p>Sleep, exercise, and a social life are not luxuries. Consolidation happens during sleep, and burnout costs more time than it saves. The students who finish strongest are rarely the ones who studied the most hours — they are the ones who studied deliberately and rested deliberately.</p>',
  'article', 'published', NULL,
  (SELECT id FROM media WHERE r2_key = '2026/09/thumb-study-tips.png'),
  '2026-09-06 09:00:00', 'index,follow', 5, '2026-09-05 09:00:00', '2026-09-05 09:00:00'
  WHERE NOT EXISTS (SELECT 1 FROM articles WHERE slug = 'how-to-study-effectively-in-medical-school');

-- Importance of Anatomy in Clinical Practice
INSERT OR IGNORE INTO articles (
  title, slug, excerpt, content_html, article_type, status, subject_id,
  featured_media_id, published_at, robots, reading_minutes, created_at, updated_at
) VALUES (
  'Importance of Anatomy in Clinical Practice',
  'importance-of-anatomy-in-clinical-practice',
  'How a strong foundation in anatomy helps in real-world medicine.',
  '<h2>Anatomy is the language of medicine</h2>
<p>Every clinical conversation is conducted in anatomical terms. Describing a mass in the right iliac fossa, or a fracture at the surgical neck of the humerus, communicates precisely because everyone shares the map. A shaky map makes for vague notes and dangerous handovers.</p>
<h2>The physical examination is applied anatomy</h2>
<p>Palpating the radial pulse, hearing where a murmur is loudest, mapping dermatomes in a spinal cord injury — each bedside skill is an anatomical structure meeting a clinical question. Students who can reason from structure to sign examine faster and miss less.</p>
<h2>Imaging and procedures</h2>
<p>CT, MRI, and ultrasound are anatomy rendered in other physical quantities, and reading a chest film is a lung-and-mediastinum quiz with stakes. Likewise, every central line, lumbar puncture, and nerve block is anatomy performed under the skin. Knowing what lies one centimetre beyond the needle is what separates a procedure from a complication.</p>
<h2>Surgery and emergency care</h2>
<p>Surgeons navigate by relationships — avascular planes, blood supply, and the safe corridors between structures. In trauma, the primary survey and the trauma laparotomy are anatomy under time pressure. Anatomy learned only for the exam fades, while anatomy learned as a map you will actually use keeps paying off for decades.</p>
<h2>The payoff</h2>
<p>Anatomy is the one preclinical subject that directly shapes daily clinical judgement. A little extra effort spent understanding rather than memorising — drawing, models, prosections, clinical correlations — returns interest throughout a career.</p>',
  'article', 'published', (SELECT id FROM subjects WHERE slug = 'anatomy'),
  (SELECT id FROM media WHERE r2_key = '2026/09/thumb-anatomy-clinical.png'),
  '2026-09-03 09:00:00', 'index,follow', 6, '2026-09-03 08:00:00', '2026-09-03 09:00:00'
);

-- How to Tackle MCQs in University Exams (no subject — guarded on slug)
INSERT INTO articles (
  title, slug, excerpt, content_html, article_type, status, subject_id,
  featured_media_id, published_at, robots, reading_minutes, created_at, updated_at
)
  SELECT 'How to Tackle MCQs in University Exams',
  'how-to-tackle-mcqs-in-university-exams',
  'Tips and techniques to improve your performance in MCQ exams.',
  '<h2>Read the stem properly</h2>
<p>Most wrong answers come from misreading, not not knowing. Read the last line of the question first so you know what is being asked, then read the whole stem. Note the qualifiers: most likely, next best step, excluding. A single missed negative flips the entire question.</p>
<h2>Answer before looking at the options</h2>
<p>If the stem suggests an answer to you, say it to yourself before reading the choices. This protects you from distractors written to sound plausible, and it makes pattern recognition a tool instead of a trap.</p>
<h2>Use elimination aggressively</h2>
<p>You do not need the right answer — you need the last answer standing. Strike options that are wrong on a single fact. In all-of-the-following-except questions, elimination is the only reliable method.</p>
<h2>Manage the clock</h2>
<p>Do one pass answering everything you can answer in under the average time per question, flagging the rest. Return to flagged questions with the time you saved. Never leave an MCQ blank unless the exam penalises guessing — there is no negative marking in most university MCQ papers.</p>
<h2>Do not change answers on a whim</h2>
<p>First instincts are right more often than panicked revisions. Change an answer only when you can articulate a concrete reason — a misread stem, a recalled fact — not because the question felt hard.</p>
<h2>Practise in exam conditions</h2>
<p>Technique only settles under pressure. Do at least two full-length timed papers before the real thing, and review every wrong answer until you can state why the right option is right and why your choice was wrong.</p>',
  'article', 'published', NULL,
  (SELECT id FROM media WHERE r2_key = '2026/09/thumb-mcq-exams.png'),
  '2026-09-01 09:00:00', 'index,follow', 4, '2026-09-01 08:00:00', '2026-09-01 09:00:00'
  WHERE NOT EXISTS (SELECT 1 FROM articles WHERE slug = 'how-to-tackle-mcqs-in-university-exams');

-- Tag links for the articles
INSERT OR IGNORE INTO article_tags (article_id, tag_id)
  SELECT a.id, t.id FROM articles a, tags t
  WHERE a.slug = 'how-to-study-effectively-in-medical-school' AND t.slug = 'study-tips';
INSERT OR IGNORE INTO article_tags (article_id, tag_id)
  SELECT a.id, t.id FROM articles a, tags t
  WHERE a.slug = 'importance-of-anatomy-in-clinical-practice' AND t.slug = 'medical-education';
INSERT OR IGNORE INTO article_tags (article_id, tag_id)
  SELECT a.id, t.id FROM articles a, tags t
  WHERE a.slug = 'how-to-tackle-mcqs-in-university-exams' AND t.slug = 'exam-preparation';

-- ---------------------------------------------------------------------------
-- Practice MCQs (linked to the seeded notes). Guarded on question text so
-- re-running is a no-op.
--
-- Note: match questions with = rather than LIKE. workerd's SQLite rejects
-- LIKE patterns longer than 50 bytes ("LIKE or GLOB pattern too complex").
-- ---------------------------------------------------------------------------

-- Microbiology 1
INSERT INTO mcqs (question, explanation, status, subject_id, article_id, difficulty, tags_json, created_at, updated_at)
  SELECT 'Which component of the gram-positive cell wall is unique to gram-positive organisms and acts as an important surface antigen?',
         'Teichoic acids are found only in gram-positive cell walls, where they anchor peptidoglycan to the membrane and act as antigens. Lipopolysaccharide belongs to gram-negative outer membranes.',
         'published', s.id, a.id, 'easy', '["microbiology"]', '2026-09-04 09:30:00', '2026-09-04 09:30:00'
  FROM subjects s, articles a
  WHERE s.slug = 'microbiology' AND a.slug = 'gram-positive-bacteria'
    AND NOT EXISTS (SELECT 1 FROM mcqs WHERE question = 'Which component of the gram-positive cell wall is unique to gram-positive organisms and acts as an important surface antigen?');
INSERT OR IGNORE INTO mcq_options (mcq_id, label, text, is_correct, sort_order)
  SELECT m.id, o.label, o.text, o.correct, o.sort_order
  FROM mcqs m,
       (SELECT 'A' AS label, 'Teichoic acid' AS text, 1 AS correct, 1 AS sort_order
        UNION ALL SELECT 'B', 'Lipopolysaccharide', 0, 2
        UNION ALL SELECT 'C', 'Outer membrane', 0, 3
        UNION ALL SELECT 'D', 'Periplasmic space', 0, 4) o
  WHERE m.question = 'Which component of the gram-positive cell wall is unique to gram-positive organisms and acts as an important surface antigen?' AND m.id NOT IN (SELECT mcq_id FROM mcq_options);

-- Microbiology 2
INSERT INTO mcqs (question, explanation, status, subject_id, article_id, difficulty, tags_json, created_at, updated_at)
  SELECT 'The catalase test distinguishes which two genera of gram-positive cocci?',
         'Staphylococcus is catalase positive (bubble test with hydrogen peroxide) and grows in clusters, while Streptococcus and Enterococcus are catalase negative and grow in chains.',
         'published', s.id, a.id, 'easy', '["microbiology"]', '2026-09-04 09:35:00', '2026-09-04 09:35:00'
  FROM subjects s, articles a
  WHERE s.slug = 'microbiology' AND a.slug = 'gram-positive-bacteria'
    AND NOT EXISTS (SELECT 1 FROM mcqs WHERE question = 'The catalase test distinguishes which two genera of gram-positive cocci?');
INSERT OR IGNORE INTO mcq_options (mcq_id, label, text, is_correct, sort_order)
  SELECT m.id, o.label, o.text, o.correct, o.sort_order
  FROM mcqs m,
       (SELECT 'A' AS label, 'Staphylococcus and Streptococcus' AS text, 1 AS correct, 1 AS sort_order
        UNION ALL SELECT 'B', 'Streptococcus and Enterococcus', 0, 2
        UNION ALL SELECT 'C', 'Bacillus and Clostridium', 0, 3
        UNION ALL SELECT 'D', 'Corynebacterium and Listeria', 0, 4) o
  WHERE m.question = 'The catalase test distinguishes which two genera of gram-positive cocci?' AND m.id NOT IN (SELECT mcq_id FROM mcq_options);

-- Anatomy 1
INSERT INTO mcqs (question, explanation, status, subject_id, article_id, difficulty, tags_json, created_at, updated_at)
  SELECT 'A patient cannot abduct the left eye. Which cranial nerve is damaged?',
         'The abducens nerve (CN VI) supplies the lateral rectus muscle, the only abductor of the eye. A lesion causes failure of abduction and a convergent squint.',
         'published', s.id, a.id, 'medium', '["anatomy"]', '2026-09-02 09:30:00', '2026-09-02 09:30:00'
  FROM subjects s, articles a
  WHERE s.slug = 'anatomy' AND a.slug = 'cranial-nerves'
    AND NOT EXISTS (SELECT 1 FROM mcqs WHERE question = 'A patient cannot abduct the left eye. Which cranial nerve is damaged?');
INSERT OR IGNORE INTO mcq_options (mcq_id, label, text, is_correct, sort_order)
  SELECT m.id, o.label, o.text, o.correct, o.sort_order
  FROM mcqs m,
       (SELECT 'A' AS label, 'CN III (oculomotor)' AS text, 0 AS correct, 1 AS sort_order
        UNION ALL SELECT 'B', 'CN IV (trochlear)', 0, 2
        UNION ALL SELECT 'C', 'CN VI (abducens)', 1, 3
        UNION ALL SELECT 'D', 'CN VII (facial)', 0, 4) o
  WHERE m.question = 'A patient cannot abduct the left eye. Which cranial nerve is damaged?' AND m.id NOT IN (SELECT mcq_id FROM mcq_options);

-- Anatomy 2
INSERT INTO mcqs (question, explanation, status, subject_id, article_id, difficulty, tags_json, created_at, updated_at)
  SELECT 'On protrusion, a patient''s tongue deviates to the right. Where is the lesion?',
         'The hypoglossal nerve (CN XII) innervates the tongue, and the protruded tongue deviates toward the side of a lower motor neuron lesion. A right deviation therefore indicates a right CN XII lesion.',
         'published', s.id, a.id, 'medium', '["anatomy"]', '2026-09-02 09:35:00', '2026-09-02 09:35:00'
  FROM subjects s, articles a
  WHERE s.slug = 'anatomy' AND a.slug = 'cranial-nerves'
    AND NOT EXISTS (SELECT 1 FROM mcqs WHERE question = 'On protrusion, a patient''s tongue deviates to the right. Where is the lesion?');
INSERT OR IGNORE INTO mcq_options (mcq_id, label, text, is_correct, sort_order)
  SELECT m.id, o.label, o.text, o.correct, o.sort_order
  FROM mcqs m,
       (SELECT 'A' AS label, 'Right hypoglossal nerve' AS text, 1 AS correct, 1 AS sort_order
        UNION ALL SELECT 'B', 'Left hypoglossal nerve', 0, 2
        UNION ALL SELECT 'C', 'Right glossopharyngeal nerve', 0, 3
        UNION ALL SELECT 'D', 'Left facial nerve', 0, 4) o
  WHERE m.question = 'On protrusion, a patient''s tongue deviates to the right. Where is the lesion?' AND m.id NOT IN (SELECT mcq_id FROM mcq_options);

-- Physiology 1
INSERT INTO mcqs (question, explanation, status, subject_id, article_id, difficulty, tags_json, created_at, updated_at)
  SELECT 'Which heart sound is produced by closure of the mitral and tricuspid valves?',
         'S1 marks the onset of ventricular systole and is closure of the atrioventricular (mitral and tricuspid) valves, while S2 is closure of the aortic and pulmonary valves.',
         'published', s.id, a.id, 'easy', '["physiology"]', '2026-08-30 09:30:00', '2026-08-30 09:30:00'
  FROM subjects s, articles a
  WHERE s.slug = 'physiology' AND a.slug = 'cardiac-cycle'
    AND NOT EXISTS (SELECT 1 FROM mcqs WHERE question = 'Which heart sound is produced by closure of the mitral and tricuspid valves?');
INSERT OR IGNORE INTO mcq_options (mcq_id, label, text, is_correct, sort_order)
  SELECT m.id, o.label, o.text, o.correct, o.sort_order
  FROM mcqs m,
       (SELECT 'A' AS label, 'S1' AS text, 1 AS correct, 1 AS sort_order
        UNION ALL SELECT 'B', 'S2', 0, 2
        UNION ALL SELECT 'C', 'S3', 0, 3
        UNION ALL SELECT 'D', 'S4', 0, 4) o
  WHERE m.question = 'Which heart sound is produced by closure of the mitral and tricuspid valves?' AND m.id NOT IN (SELECT mcq_id FROM mcq_options);

-- Physiology 2
INSERT INTO mcqs (question, explanation, status, subject_id, article_id, difficulty, tags_json, created_at, updated_at)
  SELECT 'As heart rate increases from 70 to 150 beats per minute, which phase of the cardiac cycle shortens the most?',
         'Diastole shortens far more than systole as heart rate rises. This is why high heart rates compromise coronary perfusion, which occurs during diastole, and can precipitate angina.',
         'published', s.id, a.id, 'medium', '["physiology"]', '2026-08-30 09:35:00', '2026-08-30 09:35:00'
  FROM subjects s, articles a
  WHERE s.slug = 'physiology' AND a.slug = 'cardiac-cycle'
    AND NOT EXISTS (SELECT 1 FROM mcqs WHERE question = 'As heart rate increases from 70 to 150 beats per minute, which phase of the cardiac cycle shortens the most?');
INSERT OR IGNORE INTO mcq_options (mcq_id, label, text, is_correct, sort_order)
  SELECT m.id, o.label, o.text, o.correct, o.sort_order
  FROM mcqs m,
       (SELECT 'A' AS label, 'Isovolumetric contraction' AS text, 0 AS correct, 1 AS sort_order
        UNION ALL SELECT 'B', 'Rapid ejection', 0, 2
        UNION ALL SELECT 'C', 'Diastole (ventricular filling)', 1, 3
        UNION ALL SELECT 'D', 'All phases shorten equally', 0, 4) o
  WHERE m.question = 'As heart rate increases from 70 to 150 beats per minute, which phase of the cardiac cycle shortens the most?' AND m.id NOT IN (SELECT mcq_id FROM mcq_options);

-- Pharmacology 1
INSERT INTO mcqs (question, explanation, status, subject_id, article_id, difficulty, tags_json, created_at, updated_at)
  SELECT 'Which antibiotic class inhibits bacterial DNA gyrase (topoisomerase II)?',
         'Fluoroquinolones such as ciprofloxacin and levofloxacin inhibit DNA gyrase and topoisomerase IV, blocking DNA replication.',
         'published', s.id, a.id, 'easy', '["pharmacology"]', '2026-08-28 09:30:00', '2026-08-28 09:30:00'
  FROM subjects s, articles a
  WHERE s.slug = 'pharmacology' AND a.slug = 'antibiotics'
    AND NOT EXISTS (SELECT 1 FROM mcqs WHERE question = 'Which antibiotic class inhibits bacterial DNA gyrase (topoisomerase II)?');
INSERT OR IGNORE INTO mcq_options (mcq_id, label, text, is_correct, sort_order)
  SELECT m.id, o.label, o.text, o.correct, o.sort_order
  FROM mcqs m,
       (SELECT 'A' AS label, 'Fluoroquinolones' AS text, 1 AS correct, 1 AS sort_order
        UNION ALL SELECT 'B', 'Macrolides', 0, 2
        UNION ALL SELECT 'C', 'Aminoglycosides', 0, 3
        UNION ALL SELECT 'D', 'Sulfonamides', 0, 4) o
  WHERE m.question = 'Which antibiotic class inhibits bacterial DNA gyrase (topoisomerase II)?' AND m.id NOT IN (SELECT mcq_id FROM mcq_options);

-- Pharmacology 2
INSERT INTO mcqs (question, explanation, status, subject_id, article_id, difficulty, tags_json, created_at, updated_at)
  SELECT 'Nephrotoxicity and ototoxicity are the classic adverse effects of which antibiotic class?',
         'Aminoglycosides (gentamicin, amikacin) are nephrotoxic (usually reversible) and ototoxic (often irreversible), which is why drug levels and renal function are monitored during therapy.',
         'published', s.id, a.id, 'easy', '["pharmacology"]', '2026-08-28 09:35:00', '2026-08-28 09:35:00'
  FROM subjects s, articles a
  WHERE s.slug = 'pharmacology' AND a.slug = 'antibiotics'
    AND NOT EXISTS (SELECT 1 FROM mcqs WHERE question = 'Nephrotoxicity and ototoxicity are the classic adverse effects of which antibiotic class?');
INSERT OR IGNORE INTO mcq_options (mcq_id, label, text, is_correct, sort_order)
  SELECT m.id, o.label, o.text, o.correct, o.sort_order
  FROM mcqs m,
       (SELECT 'A' AS label, 'Penicillins' AS text, 0 AS correct, 1 AS sort_order
        UNION ALL SELECT 'B', 'Cephalosporins', 0, 2
        UNION ALL SELECT 'C', 'Tetracyclines', 0, 3
        UNION ALL SELECT 'D', 'Aminoglycosides', 1, 4) o
  WHERE m.question = 'Nephrotoxicity and ototoxicity are the classic adverse effects of which antibiotic class?' AND m.id NOT IN (SELECT mcq_id FROM mcq_options);
