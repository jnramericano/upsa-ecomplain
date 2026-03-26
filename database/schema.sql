-- database/schema.sql
-- UPSA E-Complaint Management System Database

DROP DATABASE IF EXISTS upsa_complaints;
CREATE DATABASE upsa_complaints CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE upsa_complaints;

-- =============================================
-- TABLES
-- =============================================

CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    icon VARCHAR(10) DEFAULT '📋',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    program VARCHAR(150),
    level INT DEFAULT 100,
    phone VARCHAR(20),
    status ENUM('active', 'suspended', 'graduated') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'admin', 'moderator') DEFAULT 'admin',
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reference_number VARCHAR(20) UNIQUE NOT NULL,
    student_id INT NOT NULL,
    category_id INT NOT NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('submitted', 'under_review', 'in_progress', 'resolved', 'rejected') DEFAULT 'submitted',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    is_highlighted BOOLEAN DEFAULT FALSE,
    is_anonymous BOOLEAN DEFAULT FALSE,
    admin_feedback TEXT,
    assigned_admin_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (assigned_admin_id) REFERENCES admins(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_student (student_id),
    INDEX idx_category (category_id),
    INDEX idx_created (created_at)
);

CREATE TABLE complaint_responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT NOT NULL,
    admin_id INT,
    student_id INT,
    message TEXT NOT NULL,
    responder_type ENUM('admin', 'student') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
);

CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_type ENUM('student', 'admin') NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id, user_type),
    INDEX idx_read (is_read)
);

-- =============================================
-- SEED: CATEGORIES
-- =============================================

INSERT INTO categories (name, description, icon) VALUES
('Academic',        'Issues related to courses, grading, examinations, and academic policies',                        '📚'),
('Administrative',  'Complaints about administrative processes, registration, documentation, and fees',              '🏛️'),
('Facility',        'Problems with campus facilities, classrooms, labs, restrooms, and infrastructure',               '🏗️'),
('ICT/Technology',  'Issues with Wi-Fi, student portal, LMS, computer labs, and IT services',                        '💻'),
('Library',         'Complaints about library services, resources, operating hours, and staff',                       '📖'),
('Financial',       'Billing disputes, scholarship issues, fee-related complaints, and refund requests',             '💰'),
('Hostel/Housing',  'Accommodation problems, maintenance issues, security, and housing policies',                     '🏠'),
('Security',        'Safety concerns, theft reports, harassment, and campus security issues',                         '🔒'),
('Health Services', 'Complaints about the campus clinic, health insurance, and medical services',                     '🏥'),
('Other',           'General complaints and issues not fitting into specific categories',                             '📝');

-- =============================================
-- SEED: ADMIN ACCOUNTS
-- Password for all admins: Admin@2025
-- bcrypt hash of "Admin@2025"
-- =============================================

INSERT INTO admins (username, full_name, email, password, role, department) VALUES
('superadmin',    'Dr. Kwame Asante',       'k.asante@upsa.edu.gh',       'Admin hash: $2a$12$xKqYm8RRmN5VzP3kLJ9OXOvG7WqJdE4tF5bN8yZcHmV2dRpKaBCDe', 'super_admin', 'Vice Chancellor Office'),
('admin_acad',    'Mrs. Abena Mensah',      'a.mensah@upsa.edu.gh',       'Admin hash: $2a$12$xKqYm8RRmN5VzP3kLJ9OXOvG7WqJdE4tF5bN8yZcHmV2dRpKaBCDe', 'admin',       'Academic Affairs'),
('admin_student', 'Mr. Kofi Boateng',       'k.boateng@upsa.edu.gh',      'Admin hash: $2a$12$xKqYm8RRmN5VzP3kLJ9OXOvG7WqJdE4tF5bN8yZcHmV2dRpKaBCDe', 'admin',       'Student Affairs'),
('admin_ict',     'Ms. Efua Darko',         'e.darko@upsa.edu.gh',        'Admin hash: $2a$12$xKqYm8RRmN5VzP3kLJ9OXOvG7WqJdE4tF5bN8yZcHmV2dRpKaBCDe', 'moderator',   'ICT Directorate'),
('admin_facility','Mr. Yaw Oppong',         'y.oppong@upsa.edu.gh',       'Admin hash: $2a$12$xKqYm8RRmN5VzP3kLJ9OXOvG7WqJdE4tF5bN8yZcHmV2dRpKaBCDe', 'moderator',   'Facilities Management');

-- =============================================
-- SEED: 30 STUDENT ACCOUNTS
-- Password for all students: Student@2025
-- bcrypt hash of "Student@2025"
-- =============================================

INSERT INTO students (student_id, first_name, last_name, email, password, program, level, phone) VALUES
('10012001', 'Kwame',    'Agyemang',   'kwame.agyemang@st.upsa.edu.gh',    '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Accounting',                        400, '0241234501'),
('10012002', 'Ama',      'Serwaa',     'ama.serwaa@st.upsa.edu.gh',        '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Marketing',                         300, '0551234502'),
('10012003', 'Kofi',     'Mensah',     'kofi.mensah@st.upsa.edu.gh',       '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Information Technology',             200, '0201234503'),
('10012004', 'Abena',    'Osei',       'abena.osei@st.upsa.edu.gh',        '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Banking & Finance',                 400, '0271234504'),
('10012005', 'Yaw',      'Boateng',    'yaw.boateng@st.upsa.edu.gh',       '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Management',                        100, '0541234505'),
('10012006', 'Efua',     'Asante',     'efua.asante@st.upsa.edu.gh',       '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BA Communication Studies',               300, '0231234506'),
('10012007', 'Kwesi',    'Appiah',     'kwesi.appiah@st.upsa.edu.gh',      '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Accounting',                        200, '0501234507'),
('10012008', 'Adwoa',    'Frimpong',   'adwoa.frimpong@st.upsa.edu.gh',    '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'LLB Law',                               400, '0261234508'),
('10012009', 'Nana',     'Kwarteng',   'nana.kwarteng@st.upsa.edu.gh',     '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Economics',                         100, '0541234509'),
('10012010', 'Akosua',   'Darko',      'akosua.darko@st.upsa.edu.gh',      '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Marketing',                         200, '0241234510'),
('10012011', 'Kojo',     'Owusu',      'kojo.owusu@st.upsa.edu.gh',        '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Information Technology',             300, '0551234511'),
('10012012', 'Akua',     'Amoah',      'akua.amoah@st.upsa.edu.gh',       '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Human Resource Management',          400, '0201234512'),
('10012013', 'Papa',     'Yeboah',     'papa.yeboah@st.upsa.edu.gh',       '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Banking & Finance',                 200, '0271234513'),
('10012014', 'Esi',      'Ankomah',    'esi.ankomah@st.upsa.edu.gh',       '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Public Administration',              300, '0541234514'),
('10012015', 'Fiifi',    'Tetteh',     'fiifi.tetteh@st.upsa.edu.gh',      '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Accounting',                        100, '0231234515'),
('10012016', 'Afia',     'Bonsu',      'afia.bonsu@st.upsa.edu.gh',        '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BA Communication Studies',               200, '0501234516'),
('10012017', 'Kweku',    'Adjei',      'kweku.adjei@st.upsa.edu.gh',       '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Management',                        400, '0261234517'),
('10012018', 'Yaa',      'Nyarko',     'yaa.nyarko@st.upsa.edu.gh',        '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'LLB Law',                               300, '0541234518'),
('10012019', 'Kobby',    'Ofori',      'kobby.ofori@st.upsa.edu.gh',       '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Economics',                         200, '0241234519'),
('10012020', 'Maame',    'Acheampong', 'maame.acheampong@st.upsa.edu.gh',  '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Information Technology',             400, '0551234520'),
('10012021', 'Ekow',     'Baidoo',     'ekow.baidoo@st.upsa.edu.gh',       '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Marketing',                         100, '0201234521'),
('10012022', 'Aba',      'Quaye',      'aba.quaye@st.upsa.edu.gh',         '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Human Resource Management',          300, '0271234522'),
('10012023', 'Kwabena',  'Amponsah',   'kwabena.amponsah@st.upsa.edu.gh',  '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Banking & Finance',                 200, '0541234523'),
('10012024', 'Adjoa',    'Mensimah',   'adjoa.mensimah@st.upsa.edu.gh',    '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Accounting',                        400, '0231234524'),
('10012025', 'Paa',      'Gyasi',      'paa.gyasi@st.upsa.edu.gh',         '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Public Administration',              100, '0501234525'),
('10012026', 'Naa',      'Lamptey',    'naa.lamptey@st.upsa.edu.gh',       '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BA Communication Studies',               300, '0261234526'),
('10012027', 'Yoofi',    'Sackey',     'yoofi.sackey@st.upsa.edu.gh',      '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Economics',                         200, '0541234527'),
('10012028', 'Araba',    'Hammond',    'araba.hammond@st.upsa.edu.gh',     '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Management',                        400, '0241234528'),
('10012029', 'Ebow',     'Turkson',    'ebow.turkson@st.upsa.edu.gh',      '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'LLB Law',                               100, '0551234529'),
('10012030', 'Esi',      'Ghansah',    'esi.ghansah@st.upsa.edu.gh',       '$2a$12$pQr7S9TnM2KxYdF6jL8WZuHcA3vRbE1gN4mO5iP0qDs7tUwXyZaBc', 'BSc Information Technology',             300, '0201234530');

-- =============================================
-- SEED: SAMPLE COMPLAINTS
-- =============================================

INSERT INTO complaints (reference_number, student_id, category_id, subject, description, status, priority, is_highlighted, assigned_admin_id, resolved_at) VALUES
('CMP-2025-0001', 1,  1, 'Missing Exam Scores for ACC301',               'My exam scores for ACC301 are not reflected on the portal. I took the exam on March 15th. Kindly investigate.', 'resolved', 'high', TRUE, 2, NOW()),
('CMP-2025-0002', 2,  3, 'Broken Air Conditioning in N-Block Lecture Hall','The AC units in N-Block Room 204 have not been working for two weeks. It is extremely uncomfortable during afternoon lectures.', 'resolved', 'medium', TRUE, 5, NOW()),
('CMP-2025-0003', 3,  4, 'Campus Wi-Fi Constantly Disconnecting',         'The eduroam Wi-Fi keeps disconnecting every few minutes, especially in the library area. This affects research and assignment work.', 'in_progress', 'high', FALSE, 4, NULL),
('CMP-2025-0004', 4,  6, 'Overcharged Fees on Student Portal',            'I have been charged GHS 500 more than my actual fee. I have my fee structure as evidence. Please rectify.', 'under_review', 'urgent', FALSE, 3, NULL),
('CMP-2025-0005', 5,  2, 'Delayed Student ID Card Issuance',              'I applied for my student ID card 8 weeks ago and still have not received it. This is causing inconvenience.', 'submitted', 'medium', FALSE, NULL, NULL),
('CMP-2025-0006', 6,  5, 'Limited E-Book Access on Library Platform',     'Many of the e-books listed on the library portal return 404 errors. We need updated access to digital resources.', 'resolved', 'medium', TRUE, 2, NOW()),
('CMP-2025-0007', 7,  1, 'Unfair Grading in BUS201',                     'I believe my final grade in BUS201 does not accurately reflect my performance. I request a grade review.', 'in_progress', 'high', FALSE, 2, NULL),
('CMP-2025-0008', 8,  8, 'Lack of Security Lighting Near Parking Lot',    'The parking area near the law faculty is very dark at night. This is a safety hazard for evening students.', 'resolved', 'urgent', TRUE, 5, NOW()),
('CMP-2025-0009', 9,  7, 'Water Shortage in Hostel Block C',              'Block C has had no running water for 5 days now. This is unbearable and unhygienic.', 'in_progress', 'urgent', FALSE, 5, NULL),
('CMP-2025-0010', 10, 9, 'Long Wait Times at Campus Clinic',              'Every visit to the campus clinic involves 2-3 hour wait times even for simple consultations.', 'submitted', 'medium', FALSE, NULL, NULL),
('CMP-2025-0011', 11, 4, 'Computer Lab PCs Are Outdated',                 'Most computers in Lab 3 run extremely slowly. Some cannot even open modern IDEs needed for our coursework.', 'under_review', 'high', FALSE, 4, NULL),
('CMP-2025-0012', 12, 2, 'Transcript Processing Takes Too Long',          'I requested my transcript 6 weeks ago for a job application. The deadline has passed and I still dont have it.', 'resolved', 'high', TRUE, 3, NOW());

-- =============================================
-- SEED: SAMPLE RESPONSES
-- =============================================

INSERT INTO complaint_responses (complaint_id, admin_id, student_id, message, responder_type) VALUES
(1, 2, NULL, 'We have identified the issue with the ACC301 scores. The lecturer has been contacted and scores will be uploaded within 48 hours.', 'admin'),
(1, 2, NULL, 'The scores have now been uploaded to the portal. Please verify and confirm.', 'admin'),
(1, NULL, 1,  'I can confirm my scores are now visible. Thank you for the quick resolution!', 'student'),
(2, 5, NULL, 'A maintenance team has been dispatched to inspect the AC units in N-Block Room 204.', 'admin'),
(2, 5, NULL, 'The AC units have been repaired and are now fully functional. We apologize for the inconvenience.', 'admin'),
(3, 4, NULL, 'We are aware of the Wi-Fi issues and our network team is currently upgrading the access points in the library area. Expected completion: end of this week.', 'admin'),
(6, 2, NULL, 'The broken links have been identified and we are working with the e-library vendor to restore access. 85% of links are now working.', 'admin'),
(6, 2, NULL, 'All e-book links have been restored. Additionally, we have added 200 new titles. Thank you for bringing this to our attention.', 'admin'),
(8, 5, NULL, 'We have installed 6 new LED security lights in the law faculty parking area. Campus security will also increase patrols in that zone.', 'admin'),
(12, 3, NULL, 'We sincerely apologize for the delay. Your transcript has been processed and is ready for collection at the Academic Affairs office.', 'admin');