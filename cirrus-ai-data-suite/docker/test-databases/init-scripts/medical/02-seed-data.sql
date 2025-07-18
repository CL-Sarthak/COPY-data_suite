-- Seed Data for Medical Records Database
-- Contains realistic medical data with PII, PHI, and various medical information

-- Create temporary tables to store generated IDs for foreign key references
CREATE TEMP TABLE temp_provider_ids AS 
SELECT uuid_generate_v4() as provider_id, provider_name FROM (VALUES
    ('Blue Cross Blue Shield'),
    ('United Healthcare'),
    ('Kaiser Permanente'),
    ('Aetna'),
    ('Medicare')
) AS t(provider_name);

CREATE TEMP TABLE temp_department_ids AS
SELECT uuid_generate_v4() as department_id, department_name FROM (VALUES
    ('Emergency Department'),
    ('Cardiology'),
    ('Internal Medicine'),
    ('Pediatrics'),
    ('Orthopedics'),
    ('Laboratory'),
    ('Radiology')
) AS t(department_name);

CREATE TEMP TABLE temp_healthcare_provider_ids AS
SELECT uuid_generate_v4() as provider_id, last_name FROM (VALUES
    ('Johnson'),
    ('Chen'),
    ('Rodriguez'),
    ('Thompson'),
    ('Anderson'),
    ('Wilson')
) AS t(last_name);

CREATE TEMP TABLE temp_medication_ids AS
SELECT uuid_generate_v4() as medication_id, medication_name FROM (VALUES
    ('Lipitor'),
    ('Metformin'),
    ('Lisinopril'),
    ('Amoxicillin'),
    ('Omeprazole'),
    ('Albuterol'),
    ('Levothyroxine'),
    ('Ibuprofen')
) AS t(medication_name);

CREATE TEMP TABLE temp_test_ids AS
SELECT uuid_generate_v4() as test_id, test_name FROM (VALUES
    ('Complete Blood Count'),
    ('Hemoglobin'),
    ('White Blood Cell Count'),
    ('Glucose'),
    ('Cholesterol Total'),
    ('Creatinine'),
    ('TSH'),
    ('Blood Pressure')
) AS t(test_name);

CREATE TEMP TABLE temp_patient_ids AS
SELECT uuid_generate_v4() as patient_id, last_name FROM (VALUES
    ('Smith'),
    ('Martinez'),
    ('Chang'),
    ('Thompson'),
    ('Johnson')
) AS t(last_name);

-- Insert Insurance Providers
INSERT INTO insurance_providers (provider_id, provider_name, provider_type, phone, website)
SELECT 
    provider_id,
    provider_name,
    CASE provider_name
        WHEN 'Blue Cross Blue Shield' THEN 'PPO'
        WHEN 'United Healthcare' THEN 'HMO'
        WHEN 'Kaiser Permanente' THEN 'HMO'
        WHEN 'Aetna' THEN 'PPO'
        WHEN 'Medicare' THEN 'Medicare'
    END,
    CASE provider_name
        WHEN 'Blue Cross Blue Shield' THEN '1-800-262-2583'
        WHEN 'United Healthcare' THEN '1-866-633-2446'
        WHEN 'Kaiser Permanente' THEN '1-800-464-4000'
        WHEN 'Aetna' THEN '1-800-872-3862'
        WHEN 'Medicare' THEN '1-800-633-4227'
    END,
    CASE provider_name
        WHEN 'Blue Cross Blue Shield' THEN 'www.bcbs.com'
        WHEN 'United Healthcare' THEN 'www.uhc.com'
        WHEN 'Kaiser Permanente' THEN 'www.kaiserpermanente.org'
        WHEN 'Aetna' THEN 'www.aetna.com'
        WHEN 'Medicare' THEN 'www.medicare.gov'
    END
FROM temp_provider_ids;

-- Insert Departments
INSERT INTO departments (department_id, department_name, department_type, phone, location)
SELECT 
    department_id,
    department_name,
    CASE department_name
        WHEN 'Emergency Department' THEN 'Emergency'
        WHEN 'Cardiology' THEN 'Specialty'
        WHEN 'Internal Medicine' THEN 'Primary Care'
        WHEN 'Pediatrics' THEN 'Primary Care'
        WHEN 'Orthopedics' THEN 'Specialty'
        WHEN 'Laboratory' THEN 'Diagnostic'
        WHEN 'Radiology' THEN 'Diagnostic'
    END,
    '555-0' || (ROW_NUMBER() OVER ())::text || '00',
    'Building ' || CHR(64 + (ROW_NUMBER() OVER ())::int) || ', Floor ' || ((ROW_NUMBER() OVER () - 1) % 3 + 1)::text
FROM temp_department_ids;

-- Insert Healthcare Providers
INSERT INTO providers (provider_id, npi_number, first_name, last_name, title, specialty, license_number, license_state, phone, email)
SELECT
    provider_id,
    (1234567890 + ROW_NUMBER() OVER () - 1)::text,
    CASE last_name
        WHEN 'Johnson' THEN 'Sarah'
        WHEN 'Chen' THEN 'Michael'
        WHEN 'Rodriguez' THEN 'Emily'
        WHEN 'Thompson' THEN 'David'
        WHEN 'Anderson' THEN 'Lisa'
        WHEN 'Wilson' THEN 'James'
    END,
    last_name,
    CASE last_name
        WHEN 'Johnson' THEN 'MD'
        WHEN 'Chen' THEN 'MD'
        WHEN 'Rodriguez' THEN 'MD'
        WHEN 'Thompson' THEN 'MD'
        WHEN 'Anderson' THEN 'RN'
        WHEN 'Wilson' THEN 'PA'
    END,
    CASE last_name
        WHEN 'Johnson' THEN 'Internal Medicine'
        WHEN 'Chen' THEN 'Cardiology'
        WHEN 'Rodriguez' THEN 'Pediatrics'
        WHEN 'Thompson' THEN 'Orthopedics'
        WHEN 'Anderson' THEN 'Emergency'
        WHEN 'Wilson' THEN 'Internal Medicine'
    END,
    CASE 
        WHEN last_name IN ('Johnson', 'Chen', 'Rodriguez', 'Thompson') THEN 'MD' || (123456 + ROW_NUMBER() OVER () - 1)::text
        WHEN last_name = 'Anderson' THEN 'RN567890'
        ELSE 'PA678901'
    END,
    'CA',
    '555-100' || ROW_NUMBER() OVER ()::text,
    LOWER(SUBSTR(CASE last_name
        WHEN 'Johnson' THEN 'Sarah'
        WHEN 'Chen' THEN 'Michael'
        WHEN 'Rodriguez' THEN 'Emily'
        WHEN 'Thompson' THEN 'David'
        WHEN 'Anderson' THEN 'Lisa'
        WHEN 'Wilson' THEN 'James'
    END, 1, 1) || last_name) || '@hospital.com'
FROM temp_healthcare_provider_ids;

-- Insert Medications
INSERT INTO medications (medication_id, medication_name, generic_name, medication_class)
SELECT
    medication_id,
    medication_name,
    CASE medication_name
        WHEN 'Lipitor' THEN 'Atorvastatin'
        WHEN 'Metformin' THEN 'Metformin'
        WHEN 'Lisinopril' THEN 'Lisinopril'
        WHEN 'Amoxicillin' THEN 'Amoxicillin'
        WHEN 'Omeprazole' THEN 'Omeprazole'
        WHEN 'Albuterol' THEN 'Albuterol'
        WHEN 'Levothyroxine' THEN 'Levothyroxine'
        WHEN 'Ibuprofen' THEN 'Ibuprofen'
    END,
    CASE medication_name
        WHEN 'Lipitor' THEN 'Statin'
        WHEN 'Metformin' THEN 'Antidiabetic'
        WHEN 'Lisinopril' THEN 'ACE Inhibitor'
        WHEN 'Amoxicillin' THEN 'Antibiotic'
        WHEN 'Omeprazole' THEN 'Proton Pump Inhibitor'
        WHEN 'Albuterol' THEN 'Bronchodilator'
        WHEN 'Levothyroxine' THEN 'Thyroid Hormone'
        WHEN 'Ibuprofen' THEN 'NSAID'
    END
FROM temp_medication_ids;

-- Insert Lab Tests
INSERT INTO lab_tests (test_id, test_name, test_code, test_category, normal_range_low, normal_range_high, unit_of_measure)
SELECT
    test_id,
    test_name,
    CASE test_name
        WHEN 'Complete Blood Count' THEN 'CBC'
        WHEN 'Hemoglobin' THEN 'HGB'
        WHEN 'White Blood Cell Count' THEN 'WBC'
        WHEN 'Glucose' THEN 'GLU'
        WHEN 'Cholesterol Total' THEN 'CHOL'
        WHEN 'Creatinine' THEN 'CREAT'
        WHEN 'TSH' THEN 'TSH'
        WHEN 'Blood Pressure' THEN 'BP'
    END,
    'Blood',
    CASE test_name
        WHEN 'Hemoglobin' THEN 12.0
        WHEN 'White Blood Cell Count' THEN 4.5
        WHEN 'Glucose' THEN 70
        WHEN 'Cholesterol Total' THEN 0
        WHEN 'Creatinine' THEN 0.6
        WHEN 'TSH' THEN 0.4
        ELSE NULL
    END,
    CASE test_name
        WHEN 'Hemoglobin' THEN 16.0
        WHEN 'White Blood Cell Count' THEN 11.0
        WHEN 'Glucose' THEN 99
        WHEN 'Cholesterol Total' THEN 200
        WHEN 'Creatinine' THEN 1.2
        WHEN 'TSH' THEN 4.0
        ELSE NULL
    END,
    CASE test_name
        WHEN 'Hemoglobin' THEN 'g/dL'
        WHEN 'White Blood Cell Count' THEN 'K/uL'
        WHEN 'Glucose' THEN 'mg/dL'
        WHEN 'Cholesterol Total' THEN 'mg/dL'
        WHEN 'Creatinine' THEN 'mg/dL'
        WHEN 'TSH' THEN 'mIU/L'
        WHEN 'Blood Pressure' THEN 'mmHg'
        ELSE NULL
    END
FROM temp_test_ids;

-- Insert Patients
INSERT INTO patients (patient_id, medical_record_number, first_name, last_name, middle_name, date_of_birth, gender, ssn, email, phone_primary, phone_secondary, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, blood_type)
SELECT
    patient_id,
    'MRN-00' || (1234 + ROW_NUMBER() OVER () - 1)::text,
    CASE last_name
        WHEN 'Smith' THEN 'Robert'
        WHEN 'Martinez' THEN 'Jennifer'
        WHEN 'Chang' THEN 'Michael'
        WHEN 'Thompson' THEN 'Emma'
        WHEN 'Johnson' THEN 'Sarah'
    END,
    last_name,
    CASE last_name
        WHEN 'Smith' THEN 'James'
        WHEN 'Martinez' THEN 'Marie'
        ELSE NULL
    END,
    CASE last_name
        WHEN 'Smith' THEN '1948-03-15'::date
        WHEN 'Martinez' THEN '1975-07-22'::date
        WHEN 'Chang' THEN '1995-11-08'::date
        WHEN 'Thompson' THEN '2015-09-30'::date
        WHEN 'Johnson' THEN '1990-12-03'::date
    END,
    CASE last_name
        WHEN 'Smith' THEN 'Male'
        WHEN 'Martinez' THEN 'Female'
        WHEN 'Chang' THEN 'Male'
        WHEN 'Thompson' THEN 'Female'
        WHEN 'Johnson' THEN 'Female'
    END,
    CASE last_name
        WHEN 'Smith' THEN '123-45-6789'
        WHEN 'Martinez' THEN '234-56-7890'
        WHEN 'Chang' THEN '345-67-8901'
        WHEN 'Thompson' THEN '456-78-9012'
        WHEN 'Johnson' THEN '567-89-0123'
    END,
    CASE last_name
        WHEN 'Smith' THEN 'robert.smith@email.com'
        WHEN 'Martinez' THEN 'jmartinez@email.com'
        WHEN 'Chang' THEN 'mchang95@email.com'
        WHEN 'Thompson' THEN NULL
        WHEN 'Johnson' THEN 'sjohnson90@email.com'
    END,
    '(555) ' || (123 + ROW_NUMBER() OVER () - 1)::text || '-' || (4567 + ROW_NUMBER() OVER () - 1)::text,
    CASE last_name
        WHEN 'Smith' THEN '(555) 987-6543'
        ELSE NULL
    END,
    CASE last_name
        WHEN 'Smith' THEN 'Mary Smith'
        WHEN 'Martinez' THEN 'Carlos Martinez'
        WHEN 'Chang' THEN 'Susan Chang'
        WHEN 'Thompson' THEN 'David Thompson'
        WHEN 'Johnson' THEN 'Mark Johnson'
    END,
    '(555) ' || (123 + ROW_NUMBER() OVER () - 1)::text || '-' || (4568 + ROW_NUMBER() OVER () - 1)::text,
    CASE last_name
        WHEN 'Smith' THEN 'Wife'
        WHEN 'Martinez' THEN 'Husband'
        WHEN 'Chang' THEN 'Mother'
        WHEN 'Thompson' THEN 'Father'
        WHEN 'Johnson' THEN 'Husband'
    END,
    CASE last_name
        WHEN 'Smith' THEN 'O+'
        WHEN 'Martinez' THEN 'A+'
        WHEN 'Chang' THEN 'B+'
        WHEN 'Thompson' THEN 'O-'
        WHEN 'Johnson' THEN 'AB+'
    END
FROM temp_patient_ids;

-- Insert Patient Addresses
INSERT INTO patient_addresses (patient_id, address_type, street_address_1, street_address_2, city, state_province, postal_code, is_primary)
SELECT
    p.patient_id,
    'home',
    CASE p.last_name
        WHEN 'Smith' THEN '123 Oak Street'
        WHEN 'Martinez' THEN '456 Elm Avenue'
        WHEN 'Chang' THEN '789 Pine Road'
        WHEN 'Thompson' THEN '321 Maple Drive'
        WHEN 'Johnson' THEN '654 Cedar Lane'
    END,
    CASE p.last_name
        WHEN 'Smith' THEN 'Apt 4B'
        WHEN 'Johnson' THEN 'Unit 12'
        ELSE NULL
    END,
    CASE p.last_name
        WHEN 'Smith' THEN 'San Francisco'
        WHEN 'Martinez' THEN 'Los Angeles'
        WHEN 'Chang' THEN 'San Diego'
        WHEN 'Thompson' THEN 'Sacramento'
        WHEN 'Johnson' THEN 'Oakland'
    END,
    'CA',
    CASE p.last_name
        WHEN 'Smith' THEN '94102'
        WHEN 'Martinez' THEN '90001'
        WHEN 'Chang' THEN '92101'
        WHEN 'Thompson' THEN '95814'
        WHEN 'Johnson' THEN '94601'
    END,
    true
FROM patients p
JOIN temp_patient_ids t ON p.patient_id = t.patient_id;

-- Insert Patient Insurance (simplified - matching by provider name)
INSERT INTO patient_insurance (patient_id, provider_id, policy_number, group_number, subscriber_name, subscriber_relationship, effective_date)
SELECT
    p.patient_id,
    ip.provider_id,
    CASE p.last_name
        WHEN 'Smith' THEN 'MED123456789'
        WHEN 'Martinez' THEN 'BCBS987654321'
        WHEN 'Chang' THEN 'UHC456789012'
        WHEN 'Thompson' THEN 'KP789012345'
        WHEN 'Johnson' THEN 'AET234567890'
    END,
    CASE p.last_name
        WHEN 'Smith' THEN 'GRP001'
        WHEN 'Martinez' THEN 'EMP456'
        WHEN 'Chang' THEN 'STU789'
        WHEN 'Thompson' THEN 'FAM012'
        WHEN 'Johnson' THEN 'COR345'
    END,
    CASE p.last_name
        WHEN 'Thompson' THEN 'David Thompson'
        ELSE p.first_name || ' ' || p.last_name
    END,
    CASE p.last_name
        WHEN 'Thompson' THEN 'Father'
        ELSE 'Self'
    END,
    CASE p.last_name
        WHEN 'Smith' THEN '2020-01-01'::date
        WHEN 'Martinez' THEN '2021-06-01'::date
        WHEN 'Chang' THEN '2023-01-01'::date
        WHEN 'Thompson' THEN '2015-10-01'::date
        WHEN 'Johnson' THEN '2019-03-15'::date
    END
FROM patients p
JOIN insurance_providers ip ON 
    (p.last_name = 'Smith' AND ip.provider_name = 'Medicare') OR
    (p.last_name = 'Martinez' AND ip.provider_name = 'Blue Cross Blue Shield') OR
    (p.last_name = 'Chang' AND ip.provider_name = 'United Healthcare') OR
    (p.last_name = 'Thompson' AND ip.provider_name = 'Kaiser Permanente') OR
    (p.last_name = 'Johnson' AND ip.provider_name = 'Aetna');

-- Insert Medical History
INSERT INTO medical_history (patient_id, condition_name, icd10_code, onset_date, is_chronic)
SELECT patient_id, condition_name, icd10_code, onset_date, is_chronic FROM (
    SELECT p.patient_id, 
        CASE 
            WHEN p.last_name = 'Smith' THEN 'Type 2 Diabetes Mellitus'
            WHEN p.last_name = 'Martinez' THEN 'Type 2 Diabetes Mellitus'
        END as condition_name,
        'E11.9' as icd10_code,
        CASE 
            WHEN p.last_name = 'Smith' THEN '2010-06-15'::date
            WHEN p.last_name = 'Martinez' THEN '2018-11-30'::date
        END as onset_date,
        true as is_chronic
    FROM patients p WHERE p.last_name IN ('Smith', 'Martinez')
    
    UNION ALL
    
    SELECT p.patient_id, 'Essential Hypertension', 'I10', '2008-03-22'::date, true
    FROM patients p WHERE p.last_name = 'Smith'
    
    UNION ALL
    
    SELECT p.patient_id, 'Hyperlipidemia', 'E78.5', '2012-09-10'::date, true
    FROM patients p WHERE p.last_name = 'Smith'
    
    UNION ALL
    
    SELECT p.patient_id, 'Obesity', 'E66.9', '2015-01-15'::date, true
    FROM patients p WHERE p.last_name = 'Martinez'
    
    UNION ALL
    
    SELECT p.patient_id, 'Asthma', 'J45.909', '2005-04-20'::date, true
    FROM patients p WHERE p.last_name = 'Chang'
    
    UNION ALL
    
    SELECT p.patient_id, 'Atopic Dermatitis', 'L20.9', '2016-02-10'::date, true
    FROM patients p WHERE p.last_name = 'Thompson'
    
    UNION ALL
    
    SELECT p.patient_id, 'Pregnancy', 'Z33.1', '2024-03-01'::date, false
    FROM patients p WHERE p.last_name = 'Johnson'
) AS medical_conditions;

-- Insert Allergies
INSERT INTO allergies (patient_id, allergen_type, allergen_name, reaction_description, severity, onset_date)
SELECT patient_id, allergen_type, allergen_name, reaction_description, severity, onset_date FROM (
    SELECT p.patient_id, 'medication' as allergen_type, 'Penicillin' as allergen_name, 
           'Rash and hives' as reaction_description, 'moderate' as severity, '1995-05-10'::date as onset_date
    FROM patients p WHERE p.last_name = 'Smith'
    
    UNION ALL
    
    SELECT p.patient_id, 'environmental', 'Pollen', 'Wheezing and shortness of breath', 'moderate', '2005-03-15'::date
    FROM patients p WHERE p.last_name = 'Chang'
    
    UNION ALL
    
    SELECT p.patient_id, 'environmental', 'Dust mites', 'Asthma exacerbation', 'severe', '2005-03-15'::date
    FROM patients p WHERE p.last_name = 'Chang'
    
    UNION ALL
    
    SELECT p.patient_id, 'food', 'Peanuts', 'Anaphylaxis', 'life-threatening', '2017-06-20'::date
    FROM patients p WHERE p.last_name = 'Thompson'
    
    UNION ALL
    
    SELECT p.patient_id, 'food', 'Eggs', 'Hives and itching', 'moderate', '2016-11-05'::date
    FROM patients p WHERE p.last_name = 'Thompson'
) AS allergy_data;

-- Create some sample appointments
WITH appointment_data AS (
    SELECT 
        uuid_generate_v4() as appointment_id,
        p.patient_id,
        pr.provider_id,
        d.department_id,
        CURRENT_DATE - INTERVAL '15 days' + (ROW_NUMBER() OVER (ORDER BY p.last_name) - 1) * INTERVAL '1 day' as appointment_date,
        '09:00:00'::time + ((ROW_NUMBER() OVER (ORDER BY p.last_name) - 1) * INTERVAL '90 minutes') as appointment_time,
        CASE p.last_name
            WHEN 'Smith' THEN 'Follow-up'
            WHEN 'Martinez' THEN 'Routine'
            WHEN 'Chang' THEN 'Consultation'
            WHEN 'Thompson' THEN 'Routine'
            WHEN 'Johnson' THEN 'Prenatal'
        END as appointment_type,
        'completed' as status,
        CASE p.last_name
            WHEN 'Smith' THEN 'Diabetes management follow-up'
            WHEN 'Martinez' THEN 'Annual physical exam'
            WHEN 'Chang' THEN 'Chest pain evaluation'
            WHEN 'Thompson' THEN 'Well-child visit'
            WHEN 'Johnson' THEN 'Prenatal care visit'
        END as reason_for_visit
    FROM patients p
    CROSS JOIN LATERAL (
        SELECT provider_id FROM providers 
        WHERE (p.last_name IN ('Smith', 'Martinez', 'Johnson') AND last_name = 'Johnson') OR
              (p.last_name = 'Chang' AND last_name = 'Chen') OR
              (p.last_name = 'Thompson' AND last_name = 'Rodriguez')
        LIMIT 1
    ) pr
    CROSS JOIN LATERAL (
        SELECT department_id FROM departments
        WHERE (p.last_name IN ('Smith', 'Martinez', 'Johnson') AND department_name = 'Internal Medicine') OR
              (p.last_name = 'Chang' AND department_name = 'Cardiology') OR
              (p.last_name = 'Thompson' AND department_name = 'Pediatrics')
        LIMIT 1
    ) d
)
INSERT INTO appointments (appointment_id, patient_id, provider_id, department_id, appointment_date, appointment_time, appointment_type, status, reason_for_visit)
SELECT * FROM appointment_data;

-- Insert Vital Signs for each appointment
INSERT INTO vital_signs (patient_id, appointment_id, recorded_at, recorded_by, temperature_fahrenheit, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, respiratory_rate, oxygen_saturation, weight_pounds, height_inches, pain_scale)
SELECT 
    a.patient_id,
    a.appointment_id,
    a.appointment_date + a.appointment_time + INTERVAL '15 minutes',
    (SELECT provider_id FROM providers WHERE last_name = 'Anderson' LIMIT 1),
    98.0 + (RANDOM() * 1.2),
    CASE 
        WHEN p.last_name = 'Smith' THEN 145
        WHEN p.last_name = 'Martinez' THEN 138
        ELSE 115 + (RANDOM() * 15)::int
    END,
    CASE 
        WHEN p.last_name = 'Smith' THEN 92
        WHEN p.last_name = 'Martinez' THEN 88
        ELSE 70 + (RANDOM() * 10)::int
    END,
    70 + (RANDOM() * 20)::int,
    14 + (RANDOM() * 8)::int,
    96 + (RANDOM() * 3)::int,
    CASE 
        WHEN p.last_name = 'Smith' THEN 195.5
        WHEN p.last_name = 'Martinez' THEN 180.0
        WHEN p.last_name = 'Chang' THEN 165.0
        WHEN p.last_name = 'Thompson' THEN 62.0
        WHEN p.last_name = 'Johnson' THEN 145.0
    END,
    CASE 
        WHEN p.last_name = 'Smith' THEN 70
        WHEN p.last_name = 'Martinez' THEN 65
        WHEN p.last_name = 'Chang' THEN 72
        WHEN p.last_name = 'Thompson' THEN 48
        WHEN p.last_name = 'Johnson' THEN 66
    END,
    CASE 
        WHEN p.last_name = 'Smith' THEN 2
        WHEN p.last_name = 'Chang' THEN 4
        ELSE 0
    END
FROM appointments a
JOIN patients p ON a.patient_id = p.patient_id;

-- Add sample diagnoses
INSERT INTO diagnoses (patient_id, provider_id, appointment_id, icd10_code, diagnosis_description, diagnosis_date, severity, status)
SELECT 
    a.patient_id,
    a.provider_id,
    a.appointment_id,
    CASE p.last_name
        WHEN 'Smith' THEN 'E11.65'
        WHEN 'Martinez' THEN 'E11.9'
        WHEN 'Chang' THEN 'R07.9'
        WHEN 'Thompson' THEN 'L20.9'
        WHEN 'Johnson' THEN 'Z34.01'
    END,
    CASE p.last_name
        WHEN 'Smith' THEN 'Type 2 diabetes mellitus with hyperglycemia'
        WHEN 'Martinez' THEN 'Type 2 diabetes mellitus without complications'
        WHEN 'Chang' THEN 'Chest pain, unspecified'
        WHEN 'Thompson' THEN 'Atopic dermatitis, unspecified'
        WHEN 'Johnson' THEN 'Encounter for supervision of normal first pregnancy, first trimester'
    END,
    a.appointment_date,
    CASE p.last_name
        WHEN 'Smith' THEN 'moderate'
        WHEN 'Martinez' THEN 'mild'
        WHEN 'Chang' THEN 'mild'
        WHEN 'Thompson' THEN 'mild'
        WHEN 'Johnson' THEN 'normal'
    END,
    CASE p.last_name
        WHEN 'Chang' THEN 'resolved'
        ELSE 'active'
    END
FROM appointments a
JOIN patients p ON a.patient_id = p.patient_id;

-- Add sample prescriptions
INSERT INTO prescriptions (patient_id, provider_id, medication_id, appointment_id, dosage, frequency, route, quantity, refills, start_date, pharmacy_name, pharmacy_phone, status)
SELECT 
    a.patient_id,
    a.provider_id,
    m.medication_id,
    a.appointment_id,
    CASE 
        WHEN m.medication_name = 'Metformin' AND p.last_name = 'Smith' THEN '1000mg'
        WHEN m.medication_name = 'Metformin' THEN '500mg'
        WHEN m.medication_name = 'Lipitor' THEN '40mg'
        WHEN m.medication_name = 'Lisinopril' THEN '10mg'
        WHEN m.medication_name = 'Albuterol' THEN '90mcg'
        WHEN m.medication_name = 'Amoxicillin' THEN '250mg'
    END,
    CASE 
        WHEN m.medication_name = 'Metformin' THEN 'Twice daily'
        WHEN m.medication_name = 'Lipitor' THEN 'Once daily at bedtime'
        WHEN m.medication_name = 'Lisinopril' THEN 'Once daily'
        WHEN m.medication_name = 'Albuterol' THEN 'As needed for wheezing'
        WHEN m.medication_name = 'Amoxicillin' THEN 'Three times daily for 10 days'
    END,
    CASE 
        WHEN m.medication_name = 'Albuterol' THEN 'inhalation'
        ELSE 'oral'
    END,
    CASE 
        WHEN m.medication_name IN ('Metformin', 'Lipitor', 'Lisinopril') THEN 30
        WHEN m.medication_name = 'Albuterol' THEN 1
        WHEN m.medication_name = 'Amoxicillin' THEN 30
    END,
    CASE 
        WHEN m.medication_name IN ('Metformin', 'Lipitor', 'Lisinopril') THEN 5
        WHEN m.medication_name = 'Albuterol' THEN 2
        ELSE 0
    END,
    a.appointment_date,
    'CVS Pharmacy',
    '(555) 111-2222',
    'active'
FROM appointments a
JOIN patients p ON a.patient_id = p.patient_id
JOIN medications m ON 
    (p.last_name = 'Smith' AND m.medication_name IN ('Metformin', 'Lipitor', 'Lisinopril')) OR
    (p.last_name = 'Martinez' AND m.medication_name = 'Metformin') OR
    (p.last_name = 'Chang' AND m.medication_name = 'Albuterol') OR
    (p.last_name = 'Thompson' AND m.medication_name = 'Amoxicillin');

-- Add some lab results
INSERT INTO lab_results (patient_id, provider_id, test_id, appointment_id, order_date, collection_date, result_date, result_value, abnormal_flag, status)
SELECT 
    a.patient_id,
    a.provider_id,
    t.test_id,
    a.appointment_id,
    a.appointment_date,
    a.appointment_date,
    a.appointment_date + INTERVAL '1 day',
    CASE 
        WHEN t.test_name = 'Glucose' AND p.last_name IN ('Smith', 'Martinez') THEN 140 + (RANDOM() * 25)::numeric(10,2)
        WHEN t.test_name = 'Glucose' THEN 85 + (RANDOM() * 10)::numeric(10,2)
        WHEN t.test_name = 'Cholesterol Total' AND p.last_name = 'Smith' THEN 245
        WHEN t.test_name = 'Cholesterol Total' THEN 180 + (RANDOM() * 20)::numeric(10,2)
        WHEN t.test_name = 'Hemoglobin' THEN 13 + (RANDOM() * 2)::numeric(10,2)
        WHEN t.test_name = 'Creatinine' AND p.last_name = 'Smith' THEN 1.4
        WHEN t.test_name = 'Creatinine' THEN 0.8 + (RANDOM() * 0.3)::numeric(10,2)
    END,
    CASE 
        WHEN t.test_name = 'Glucose' AND p.last_name IN ('Smith', 'Martinez') THEN 'H'
        WHEN t.test_name = 'Cholesterol Total' AND p.last_name = 'Smith' THEN 'H'
        WHEN t.test_name = 'Creatinine' AND p.last_name = 'Smith' THEN 'H'
        ELSE 'N'
    END,
    'completed'
FROM appointments a
JOIN patients p ON a.patient_id = p.patient_id
JOIN lab_tests t ON 
    (p.last_name = 'Smith' AND t.test_name IN ('Glucose', 'Cholesterol Total', 'Creatinine')) OR
    (p.last_name = 'Martinez' AND t.test_name = 'Glucose') OR
    (p.last_name = 'Chang' AND t.test_name IN ('Hemoglobin', 'White Blood Cell Count'))
WHERE t.test_name != 'Complete Blood Count' AND t.test_name != 'TSH' AND t.test_name != 'Blood Pressure';

-- Add immunizations
INSERT INTO immunizations (patient_id, provider_id, vaccine_name, vaccine_code, administration_date, lot_number, manufacturer, site, dose_number)
SELECT patient_id, provider_id, vaccine_name, vaccine_code, administration_date, lot_number, manufacturer, site, dose_number FROM (
    SELECT 
        p.patient_id,
        (SELECT provider_id FROM providers WHERE last_name = 'Johnson' LIMIT 1) as provider_id,
        'Influenza, seasonal' as vaccine_name,
        '90658' as vaccine_code,
        '2023-10-15'::date as administration_date,
        'FL2023-1234' as lot_number,
        'Sanofi Pasteur' as manufacturer,
        'Left deltoid' as site,
        1 as dose_number
    FROM patients p WHERE p.last_name = 'Smith'
    
    UNION ALL
    
    SELECT 
        p.patient_id,
        (SELECT provider_id FROM providers WHERE last_name = 'Johnson' LIMIT 1),
        'Pneumococcal 23-valent',
        '90732',
        '2022-09-20'::date,
        'PN2022-5678',
        'Merck',
        'Right deltoid',
        1
    FROM patients p WHERE p.last_name = 'Smith'
    
    UNION ALL
    
    SELECT 
        p.patient_id,
        (SELECT provider_id FROM providers WHERE last_name = 'Rodriguez' LIMIT 1),
        'DTaP',
        '90700',
        CURRENT_DATE - INTERVAL '10 days',
        'DT2024-9012',
        'GSK',
        'Left thigh',
        5
    FROM patients p WHERE p.last_name = 'Thompson'
    
    UNION ALL
    
    SELECT 
        p.patient_id,
        (SELECT provider_id FROM providers WHERE last_name = 'Johnson' LIMIT 1),
        'Tdap',
        '90715',
        CURRENT_DATE - INTERVAL '5 days',
        'TD2024-7890',
        'Sanofi Pasteur',
        'Left deltoid',
        1
    FROM patients p WHERE p.last_name = 'Johnson'
) AS immunization_data;

-- Update timestamps
UPDATE patients SET updated_at = CURRENT_TIMESTAMP;
UPDATE patient_addresses SET updated_at = CURRENT_TIMESTAMP;
UPDATE patient_insurance SET updated_at = CURRENT_TIMESTAMP;
UPDATE providers SET updated_at = CURRENT_TIMESTAMP;
UPDATE appointments SET updated_at = CURRENT_TIMESTAMP;
UPDATE diagnoses SET updated_at = CURRENT_TIMESTAMP;
UPDATE prescriptions SET updated_at = CURRENT_TIMESTAMP;
UPDATE lab_results SET updated_at = CURRENT_TIMESTAMP;
UPDATE allergies SET updated_at = CURRENT_TIMESTAMP;
UPDATE medical_history SET updated_at = CURRENT_TIMESTAMP;