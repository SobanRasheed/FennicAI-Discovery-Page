-- Roles + the 16 initial medical subjects. The bootstrap admin user is
-- created by scripts/seed-admin.mjs (password must be hashed, so it cannot
-- be seeded from SQL).

INSERT INTO roles (slug, name, description, permissions_json) VALUES
  ('admin', 'Admin', 'Full access to all CMS features.', '["*"]'),
  ('editor', 'Editor', 'Edit and publish all content; manage taxonomy.', '["articles:*","mcqs:*","subjects:*","topics:*","media:*","references:*"]'),
  ('author', 'Author', 'Create and edit own drafts; submit for review.', '["articles:write","mcqs:write","media:read"]'),
  ('reviewer', 'Reviewer', 'Review and approve drafts for publishing.', '["articles:review","articles:publish"]');

INSERT INTO subjects (title, slug, description, introduction, sort_order) VALUES
  ('Anatomy', 'anatomy', 'Gross, clinical, and applied anatomy study notes covering every region of the human body.', 'Anatomy is the foundation of medicine: the study of the structure of the human body from the macroscopic to the microscopic level.', 1),
  ('Physiology', 'physiology', 'Systems-based physiology notes explaining how the human body functions in health.', 'Physiology explains the mechanisms by which the body maintains homeostasis, from cellular transport to whole-organ systems.', 2),
  ('Biochemistry', 'biochemistry', 'Medical biochemistry notes on metabolism, enzymes, molecular biology, and clinical correlations.', 'Biochemistry connects molecular processes to clinical medicine, from enzyme kinetics to metabolic pathways and inherited disorders.', 3),
  ('Pharmacology', 'pharmacology', 'Pharmacology notes covering drug classes, mechanisms, indications, and adverse effects.', 'Pharmacology is the study of how drugs interact with living systems — the knowledge base behind safe prescribing.', 4),
  ('Pathology', 'pathology', 'General and systemic pathology notes on disease mechanisms at cellular and tissue level.', 'Pathology studies the structural and functional changes produced by disease, bridging basic science and clinical medicine.', 5),
  ('Microbiology', 'microbiology', 'Bacteriology, virology, mycology, and parasitology notes with clinical infections.', 'Microbiology covers the organisms that cause human disease and the immune and pharmacological responses to them.', 6),
  ('Forensic Medicine', 'forensic-medicine', 'Forensic medicine and toxicology notes for medical-legal practice and exams.', 'Forensic medicine applies medical knowledge to the law: injuries, poisons, death investigation, and medical-legal duties.', 7),
  ('Community Medicine', 'community-medicine', 'Preventive and social medicine notes: epidemiology, biostatistics, and public health.', 'Community medicine focuses on disease prevention and health promotion at the population level.', 8),
  ('Medicine', 'medicine', 'Internal medicine notes organized by system, from cardiology to endocrinology.', 'Internal medicine is the comprehensive, non-surgical management of adult disease.', 9),
  ('Surgery', 'surgery', 'General surgery and surgical specialties notes with operative and clinical emphasis.', 'Surgery covers the operative and peri-operative management of surgical disease.', 10),
  ('Pediatrics', 'pediatrics', 'Pediatrics notes from neonatology through adolescence, with growth and development.', 'Pediatrics is the medical care of children, from the newborn period through adolescence.', 11),
  ('Obstetrics & Gynecology', 'obstetrics-gynecology', 'Obstetrics and gynecology notes covering pregnancy, labor, and women''s health.', 'Obstetrics and gynecology covers pregnancy and childbirth and the health of the female reproductive system.', 12),
  ('ENT', 'ent', 'Ear, nose, and throat (otorhinolaryngology) study notes.', 'Otorhinolaryngology covers disorders of the ear, nose, throat, head, and neck.', 13),
  ('Ophthalmology', 'ophthalmology', 'Ophthalmology notes on the eye, vision, and ocular disease.', 'Ophthalmology is the medical and surgical care of the eye and visual system.', 14),
  ('Radiology', 'radiology', 'Radiology and imaging notes: plain film, CT, MRI, and ultrasound interpretation.', 'Radiology uses imaging to diagnose and guide the treatment of disease.', 15),
  ('Dermatology', 'dermatology', 'Dermatology notes on skin, hair, and nail disease with clinical images.', 'Dermatology is the diagnosis and management of disorders of the skin, hair, and nails.', 16);

-- Anatomy topic taxonomy (example structure used across subjects).
INSERT INTO topics (subject_id, title, slug, description, sort_order)
SELECT id, 'Upper Limb', 'upper-limb', 'Bones, joints, muscles, vessels, and nerves of the upper limb.', 1 FROM subjects WHERE slug = 'anatomy';
INSERT INTO topics (subject_id, title, slug, description, sort_order)
SELECT id, 'Lower Limb', 'lower-limb', 'Bones, joints, muscles, vessels, and nerves of the lower limb.', 2 FROM subjects WHERE slug = 'anatomy';
INSERT INTO topics (subject_id, title, slug, description, sort_order)
SELECT id, 'Thorax', 'thorax', 'Thoracic wall, cavity, mediastinum, heart, and lungs.', 3 FROM subjects WHERE slug = 'anatomy';
INSERT INTO topics (subject_id, title, slug, description, sort_order)
SELECT id, 'Abdomen', 'abdomen', 'Abdominal wall, peritoneum, and abdominal viscera.', 4 FROM subjects WHERE slug = 'anatomy';
INSERT INTO topics (subject_id, title, slug, description, sort_order)
SELECT id, 'Head & Neck', 'head-and-neck', 'Cranium, face, neck, and cranial nerves.', 5 FROM subjects WHERE slug = 'anatomy';
INSERT INTO topics (subject_id, title, slug, description, sort_order)
SELECT id, 'Neuroanatomy', 'neuroanatomy', 'Brain, spinal cord, and peripheral nervous system.', 6 FROM subjects WHERE slug = 'anatomy';
INSERT INTO topics (subject_id, title, slug, description, sort_order)
SELECT id, 'Embryology', 'embryology', 'Development of the human embryo and congenital anomalies.', 7 FROM subjects WHERE slug = 'anatomy';
INSERT INTO topics (subject_id, title, slug, description, sort_order)
SELECT id, 'Histology', 'histology', 'Microscopic structure of tissues and organs.', 8 FROM subjects WHERE slug = 'anatomy';
