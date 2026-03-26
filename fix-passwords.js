// fix-passwords.js
// Run this ONCE to fix all passwords in the database

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixPasswords() {
    console.log('🔧 Connecting to database...\n');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    console.log('✅ Connected to database\n');

    // Hash the passwords
    console.log('🔐 Generating password hashes...\n');
    const adminHash = await bcrypt.hash('Admin@2025', 12);
    const studentHash = await bcrypt.hash('Student@2025', 12);

    console.log('Admin hash:  ', adminHash);
    console.log('Student hash:', studentHash);
    console.log('');

    // Update ALL admin passwords
    const [adminResult] = await connection.execute(
        'UPDATE admins SET password = ?',
        [adminHash]
    );
    console.log(`✅ Updated ${adminResult.affectedRows} admin passwords`);

    // Update ALL student passwords
    const [studentResult] = await connection.execute(
        'UPDATE students SET password = ?',
        [studentHash]
    );
    console.log(`✅ Updated ${studentResult.affectedRows} student passwords`);

    // Verify by trying to match
    console.log('\n🧪 Verifying passwords...\n');

    // Test admin
    const [admins] = await connection.execute(
        'SELECT username, password FROM admins LIMIT 1'
    );
    if (admins.length > 0) {
        const adminMatch = await bcrypt.compare('Admin@2025', admins[0].password);
        console.log(`Admin "${admins[0].username}" password match: ${adminMatch ? '✅ YES' : '❌ NO'}`);
    }

    // Test student
    const [students] = await connection.execute(
        'SELECT student_id, password FROM students LIMIT 1'
    );
    if (students.length > 0) {
        const studentMatch = await bcrypt.compare('Student@2025', students[0].password);
        console.log(`Student "${students[0].student_id}" password match: ${studentMatch ? '✅ YES' : '❌ NO'}`);
    }

    // Show all login credentials
    console.log('\n========================================');
    console.log('   ALL LOGIN CREDENTIALS');
    console.log('========================================\n');

    console.log('ADMIN LOGIN (http://localhost:3000/admin-login)');
    console.log('─────────────────────────────────────');
    const [allAdmins] = await connection.execute(
        'SELECT username, full_name, role FROM admins'
    );
    allAdmins.forEach(a => {
        console.log(`  Username: ${a.username}`);
        console.log(`  Password: Admin@2025`);
        console.log(`  Name:     ${a.full_name} (${a.role})`);
        console.log('');
    });

    console.log('STUDENT LOGIN (http://localhost:3000/login)');
    console.log('─────────────────────────────────────');
    const [allStudents] = await connection.execute(
        'SELECT student_id, first_name, last_name, program FROM students LIMIT 5'
    );
    allStudents.forEach(s => {
        console.log(`  Student ID: ${s.student_id}`);
        console.log(`  Password:   Student@2025`);
        console.log(`  Name:       ${s.first_name} ${s.last_name} - ${s.program}`);
        console.log('');
    });
    console.log('  ... and 25 more students (IDs: 10012006 to 10012030)');
    console.log('  All use password: Student@2025');

    console.log('\n✅ ALL DONE! You can now login.\n');

    await connection.end();
}

fixPasswords().catch(err => {
    console.error('❌ Error:', err.message);
    console.log('\n💡 Make sure:');
    console.log('   1. MySQL is running');
    console.log('   2. Your .env file has the correct DB_PASSWORD');
    console.log('   3. The database "upsa_complaints" exists');
    console.log('   4. Run: mysql -u root -p < database\\schema.sql  (to create the database first)');
    process.exit(1);
});