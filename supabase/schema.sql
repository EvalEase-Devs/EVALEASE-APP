-- ==========================================
-- 1. TEACHER TABLE
-- Stores faculty profile details
-- ==========================================
CREATE TABLE public.teacher (
  teacher_id bigint NOT NULL, --  Primary Key.
  teacher_name text NOT NULL, -- e.g. 'Prof. Sharma'.
  designation text, -- e.g. 'Assistant Professor', 'HOD'.
  department text, -- e.g. 'Computer Engineering'.
  email text, -- e.g. 'sharma@college.edu'. Unique constraint recommended.
  CONSTRAINT teacher_pkey PRIMARY KEY (teacher_id)
);

-- ==========================================
-- 2. STUDENT TABLE
-- Stores student profile details
-- ==========================================
CREATE TABLE public.student (
  pid bigint NOT NULL, -- The Student's unique College ID/PRN (e.g. 12345). Acts as Primary Key.
  stud_name text NOT NULL, -- e.g. 'Aarav Patel'.
  class_name text NOT NULL, -- e.g. 'TE CMPN A' (Standardized string used in filters).
  batch smallint, -- e.g. 1, 2, 3, 4. (For Labs). Can be NULL for theory-only students.
  roll_no integer, -- e.g. 101.
  course text, -- e.g. 'Computer Engineering' (Often redundant with branch, but kept for legacy support).
  email_id varchar, 
  CONSTRAINT student_pkey PRIMARY KEY (pid)
);

-- ==========================================
-- 3. CO (COURSE OUTCOMES) TABLE
-- Uses Composite Key: Subject Code + CO Number
-- ==========================================
CREATE TABLE public.co (
  sub_id character varying NOT NULL, -- e.g. 'CSC501'. Part of Composite Primary Key.
  co_no bigint NOT NULL, -- e.g. 1, 2, 3, 4, 5, 6. Part of Composite Primary Key.
  co_description text NOT NULL, -- e.g. 'Apply algorithms to solve complex problems...'.
  CONSTRAINT co_pkey PRIMARY KEY (sub_id, co_no)
);

-- ==========================================
-- 4. LO (LAB OUTCOMES) TABLE
-- Uses Composite Key: Subject Code + LO Number
-- ==========================================
CREATE TABLE public.lo (
  sub_id character varying NOT NULL, -- e.g. 'CSL501'. Part of Composite Primary Key.
  lo_no bigint NOT NULL, -- e.g. 1, 2, 3. Part of Composite Primary Key.
  lo_description text NOT NULL, -- e.g. 'Implement Stack data structure...'.
  CONSTRAINT lo_pkey PRIMARY KEY (sub_id, lo_no)
);

-- ==========================================
-- 5. EXPERIMENT TABLE
-- Uses Composite Key: Subject Code + Experiment Number
-- ==========================================
CREATE TABLE public.experiment (
  sub_id character varying NOT NULL, -- e.g. 'CSL501'. Part of Composite Primary Key.
  exp_no bigint NOT NULL, -- e.g. 1, 2, 3... 10. Part of Composite Primary Key.
  exp_name text NOT NULL, -- e.g. 'Stack Implementation'.
  CONSTRAINT experiment_pkey PRIMARY KEY (sub_id, exp_no)
);

-- ==========================================
-- 6. EXPERIMENT <> LO MAPPING
-- Junction table linking Experiments to Lab Outcomes
-- ==========================================
CREATE TABLE public.experiment_lo_mapping (
  sub_id character varying NOT NULL, -- e.g. 'CSL501'.
  exp_no bigint NOT NULL, -- e.g. 1.
  lo_no bigint NOT NULL, -- e.g. 1. (Means Exp 1 maps to LO1).
  CONSTRAINT experiment_lo_mapping_pkey PRIMARY KEY (sub_id, exp_no, lo_no),
  CONSTRAINT fk_map_exp_lo FOREIGN KEY (sub_id, exp_no) REFERENCES public.experiment(sub_id, exp_no) ON DELETE CASCADE,
  CONSTRAINT fk_map_lo FOREIGN KEY (sub_id, lo_no) REFERENCES public.lo(sub_id, lo_no) ON DELETE CASCADE
);

-- ==========================================
-- 7. ALLOTMENT TABLE
-- Links a Teacher to a specific Subject, Class, and Batch
-- ==========================================
CREATE TABLE public.allotment (
  allotment_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL, -- Auto-incrementing Primary Key.
  teacher_id bigint NOT NULL, -- Foreign Key to public.teacher.
  sub_id character varying NOT NULL, -- e.g. 'CSC501'. The subject code.
  sub_name character varying NOT NULL, -- e.g. 'Data Structures'. 
  class_name character varying NOT NULL, -- e.g. 'TE CMPN A'. The target class.
  batch_no smallint, -- e.g. 1, 2, 3, 4. Use 0 or NULL for Theory (Lecture) allotments involving the whole class.
  is_subject_incharge boolean DEFAULT false, -- e.g. true/false. Grants extra permissions like finalizing reports.
  course character varying, -- e.g. 'Computer Engineering'.
  type character varying, -- e.g. 'Lec' or 'Lab'. Strict Enum logic in frontend.
  current_sem varchar, -- e.g. 'SEM 5', 'SEM 6', 'SEM 7'. Redundant but useful for filtering.
  CONSTRAINT allotment_pkey PRIMARY KEY (allotment_id),
  CONSTRAINT allotment_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teacher(teacher_id)
);

-- ==========================================
-- 8. TASK TABLE
-- The central table for all assessments (ISE, MSE, Assignments, Lab Experiments)
-- ==========================================
CREATE TABLE public.task (
  task_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL, -- Auto-incrementing Primary Key.
  allotment_id bigint NOT NULL, -- Foreign Key to allotment. Connects Task to Teacher/Class.
  
  -- Basic Info
  title text NOT NULL, -- e.g. 'Module 1 Test' or 'CSC501 - ISE 1'.
  task_type character varying NOT NULL, -- e.g. 'Lec' or 'Lab'.
  
  -- Classification
  assessment_type character varying, -- e.g. 'ISE', 'MSE'. NULL for Lab.
  assessment_sub_type character varying, -- e.g. 'Subjective', 'MCQ'. NULL if not ISE.
  
  -- Relationships
  sub_id character varying NOT NULL, -- e.g. 'CSC501'.
  exp_no bigint, -- e.g. 1. NULL for Theory Tasks. If present, links to experiment table.
  
  -- Scheduling & Scoring
  max_marks numeric NOT NULL, -- e.g. 20.0. Total marks possible.
  start_time timestamp with time zone, -- e.g. '2023-10-15 10:00:00+00'. ISO String. Required for MCQs/Timed Tests.
  end_time timestamp with time zone, -- e.g. '2023-10-15 11:00:00+00'. ISO String. Acts as Due Date.
  created_at timestamp with time zone DEFAULT now(), -- Timestamp of creation.
  
  -- Dynamic Structures (JSONB)
  mcq_questions jsonb, 
  -- Format: Array of Objects
  -- e.g. [{"id": "1", "text": "What is complexity?", "options": ["O(1)", "O(n)"], "correctOptionIndex": 0, "marks": 2}]
  
  sub_questions jsonb, 
  -- Format: Array of Objects (For MSE Breakdown)
  -- e.g. [{"label": "Q1A", "co": "CO1", "marks": 5}, {"label": "Q1B", "co": "CO2", "marks": 5}]
  
  CONSTRAINT task_pkey PRIMARY KEY (task_id),
  CONSTRAINT task_allotment_id_fkey FOREIGN KEY (allotment_id) REFERENCES public.allotment(allotment_id) ON DELETE CASCADE,
  CONSTRAINT fk_task_experiment FOREIGN KEY (sub_id, exp_no) REFERENCES public.experiment(sub_id, exp_no)
);

-- ==========================================
-- 9. TASK <> CO MAPPING
-- For Theory tasks (ISE/MSE) where COs are mapped manually or per question
-- Stores the mapping when teacher selects multiple COs for a task
-- ==========================================
CREATE TABLE public.task_co_mapping (
  task_id bigint NOT NULL, -- Foreign Key to task.
  sub_id character varying NOT NULL, -- Part of CO Composite Key.
  co_no bigint NOT NULL, -- Part of CO Composite Key. e.g. 1 (Maps task to CO1).
  CONSTRAINT task_co_mapping_pkey PRIMARY KEY (task_id, co_no),
  CONSTRAINT task_co_mapping_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(task_id) ON DELETE CASCADE,
  CONSTRAINT fk_task_co FOREIGN KEY (sub_id, co_no) REFERENCES public.co(sub_id, co_no)
);
-- ==========================================
-- 9. MARKS TABLE
-- Stores student submissions and granular marks
-- ==========================================
CREATE TABLE public.marks (
  mark_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL, -- Primary Key.
  task_id bigint NOT NULL, -- Foreign Key to task.
  stud_pid bigint NOT NULL, -- Foreign Key to student.
  
  -- Scoring
  total_marks_obtained numeric NOT NULL, -- e.g. 18.5. The final aggregate score.
  
  -- Granular Data (Crucial for OBE)
  question_marks jsonb, 
  -- Format: Key-Value Pair Object
  -- Case A (Subjective/MSE): {"Q1A": 5, "Q1B": 3, "Q2": 4}
  -- Case B (MCQ): {"q_id_1710": 1, "q_id_1711": 0} (Stores score per question ID)
  
  -- Metadata
  status character varying DEFAULT 'Pending', -- e.g. 'Submitted', 'Pending'.
  submitted_at timestamp with time zone DEFAULT now(), -- Timestamp of submission.
  
  CONSTRAINT marks_pkey PRIMARY KEY (mark_id),
  CONSTRAINT marks_unique_submission UNIQUE (task_id, stud_pid), -- Ensures one entry per student per task.
  CONSTRAINT marks_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(task_id) ON DELETE CASCADE,
  CONSTRAINT marks_stud_pid_fkey FOREIGN KEY (stud_pid) REFERENCES public.student(pid) ON DELETE CASCADE
);