// ==========================================
// БЛОК 1: ИНИЦИАЛИЗАЦИЯ ДАННЫХ И ХРАНИЛИЩА
// ==========================================

let records = JSON.parse(localStorage.getItem('gh_records_v2')) || [];
let employees = JSON.parse(localStorage.getItem('gh_employees_v2')) || [
    { name: 'Абдуначирова Наргиза', dept: 'кухня' },
    { name: 'Абдурахманов Сардор', dept: 'кухня' },
    { name: 'Мамасалиева Мая', dept: 'кухня' },
    { name: 'Янгибоев Джонни', dept: 'бар' },
    { name: 'Ведерникова Тоня', dept: 'бар' },
    { name: 'Калюжная Карина', dept: 'бар' },
    { name: 'Ефимов Стас', dept: 'бар' },
    { name: 'Фолингер Артем', dept: 'бар' },
    { name: 'Зимина Ада', dept: 'бар' }
    { name: 'Рем Маша', dept: 'бар' }
];

// ID редактируемой записи (null, если создаем новую)
let editingId = null;

document.getElementById('shiftDate').valueAsDate = new Date();
refreshAll();

function refreshAll() {
    updateEmployeeSelect();
    renderEmployeeList();
    updatePreview();
}

// ==========================================
// БЛОК 2: УПРАВЛЕНИЕ СПИСКОМ СОТРУДНИКОВ
// ==========================================

function updateEmployeeSelect() {
    const select = document.getElementById('empSelect');
    if (!select) return;
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
    if (!listDiv) return;
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
    const name = input ? input.value.trim() : '';
    const deptRadio = document.querySelector('input[name="newEmpDept"]:checked');
    const dept = deptRadio ? deptRadio.value : 'кухня';

    if (!name) { alert('Введите имя сотрудника!'); return; }
    if (employees.some(e => e.name.toLowerCase() === name.toLowerCase())) { alert('Этот сотрудник уже есть!'); return; }

    employees.push({ name, dept });
    localStorage.setItem('gh_employees_v2', JSON.stringify(employees));
    if (input) input.value = '';
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

// ==========================================
// БЛОК 3: УПРАВЛЕНИЕ СМЕНАМИ И ОКРУГЛЕНИЕ
// ==========================================

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
    
    let rawHours = (depMinutes - arrMinutes) / 60;
    
    // ОКРУГЛЕНИЕ ПО ПОЛЧАСА В МЕНЬШУЮ СТОРОНУ
    let totalHours = Math.floor(rawHours * 2) / 2;

    const empData = employees.find(e => e.name === name);
    const dept = empData ? empData.dept : 'кухня';

    if (editingId !== null) {
        // РЕЖИМ РЕДАКТИРОВАНИЯ: Находим старую запись и обновляем её поля
        const recordIndex = records.findIndex(r => r.id === editingId);
        if (recordIndex > -1) {
            records[recordIndex].year = year;
            records[recordIndex].month = month;
            records[recordIndex].day = day;
            records[recordIndex].dateStr = dateInput.split('-').reverse().join('.');
            records[recordIndex].name = name;
            records[recordIndex].dept = dept;
            records[recordIndex].hours = totalHours;
            records[recordIndex].arrival = arrival;
            records[recordIndex].departure = departure;
        }
        cancelEdit(); // Сбрасываем флаги и восстанавливаем интерфейс кнопки
    } else {
        // ОБЫЧНЫЙ РЕЖИМ: Создаем новую смену
        records.push({
            id: Date.now(),
            year, month, day,
            dateStr: dateInput.split('-').reverse().join('.'),
            name, dept, hours: totalHours, arrival, departure
        });
    }

    localStorage.setItem('gh_records_v2', JSON.stringify(records));
    updatePreview();

    document.getElementById('arrTime').value = '';
    document.getElementById('depTime').value = '';
}

// Запуск процесса изменения смены
function startEdit(id) {
    const record = records.find(r => r.id === id);
    if (!record) return;

    editingId = id;

    // Переводим дату из DD.MM.YYYY обратно в YYYY-MM-DD для инпута
    const parts = record.dateStr.split('.');
    if (parts.length === 3) {
        // Если сохранен год, используем его, иначе текущий сохраненный в объекте
        const y = record.year || parts[2];
        document.getElementById('shiftDate').value = `${y}-${parts[1]}-${parts[0]}`;
    }

    document.getElementById('empSelect').value = record.name;
    document.getElementById('arrTime').value = record.arrival;
    document.getElementById('depTime').value = record.departure;

    // Визуальное изменение заголовков и кнопок формы
    document.getElementById('formTitle').textContent = "Редактировать смену";
    document.getElementById('submitBtn').textContent = "Обновить смену";
    document.getElementById('submitBtn').className = "btn-success";
    document.getElementById('cancelEditBtn').style.display = "block";
    
    // Плавный скролл наверх к форме
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Отмена редактирования
function cancelEdit() {
    editingId = null;
    document.getElementById('formTitle').textContent = "Добавить смену";
    document.getElementById('submitBtn').textContent = "Сохранить смену";
    document.getElementById('submitBtn').className = "btn-primary";
    document.getElementById('cancelEditBtn').style.display = "none";
    document.getElementById('shiftDate').valueAsDate = new Date();
    document.getElementById('empSelect').value = "";
    document.getElementById('arrTime').value = "";
    document.getElementById('depTime').value = "";
}

function deleteRecord(id) {
    if (editingId === id) cancelEdit();
    records = records.filter(r => r.id !== id);
    localStorage.setItem('gh_records_v2', JSON.stringify(records));
    updatePreview();
}

function updatePreview() {
    const area = document.getElementById('previewArea');
    if (!area) return;
    if (records.length === 0) {
        area.innerHTML = '<div style="padding:15px; color:#aaa; text-align:center;">Записей пока нет...</div>';
        return;
    }
    const sorted = [...records].reverse();
    area.innerHTML = sorted.map(r => `
        <div class="record-item dept-${r.dept}">
            <div>
                <small style="color:#666;">${r.dateStr}</small> <b>${r.name}</b>:<br>${r.arrival} – ${r.departure} 
                <strong style="color:#107C41;">(${r.hours} ч.)</strong>
            </div>
            <div class="record-actions">
                <button class="btn-edit" onclick="startEdit(${r.id})">✏️</button>
                <button class="btn-delete" onclick="deleteRecord(${r.id})">✕</button>
            </div>
        </div>
    `).join('');
}

// ==========================================
// БЛОК 4: ЭКСПОРТ В EXCEL СО СТИЛЯМИ И СЕТКОЙ
// ==========================================

function exportToExcel() {
    if (records.length === 0) { alert('Нет данных для выгрузки!'); return; }

    const lastRecord = records[records.length - 1];
    const targetMonth = lastRecord.month;
    const targetYear = lastRecord.year;
    
    const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
    const currentMonthLabel = `${monthNames[targetMonth - 1]} ${String(targetYear)}`;

    const filteredRecords = records.filter(r => r.month === targetMonth && r.year === targetYear);
    const uniqueEmpNames = [...new Set(filteredRecords.map(r => r.name))];
    const activeEmployees = employees.filter(e => uniqueEmpNames.includes(e.name));

    const depts = ['кухня', 'бар'];
    const wb = XLSX.utils.book_new();
    let matrix = [];

    matrix.push([`ТАБЕЛЬ УЧЕТА РАБОЧЕГО ВРЕМЕНИ — CRISPY PIZZA (${currentMonthLabel.toUpperCase()})`]);
    matrix.push([]); 

    depts.forEach(dept => {
        const deptEmps = activeEmployees.filter(e => e.dept === dept).sort((a,b) => a.name.localeCompare(b.name));
        if (deptEmps.length === 0) return;

        let groupHeader = Array(35).fill("");
        groupHeader[0] = `ОТДЕЛ: ${dept.toUpperCase()}`;
        matrix.push(groupHeader);

        let subHeader = Array(35).fill("");
        subHeader[0] = "Сотрудник";
        subHeader[1] = "Должность";
        for (let i = 1; i <= 31; i++) { subHeader[i + 1] = i; }
        subHeader[33] = "ИТОГО";
        matrix.push(subHeader);

        deptEmps.forEach(emp => {
            let row = Array(34).fill("");
            row[0] = emp.name;
            row[1] = dept === 'кухня' ? "Повар" : "Бармен";

            let totalSum = 0;
            for (let day = 1; day <= 31; day++) {
                const dayRecord = filteredRecords.find(r => r.name === emp.name && r.day === day);
                if (dayRecord) {
                    row[day + 1] = dayRecord.hours; 
                    totalSum += dayRecord.hours;
                } else {
                    row[day + 1] = "";
                }
            }
            row[33] = totalSum; 
            matrix.push(row);
        });

        let totalRow = Array(34).fill("");
        totalRow[0] = "ИТОГО";
        let deptTotalHours = filteredRecords.filter(r => r.dept === dept).reduce((sum, r) => sum + r.hours, 0);
        totalRow[33] = deptTotalHours;
        matrix.push(totalRow);

        matrix.push(Array(34).fill("")); 
    });

    const worksheet = XLSX.utils.aoa_to_sheet(matrix);

    worksheet['!cols'] = [{ wch: 22 }, { wch: 12 }]; 
    for (let i = 1; i <= 31; i++) { worksheet['!cols'].push({ wch: 5.5 }); } 
    worksheet['!cols'].push({ wch: 12 }); 

    const cellBorder = {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
    };

    for (let cellRef in worksheet) {
        if (cellRef[0] === '!') continue;
        
        const cell = worksheet[cellRef];
        const rowIndex = parseInt(cellRef.replace(/[A-Z]/g, ''));
        
        if (rowIndex >= 3) {
            cell.s = {
                border: cellBorder,
                font: { name: "Arial", size: 10 },
                alignment: { vertical: "center", horizontal: "center" }
            };
        }

        if (cellRef.startsWith('A') && rowIndex >= 3) {
            cell.s.alignment.horizontal = "left"; 
        }

        if (matrix[rowIndex - 1] && (matrix[rowIndex - 1][0] === "Сотрудник" || matrix[rowIndex - 1][2] === 1)) {
            cell.s = {
                fill: { fgColor: { rgb: "107C41" } }, 
                font: { name: "Arial", size: 11, bold: true, color: { rgb: "FFFFFF" } }, 
                alignment: { vertical: "center", horizontal: "center" },
                border: cellBorder
            };
        }

        if (matrix[rowIndex - 1] && matrix[rowIndex - 1][0] === "ИТОГО") {
            cell.s.font = { name: "Arial", size: 10, bold: true };
            cell.s.fill = { fgColor: { rgb: "E1E1E1" } }; 
            cell.s.border = cellBorder;
        }
    }

    XLSX.utils.book_append_sheet(wb, worksheet, "Табель");
    XLSX.writeFile(wb, `Табель_Crispy_${targetMonth}_${targetYear}.xlsx`);
}
