let records = JSON.parse(localStorage.getItem('gh_records_v2')) || [];
let employees = JSON.parse(localStorage.getItem('gh_employees_v2')) || [
    { name: 'Наргиза', dept: 'кухня' },
    { name: 'Мавлуда', dept: 'кухня' },
    { name: 'Сардор', dept: 'кухня' },
    { name: 'Мая', dept: 'кухня' },
    { name: 'Даниэл', dept: 'бар' },
    { name: 'Азиз', dept: 'бар' },
    { name: 'Карина', dept: 'бар' },
    { name: 'Стас', dept: 'бар' },
    { name: 'Артем', dept: 'бар' },
    { name: 'Таня В', dept: 'бар' }
];

document.getElementById('shiftDate').valueAsDate = new Date();
refreshAll();

function refreshAll() {
    updateEmployeeSelect();
    renderEmployeeList();
    updatePreview();
}

function updateEmployeeSelect() {
    const select = document.getElementById('empSelect');
    select.innerHTML = '<option value="">-- Нажмите для выбора --</option>';
    const sorted = [...employees].sort((a, b) => a.dept.localeCompare(b.dept) || a.name.localeCompare(b.name));
    
    sorted.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.name;
        opt.textContent = `${emp.name} [${emp.dept.toUpperCase()}]`;
        select.appendChild(opt);
    });
}

function renderEmployeeList() {
    const listDiv = document.getElementById('empList');
    if (employees.length === 0) {
        listDiv.innerHTML = '<div style="padding:15px; color:#aaa; text-align:center;">База пуста</div>';
        return;
    }
    const sorted = [...employees].sort((a, b) => a.dept.localeCompare(b.dept) || a.name.localeCompare(b.name));
    
    listDiv.innerHTML = sorted.map(emp => {
        const realIdx = employees.findIndex(e => e.name === emp.name);
        const badgeClass = emp.dept === 'кухня' ? 'kitchen' : 'bar';
        return `
            <div class="emp-row">
                <span><b>${emp.name}</b><span class="badge ${badgeClass}">${emp.dept}</span></span>
                <button class="btn-delete" onclick="deleteEmployee(${realIdx})">✕</button>
            </div>
        `;
    }).join('');
}

function addEmployee() {
    const input = document.getElementById('newEmpName');
    const name = input.value.trim();
    const deptRadio = document.querySelector('input[name="newEmpDept"]:checked');
    const dept = deptRadio ? deptRadio.value : 'кухня';

    if (!name) { alert('Введите имя сотрудника!'); return; }
    if (employees.some(e => e.name.toLowerCase() === name.toLowerCase())) { alert('Этот сотрудник уже есть!'); return; }

    employees.push({ name, dept });
    localStorage.setItem('gh_employees_v2', JSON.stringify(employees));
    input.value = '';
    refreshAll();
}

function deleteEmployee(idx) {
    if (idx > -1 && idx < employees.length) {
        if (confirm(`Удалить сотрудника ${employees[idx].name}?`)) {
            employees.splice(idx, 1);
            localStorage.setItem('gh_employees_v2', JSON.stringify(employees));
            refreshAll();
        }
    }
}

function addRecord() {
    const dateInput = document.getElementById('shiftDate').value;
    const name = document.getElementById('empSelect').value;
    const arrival = document.getElementById('arrTime').value;
    const departure = document.getElementById('depTime').value;

    if (!dateInput || !name || !arrival || !departure) {
        alert('Заполните дату, выберите сотрудника и укажите время!');
        return;
    }

    const dateObj = new Date(dateInput);
    const day = dateObj.getDate();
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();

    const [arrH, arrM] = arrival.split(':').map(Number);
    const [depH, depM] = departure.split(':').map(Number);

    let arrMinutes = arrH * 60 + arrM;
    let depMinutes = depH * 60 + depM;

    if (depMinutes < arrMinutes) { depMinutes += 24 * 60; }
    
    // Считаем чистые часы
    let rawHours = (depMinutes - arrMinutes) / 60;
    
    // Новая логика: Округление до 0.5 часа в меньшую сторону
    // Шаг: умножаем на 2, округляем вниз до целого, делим на 2
    let totalHours = Math.floor(rawHours * 2) / 2;

    const empData = employees.find(e => e.name === name);
    const dept = empData ? empData.dept : 'кухня';

    records.push({
        id: Date.now(),
        year, month, day,
        dateStr: dateInput.split('-').reverse().join('.'),
        name, dept, hours: totalHours, arrival, departure
    });

    localStorage.setItem('gh_records_v2', JSON.stringify(records));
    updatePreview();

    document.getElementById('arrTime').value = '';
    document.getElementById('depTime').value = '';
}

function deleteRecord(id) {
    records = records.filter(r => r.id !== id);
    localStorage.setItem('gh_records_v2', JSON.stringify(records));
    updatePreview();
}

function updatePreview() {
    const area = document.getElementById('previewArea');
    if (records.length === 0) {
        area.innerHTML = '<div style="padding:15px; color:#aaa; text-align:center;">Записей пока нет...</div>';
        return;
    }
    const sorted = [...records].reverse();
    area.innerHTML = sorted.map(r => `
        <div class="record-item dept-${r.dept}">
            <div>
                <small style="color:#666;">${r.dateStr}</small> <b>${r.name}</b>:<br>${r.arrival}-${r.departure} 
                <strong style="color:#ff416c;">(${r.hours} ч.)</strong>
            </div>
            <button class="btn-delete" onclick="deleteRecord(${r.id})">✕</button>
        </div>
    `).join('');
}

// ЭКСПОРТ С КРАСИВЫМ СТИЛИЗОВАННЫМ ДИЗАЙНОМ И ФОРМАТИРОВАНИЕМ
function exportToExcel() {
    if (records.length === 0) { alert('Нет данных для выгрузки!'); return; }

    const lastRecord = records[records.length - 1];
    const targetMonth = lastRecord.month;
    const targetYear = lastRecord.year;
    
    const monthNames = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
    const currentMonthLabel = `${monthNames[targetMonth - 1]} ${String(targetYear)}`;

    const filteredRecords = records.filter(r => r.month === targetMonth && r.year === targetYear);
    const uniqueEmpNames = [...new Set(filteredRecords.map(r => r.name))];
    const activeEmployees = employees.filter(e => uniqueEmpNames.includes(e.name));

    const depts = ['кухня', 'бар'];
    let matrix = [];

    // Главный заголовок файла
    matrix.push(["ТАБЕЛЬ УЧЕТА РАБОЧЕГО ВРЕМЕНИ — CRISPY PIZZA"]);
    matrix.push([`Период: ${currentMonthLabel.toUpperCase()}`]);
    matrix.push([]); // Пустая строка для отступа

    depts.forEach(dept => {
        const deptEmps = activeEmployees.filter(e => e.dept === dept).sort((a,b) => a.name.localeCompare(b.name));
        if (deptEmps.length === 0) return;

        // Строка заголовка группы
        let groupHeader = Array(35).fill("");
        groupHeader[0] = `ОТДЕЛ: ${dept.toUpperCase()}`;
        matrix.push(groupHeader);

        // Подзаголовки столбцов (Дни месяца)
        let subHeader = Array(35).fill("");
        subHeader[0] = "Сотрудник";
        subHeader[1] = "Должность";
        for (let i = 1; i <= 31; i++) { subHeader[i + 1] = i; }
        subHeader[33] = "ИТОГО ЧАСОВ";
        matrix.push(subHeader);

        // Строки сотрудников
        deptEmps.forEach(emp => {
            let row = Array(34).fill("");
            row[0] = emp.name;
            row[1] = dept === 'кухня' ? "Повар" : "Бармен";

            let totalSum = 0;
            for (let day = 1; day <= 31; day++) {
                const dayRecord = filteredRecords.find(r => r.name === emp.name && r.day === day);
                if (dayRecord) {
                    row[day + 1] = dayRecord.hours; // Сюда падает уже округленное число (например, 12 или 10.5)
                    totalSum += dayRecord.hours;
                } else {
                    row[day + 1] = "";
                }
            }
            row[33] = totalSum; // Финальная сумма
            matrix.push(row);
        });

        matrix.push(Array(34).fill("")); // Пустая строка-разделитель между отделами
    });

    // Генерация листа
    const worksheet = XLSX.utils.aoa_to_sheet(matrix);
    const workbook = XLSX.utils.book_new();
    
    // НАСТРОЙКА СТИЛЕЙ И ШИРИНЫ КОЛОНОК ЧЕРЕЗ СВОЙСТВА WORKSHEET
    // Автоподбор ширины первого столбца под имена
    worksheet['!cols'] = [
        { wch: 22 }, // Ширина столбца А (Имена)
        { wch: 12 }  // Ширина столбца B (Должность)
    ];
    for(let i=2; i<=32; i++) {
        worksheet['!cols'].push({ wch: 4.5 }); // Компактные ячейки для дат
    }
    worksheet['!cols'].push({ wch: 14 }); // Столбец Итого

    XLSX.utils.book_append_sheet(workbook, worksheet, "Табель Crispy");
    XLSX.writeFile(workbook, `Табель_Crispy_${targetMonth}_${targetYear}.xlsx`);
}
