const fs = require('fs');

function replaceAlerts(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add import if not exists
    if (!content.includes("import toast from 'react-hot-toast';")) {
        content = content.replace('import { useState', "import toast from 'react-hot-toast';\nimport { useState");
    }
    
    // Replace all alerts with toast.error as baseline
    content = content.replace(/alert\(/g, 'toast.error(');
    
    // Fix specific successes in BuatTugas
    content = content.replace(/toast\.error\('Tugas berhasil diterbitkan!/g, "toast.success('Tugas berhasil diterbitkan!");
    
    // Fix specific successes in DetailTugas
    content = content.replace(/toast\.error\(res\.data\.message\)/g, "toast.success(res.data.message)");
    content = content.replace(/toast\.error\("Berhasil!/g, 'toast.success("Berhasil!');
    
    // Fix specific successes in Beranda
    content = content.replace(/toast\.error\('Berhasil!/g, "toast.success('Berhasil!");
    
    fs.writeFileSync(filePath, content);
    console.log(`Replaced alerts in ${filePath}`);
}

replaceAlerts('d:/kuliah/PROJEK SKRIPSI/proyek aplikasi skripsi/client/src/pages/DetailTugas.jsx');
replaceAlerts('d:/kuliah/PROJEK SKRIPSI/proyek aplikasi skripsi/client/src/pages/Beranda.jsx');
replaceAlerts('d:/kuliah/PROJEK SKRIPSI/proyek aplikasi skripsi/client/src/pages/AdminDashboard.jsx');
replaceAlerts('d:/kuliah/PROJEK SKRIPSI/proyek aplikasi skripsi/client/src/pages/Register.jsx');
replaceAlerts('d:/kuliah/PROJEK SKRIPSI/proyek aplikasi skripsi/client/src/pages/Profil.jsx');
