-- Medical Records Database Schema
-- Creates a comprehensive medical records system with patient data, appointments, diagnoses, etc.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Patients table
CREATE TABLE patients (
    patient_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medical_record_number VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20),
    ssn VARCHAR(11),
    email VARCHAR(255),
    phone_primary VARCHAR(20),
    phone_secondary VARCHAR(20),
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    blood_type VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patient addresses
CREATE TABLE patient_addresses (
    address_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(patient_id) ON DELETE CASCADE,
    address_type VARCHAR(20) DEFAULT 'home', -- home, work, billing
    street_address_1 VARCHAR(255) NOT NULL,
    street_address_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(50) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) DEFAULT 'USA',
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insurance providers
CREATE TABLE insurance_providers (
    provider_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_name VARCHAR(255) NOT NULL,
    provider_type VARCHAR(50), -- HMO, PPO, Medicare, Medicaid
    phone VARCHAR(20),
    fax VARCHAR(20),
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patient insurance
CREATE TABLE patient_insurance (
    insurance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(patient_id) ON DELETE CASCADE,
    provider_id UUID REFERENCES insurance_providers(provider_id),
    policy_number VARCHAR(100) NOT NULL,
    group_number VARCHAR(100),
    subscriber_name VARCHAR(200),
    subscriber_relationship VARCHAR(50),
    effective_date DATE,
    expiration_date DATE,
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Healthcare providers (doctors, nurses, etc.)
CREATE TABLE providers (
    provider_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    npi_number VARCHAR(10) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    title VARCHAR(20), -- Dr., RN, PA, etc.
    specialty VARCHAR(100),
    license_number VARCHAR(50),
    license_state VARCHAR(2),
    phone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments/Clinics
CREATE TABLE departments (
    department_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_name VARCHAR(255) NOT NULL,
    department_type VARCHAR(100), -- Emergency, Cardiology, Pediatrics, etc.
    phone VARCHAR(20),
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointments
CREATE TABLE appointments (
    appointment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(patient_id) ON DELETE CASCADE,
    provider_id UUID REFERENCES providers(provider_id),
    department_id UUID REFERENCES departments(department_id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    appointment_type VARCHAR(100), -- Routine, Follow-up, Emergency, etc.
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, completed, cancelled, no-show
    reason_for_visit TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vital signs
CREATE TABLE vital_signs (
    vital_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(patient_id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(appointment_id),
    recorded_at TIMESTAMP NOT NULL,
    recorded_by UUID REFERENCES providers(provider_id),
    temperature_fahrenheit DECIMAL(5,2),
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    heart_rate INTEGER,
    respiratory_rate INTEGER,
    oxygen_saturation INTEGER,
    weight_pounds DECIMAL(6,2),
    height_inches DECIMAL(5,2),
    bmi DECIMAL(5,2),
    pain_scale INTEGER CHECK (pain_scale >= 0 AND pain_scale <= 10),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Diagnoses
CREATE TABLE diagnoses (
    diagnosis_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(patient_id) ON DELETE CASCADE,
    provider_id UUID REFERENCES providers(provider_id),
    appointment_id UUID REFERENCES appointments(appointment_id),
    icd10_code VARCHAR(10) NOT NULL,
    diagnosis_description TEXT NOT NULL,
    diagnosis_date DATE NOT NULL,
    severity VARCHAR(50), -- mild, moderate, severe, critical
    status VARCHAR(50) DEFAULT 'active', -- active, resolved, chronic
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medications
CREATE TABLE medications (
    medication_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medication_name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    medication_class VARCHAR(100),
    controlled_substance_schedule VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prescriptions
CREATE TABLE prescriptions (
    prescription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(patient_id) ON DELETE CASCADE,
    provider_id UUID REFERENCES providers(provider_id),
    medication_id UUID REFERENCES medications(medication_id),
    appointment_id UUID REFERENCES appointments(appointment_id),
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    route VARCHAR(50), -- oral, IV, topical, etc.
    quantity INTEGER,
    refills INTEGER DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE,
    pharmacy_name VARCHAR(255),
    pharmacy_phone VARCHAR(20),
    status VARCHAR(50) DEFAULT 'active', -- active, completed, discontinued
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lab tests
CREATE TABLE lab_tests (
    test_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_name VARCHAR(255) NOT NULL,
    test_code VARCHAR(50),
    test_category VARCHAR(100), -- Blood, Urine, Imaging, etc.
    normal_range_low DECIMAL(10,2),
    normal_range_high DECIMAL(10,2),
    unit_of_measure VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lab results
CREATE TABLE lab_results (
    result_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(patient_id) ON DELETE CASCADE,
    provider_id UUID REFERENCES providers(provider_id),
    test_id UUID REFERENCES lab_tests(test_id),
    appointment_id UUID REFERENCES appointments(appointment_id),
    order_date DATE NOT NULL,
    collection_date DATE,
    result_date DATE,
    result_value DECIMAL(10,2),
    result_text TEXT,
    abnormal_flag VARCHAR(10), -- H (high), L (low), N (normal)
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, cancelled
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Allergies
CREATE TABLE allergies (
    allergy_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(patient_id) ON DELETE CASCADE,
    allergen_type VARCHAR(50), -- medication, food, environmental
    allergen_name VARCHAR(255) NOT NULL,
    reaction_description TEXT,
    severity VARCHAR(50), -- mild, moderate, severe, life-threatening
    onset_date DATE,
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, resolved
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Immunizations
CREATE TABLE immunizations (
    immunization_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(patient_id) ON DELETE CASCADE,
    provider_id UUID REFERENCES providers(provider_id),
    vaccine_name VARCHAR(255) NOT NULL,
    vaccine_code VARCHAR(50),
    administration_date DATE NOT NULL,
    lot_number VARCHAR(50),
    manufacturer VARCHAR(255),
    site VARCHAR(100), -- left arm, right arm, etc.
    dose_number INTEGER,
    series_complete BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medical history
CREATE TABLE medical_history (
    history_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(patient_id) ON DELETE CASCADE,
    condition_name VARCHAR(255) NOT NULL,
    icd10_code VARCHAR(10),
    onset_date DATE,
    resolution_date DATE,
    is_chronic BOOLEAN DEFAULT false,
    family_history BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clinical notes
CREATE TABLE clinical_notes (
    note_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(patient_id) ON DELETE CASCADE,
    provider_id UUID REFERENCES providers(provider_id),
    appointment_id UUID REFERENCES appointments(appointment_id),
    note_type VARCHAR(50), -- Progress, Consultation, Discharge, etc.
    chief_complaint TEXT,
    history_of_present_illness TEXT,
    review_of_systems TEXT,
    physical_exam TEXT,
    assessment TEXT,
    plan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_patients_mrn ON patients(medical_record_number);
CREATE INDEX idx_patients_name ON patients(last_name, first_name);
CREATE INDEX idx_patients_dob ON patients(date_of_birth);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_provider ON appointments(provider_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_diagnoses_patient ON diagnoses(patient_id);
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_lab_results_patient ON lab_results(patient_id);
CREATE INDEX idx_vital_signs_patient ON vital_signs(patient_id);

-- Create views for common queries
CREATE VIEW patient_overview AS
SELECT 
    p.patient_id,
    p.medical_record_number,
    p.first_name,
    p.last_name,
    p.date_of_birth,
    p.gender,
    pa.street_address_1,
    pa.city,
    pa.state_province,
    pa.postal_code,
    COUNT(DISTINCT a.appointment_id) as total_appointments,
    COUNT(DISTINCT d.diagnosis_id) as total_diagnoses,
    COUNT(DISTINCT pr.prescription_id) as active_prescriptions
FROM patients p
LEFT JOIN patient_addresses pa ON p.patient_id = pa.patient_id AND pa.is_primary = true
LEFT JOIN appointments a ON p.patient_id = a.patient_id
LEFT JOIN diagnoses d ON p.patient_id = d.patient_id
LEFT JOIN prescriptions pr ON p.patient_id = pr.patient_id AND pr.status = 'active'
GROUP BY p.patient_id, p.medical_record_number, p.first_name, p.last_name, 
         p.date_of_birth, p.gender, pa.street_address_1, pa.city, 
         pa.state_province, pa.postal_code;