-- ====================================================================
-- BRAINLAB ACADEMY: PUBLIC CURATED SAMPLE QUESTIONS SCHEMA
-- Migration: 20261108150000_create_curated_sample_questions.sql
-- ====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.curated_sample_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_slug TEXT NOT NULL,
    topic_context TEXT NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of { letter: "A"|"B"|"C"|"D", text: string }
    correct_letter TEXT NOT NULL CHECK (correct_letter IN ('A', 'B', 'C', 'D', 'E')),
    explanation TEXT NOT NULL,
    rule_title TEXT NOT NULL,
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    is_published BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for rapid retrieval
CREATE INDEX IF NOT EXISTS idx_sample_questions_subject_published 
    ON public.curated_sample_questions (subject_slug, is_published, display_order ASC)
    WHERE is_published = true;

-- Enable Row Level Security
ALTER TABLE public.curated_sample_questions ENABLE ROW LEVEL SECURITY;

-- 1. RLS Policy: Public read access for published sample questions
DROP POLICY IF EXISTS "Public can view published sample questions" ON public.curated_sample_questions;
CREATE POLICY "Public can view published sample questions"
    ON public.curated_sample_questions
    FOR SELECT
    USING (is_published = true);

-- 2. RLS Policy: Administrators have full management rights
DROP POLICY IF EXISTS "Administrators can manage sample questions" ON public.curated_sample_questions;
CREATE POLICY "Administrators can manage sample questions"
    ON public.curated_sample_questions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('super_admin', 'platform_admin', 'cbt_admin')
        )
        OR EXISTS (
            SELECT 1 FROM public.platform_configuration pc
            WHERE pc.key = 'super_admin_override' AND auth.uid() IS NOT NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('super_admin', 'platform_admin', 'cbt_admin')
        )
    );

-- 3. Seed Verified High-Yield Public Sample Questions
INSERT INTO public.curated_sample_questions (
    id, subject_slug, topic_context, question_text, options, correct_letter, explanation, rule_title, difficulty, display_order
) VALUES
(
    '00000000-0000-0000-0000-000000000101',
    'use-of-english',
    'Lexis & Structure (Proximity Concord)',
    'Choose the option that best completes the sentence: "Neither the principal nor the teachers _______ present at the valedictory service yesterday."',
    '[{"letter":"A","text":"were"},{"letter":"B","text":"was"},{"letter":"C","text":"is"},{"letter":"D","text":"are being"}]'::jsonb,
    'A',
    'Under the grammatical rule of proximity with correlative conjunctions ("neither... nor"), the finite verb agrees in number and tense with the subject nearest to it. "Teachers" is plural and the event occurred in the past ("yesterday"), requiring the plural past verb "were".',
    'Rule of Proximity',
    'medium',
    10
),
(
    '00000000-0000-0000-0000-000000000102',
    'use-of-english',
    'Vocabulary (Antonyms / Opposites)',
    'In the sentence: "The politician made an ambiguous statement that misled the public", choose the word nearest in meaning to the OPPOSITE of "ambiguous".',
    '[{"letter":"A","text":"Complicated"},{"letter":"B","text":"Explicit"},{"letter":"C","text":"Dubious"},{"letter":"D","text":"Hesitant"}]'::jsonb,
    'B',
    '"Ambiguous" means open to more than one interpretation or vague. Its direct antonym is "explicit", which means stated clearly and in detail, leaving no room for doubt.',
    'Antonym Context',
    'easy',
    20
),
(
    '00000000-0000-0000-0000-000000000103',
    'use-of-english',
    'Prepositions & Dependent Collocations',
    'Select the correct option to fill the gap: "After a thorough probe, the bursar was exonerated _______ all fraudulent charges."',
    '[{"letter":"A","text":"from"},{"letter":"B","text":"of"},{"letter":"C","text":"against"},{"letter":"D","text":"with"}]'::jsonb,
    'A',
    'The standard English dependent preposition collocated with the verb "exonerate" is "from" (to exonerate someone from blame or charges).',
    'Dependent Preposition',
    'medium',
    30
),
(
    '00000000-0000-0000-0000-000000000104',
    'mathematics',
    'Algebra & Quadratic Equations',
    'Find the value of k for which the quadratic equation 2x² - 8x + k = 0 has two equal real roots.',
    '[{"letter":"A","text":"4"},{"letter":"B","text":"8"},{"letter":"C","text":"16"},{"letter":"D","text":"32"}]'::jsonb,
    'B',
    'A quadratic equation ax² + bx + c = 0 has equal real roots when its discriminant Δ = b² - 4ac = 0. Here, a = 2, b = -8, c = k. Thus: (-8)² - 4(2)(k) = 0 => 64 - 8k = 0 => 8k = 64 => k = 8.',
    'Quadratic Discriminant Condition',
    'medium',
    40
),
(
    '00000000-0000-0000-0000-000000000105',
    'physics',
    'Mechanics (Uniform Acceleration)',
    'A motor vehicle travelling at an initial velocity of 20 m/s decelerates uniformly to rest in a distance of 50 m. Determine the magnitude of deceleration.',
    '[{"letter":"A","text":"2 m/s²"},{"letter":"B","text":"4 m/s²"},{"letter":"C","text":"5 m/s²"},{"letter":"D","text":"10 m/s²"}]'::jsonb,
    'B',
    'Using third equation of linear motion: v² = u² + 2as. Here, initial velocity u = 20 m/s, final velocity v = 0, distance s = 50 m. 0 = (20)² + 2a(50) => 0 = 400 + 100a => 100a = -400 => a = -4 m/s². The magnitude of deceleration is 4 m/s².',
    'Kinematics Equation v² = u² + 2as',
    'medium',
    50
),
(
    '00000000-0000-0000-0000-000000000106',
    'chemistry',
    'Atomic Structure & Periodicity',
    'An element X has an atomic number of 17. Which of the following representations represents its stable electronic configuration upon ion formation?',
    '[{"letter":"A","text":"2, 8, 7"},{"letter":"B","text":"2, 8, 8"},{"letter":"C","text":"2, 8, 6"},{"letter":"D","text":"2, 8, 8, 1"}]'::jsonb,
    'B',
    'Atomic number 17 corresponds to Chlorine (Cl), with neutral electron configuration 2, 8, 7. It achieves octet stability by gaining one electron to form the chloride anion (Cl⁻), yielding the stable noble gas configuration of Argon: 2, 8, 8.',
    'Octet Rule and Anion Formation',
    'easy',
    60
),
(
    '00000000-0000-0000-0000-000000000107',
    'biology',
    'Cellular Biology & Osmoregulation',
    'When red blood cells are placed in a hypotonic solution, they swell and eventually burst. This physiological process is termed:',
    '[{"letter":"A","text":"Plasmolysis"},{"letter":"B","text":"Haemolysis"},{"letter":"C","text":"Crenation"},{"letter":"D","text":"Turgidity"}]'::jsonb,
    'B',
    'Animal cells lack a rigid cellulose cell wall. When immersed in a hypotonic solution, water moves into the cell via endosmosis, causing the cell membrane to stretch and lyse (haemolysis). In plant cells, this produces turgidity, while crenation occurs in hypertonic solutions.',
    'Osmotic Lysis in Animal Cells',
    'medium',
    70
)
ON CONFLICT (id) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    options = EXCLUDED.options,
    explanation = EXCLUDED.explanation,
    updated_at = timezone('utc'::text, now());

COMMIT;
