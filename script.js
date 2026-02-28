const SUPABASE_URL = "https://jrgiagkzsyhhseyedfqc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ2lhZ2t6c3loaHNleWVkZnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTQwNTYsImV4cCI6MjA4NzA5MDA1Nn0.v57gDJFOkWRUfwbmDkU0ekEktrNeUOWBK75udvY9nqg";

let workers = [];
let shifts = [];
let selectedDate = new Date().toISOString().split('T')[0];
let editingShiftId = null;
let currentReportText = "";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let elements = {};


function showAlert(message, type = 'info') {
    
    
    if (elements.alertBox) {
        elements.alertBox.textContent = message;
        elements.alertBox.className = `alert alert-${type}`;
        elements.alertBox.style.display = 'block';
        
        setTimeout(() => {
            elements.alertBox.style.display = 'none';
        }, 3000);
    } else {
        alert(message);
    }
}

function resetWorkerForm() {
    if (!elements) return;
    
    elements.workerIdInput.value = '';
    elements.nameInput.value = '';
    elements.aliasInput.value = '';
    elements.cedulaInput.value = '';
    elements.cargoInput.value = '';
    elements.btnSaveWorker.textContent = '✅ Guardar Personal';
    if (elements.btnCancelEdit) {
        elements.btnCancelEdit.classList.add('hidden');
    }
}

function resetShiftForm() {
    document.querySelectorAll('.chip').forEach(chip => {
        chip.classList.remove('selected');
    });

    if (elements.ShiftIdInput) elements.ShiftIdInput.value = '';
    if (elements.locationInput) elements.locationInput.value = '';
    if (elements.statusInput) elements.statusInput.value = '';
    if (elements.startTimeInput) elements.startTimeInput.value = '';
    if (elements.endTimeInput) {
        elements.endTimeInput.value = '';
        elements.endTimeInput.disabled = false;
    }
    if (elements.chkTerminar) elements.chkTerminar.checked = false;
    if (elements.btnAddShift) {
        elements.btnAddShift.textContent = '✅ Guardar turno';
        elements.btnAddShift.classList.remove('btn-warning');
        elements.btnAddShift.classList.add('btn-primary');
    }
    
    editingShiftId = null;
}

function cancelEdit() {
    resetWorkerForm();
}

function timeToMinutes(t) {
    if (t === "Terminar") return null;
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}


function renderWorkers() {
    
    
    if (!elements || !elements.personalTableContainer) {
        console.error("❌ personalTableContainer no disponible");
        return;
    }

    const term = elements.searchInput?.value.toLowerCase() || '';
    const filterValue = elements.statusFilter?.value || 'all';

    const filtered = workers.filter(w =>
        (w.name || "").toLowerCase().includes(term) ||
        (w.cargo || "").toLowerCase().includes(term) ||
        (w.cedula || "").includes(term)
    );

    if (filtered.length === 0) {
        elements.personalTableContainer.innerHTML = 
            '<p style="text-align:center; color:#999;">No hay resultados.</p>';
        return;
    }

    const scheduledWorkers = new Set(
        shifts
            .filter(s => s.date?.split('T')[0] === selectedDate)
            .map(s => String(s.worker_id))
    );

    let filteredByStatus = filtered.filter(w => {
        const isScheduled = scheduledWorkers.has(String(w.id));
        if (filterValue === "scheduled") return isScheduled;
        if (filterValue === "pending") return !isScheduled;
        return true;
    });

    const total = filteredByStatus.length;
    const agendados = filteredByStatus.filter(w => 
        scheduledWorkers.has(String(w.id))
    ).length;

    let html = `
        <div class="workers-counter">
            ${agendados} / ${total} Agendados
        </div>
        <table class="personal-table">
            <thead>
                <tr>
                    <th>Apellido</th>
                    <th>Nombre</th>
                    <th>Cargo</th>
                    <th>Cédula</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    filteredByStatus.forEach(w => {
        const isScheduled = scheduledWorkers.has(String(w.id));
        html += `
            <tr>
                <td><span class="tag-alias">${w.alias}</span></td>
                <td>${w.name}</td>
                <td>${w.cargo || '-'}</td>
                <td>${w.cedula || '-'}</td>
                <td>
                    <span class="${isScheduled ? 'status-ok' : 'status-pending'}">
                        ${isScheduled ? 'Agendado' : 'Por agendar'}
                    </span>
                </td>
                <td>
                    <button onclick="window.appEditWorker('${w.id}')" 
                        style="border:none;background:none;cursor:pointer;">✏️</button>
                    <button onclick="window.appDeleteWorker('${w.id}')" 
                        style="border:none;background:none;cursor:pointer;color:red;">🗑️</button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    elements.personalTableContainer.innerHTML = html;
    
}

function renderSelector() {
    
    
    if (!elements || !elements.pseudonymSelector) return;
    
    elements.pseudonymSelector.innerHTML = '';
    
    if (workers.length === 0) {
        elements.pseudonymSelector.innerHTML = '<p class="empty-msg">No hay personal registrado.</p>';
        return;
    }

    const sorted = [...workers].sort((a, b) => a.alias.localeCompare(b.alias));

    sorted.forEach(w => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.dataset.id = w.id;
        chip.innerHTML = `<strong>${w.alias}</strong> <small>${w.name.split(' ')[0]}</small>`;
        elements.pseudonymSelector.appendChild(chip);
    });
    
    
}

function renderSchedule() {
    
    
    if (!elements || !elements.cronogramaContainer) {
        console.error("❌ cronogramaContainer no disponible");
        return;
    }


    const dayShifts = shifts.filter(s => {
        if (!s || !s.date) return false;
        const shiftDate = s.date.split('T')[0];
        return shiftDate === selectedDate;
    });
    
    

    elements.cronogramaContainer.innerHTML = '';

    if (dayShifts.length === 0) {
        elements.cronogramaContainer.innerHTML = 
            '<p style="text-align:center; color:#999; margin-top:20px;">No hay turnos para esta fecha.</p>';
        return;
    }

    const grouped = {};
    dayShifts.forEach(shift => {
        const key = `${shift.start_time}_${shift.end_time}_${shift.location}`;
        
        if (!grouped[key]) {
            grouped[key] = {
                start: shift.start_time,
                end: shift.end_time,
                location: shift.location,
                status: shift.status,
                workerIds: [],
                shiftsIds: []
            };
        }
        
        grouped[key].workerIds.push(shift.worker_id);
        grouped[key].shiftsIds.push(shift.id);
    });

    const groupedArray = Object.values(grouped);
    
    
    groupedArray.sort((a, b) => (a.start || "").localeCompare(b.start || ""));
    
    groupedArray.forEach(group => {
        const card = createShiftCard(group);
        if (card) {
            elements.cronogramaContainer.appendChild(card);
        }
    });

    
}

function createShiftCard(group) {
    try {
        const names = group.workerIds.map(id => {
            const w = workers.find(x => String(x.id) === String(id));
            return w ? `<b>${w.alias}</b>` : 'Unknown';
        });

        const card = document.createElement('div');
        card.className = 'shift-card';
        
        card.innerHTML = `
            <div class="shift-header">
                <span class="shift-title">${group.location || 'Sin ubicación'}</span>
                <span class="shift-time">
                    ${group.end === "Terminar"
                        ? `${group.start} - Terminar`
                        : `${group.start || '--:--'} - ${group.end || '--:--'}`}
                </span>
                <button class="btn-icon btn-edit"
                    data-workerids="${group.workerIds.join(",")}"
                    data-start="${group.start}"
                    data-end="${group.end}"
                    data-location="${group.location}"
                    data-ids="${group.shiftsIds.join(",")}">
                    ✏️
                </button>
                <button class="btn-icon text-danger"
                    onclick="deleteShift(
                    '${group.workerIds.join(",")}',
                    '${group.start}',
                    '${group.end}',
                    '${group.location}'
                    )">🗑️</button>
            </div>
            <div class="shift-people">👥 ${names.join(', ')}</div>
            <div style="margin-top:8px; font-size:0.85rem; color:#64748b;">
                Estado: <strong>${group.status || 'No especificado'}</strong> | Pers: ${group.workerIds.length}
            </div>
        `;

        return card;
    } catch (error) {
        console.error("Error creando tarjeta:", error);
        return null;
    }
}

function renderListado() {
    
    
    if (!elements || !elements.listadoPreview) {
        console.error('❌ Error: listadoPreview no existe');
        return;
    }

    const dayShifts = shifts.filter(s => {
        const shiftDate = s.date ? s.date.split('T')[0] : null;
        return shiftDate === selectedDate;
    });
    
    const personalProgramado = new Set(dayShifts.map(s => s.worker_id)).size;
    
    currentReportText = "";
    elements.listadoPreview.innerHTML = "";

    if (dayShifts.length === 0) {
        elements.listadoPreview.innerHTML = `<div class="no-data-message">
            <p>No hay datos programados para la fecha: ${selectedDate}</p>
        </div>`;
        return;
    }

    const grouped = {};
    
    dayShifts.forEach(shift => {
        const key = `${shift.start_time}|${shift.end_time}|${shift.location}`;
        
        if (!grouped[key]) {
            grouped[key] = {
                start: shift.start_time || "",
                end: shift.end_time || "",
                location: shift.location || "",
                workers: []
            };
        }

        const worker = workers.find(w => String(w.id) === String(shift.worker_id));
        if (worker) {
            grouped[key].workers.push(worker.alias);
        }
    });

    const groupedArray = Object.values(grouped).sort((a, b) => 
        (a.location || "").localeCompare(b.location || "")
    );

    let html = `
        <div class="report-header" style="margin-bottom: 20px;">
            <h2 class="titulo-listado" style="color: #000000; font-size: 1.5rem; text-align: center; margin-bottom: 5px;">
                CRONOGRAMA - ${selectedDate} | Total Personal: ${personalProgramado}
            </h2>
        </div>
        <table class="report-table" style="width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <thead>
                <tr style="background-color: #ffffff; color: black;">
                    <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">PERSONAL</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">HORARIO</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">UBICACIÓN</th>
                </tr>
            </thead>
            <tbody>
    `;

    let text = `CRONOGRAMA: ${selectedDate}\n`;
    text += `============================================================\n`;

    groupedArray.forEach(group => {
        const personalOrdenado = group.workers.length > 0 
            ? group.workers.sort().join(", ") 
            : "Sin personal asignado";
        
        const horario = group.end === "Terminar" 
            ? `${group.start} - Terminar`
            : `${group.start || '--:--'} - ${group.end || '--:--'}`;
        
        html += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; border: 1px solid #ddd; vertical-align: top;">
                    ${personalOrdenado}
                </td>
                <td style="padding: 10px; border: 1px solid #ddd; white-space: nowrap;">
                    ${horario}
                </td>
                <td style="padding: 10px; border: 1px solid #ddd;">
                    ${group.location || 'No especificada'}
                </td>
            </tr>
        `;
        
        text += `${personalOrdenado} | ${horario} | ${group.location || '-'}\n`;
    });

    html += `</tbody></table>`;

    elements.listadoPreview.innerHTML = html;
    window.currentListadoText = text;
    
    
}
async function loadAllShiftsFromDB() {
    
    try {
        let allShifts = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
            
            
            const { data, error } = await supabaseClient
                .from("shifts")
                .select("*")
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) throw error;

            if (data && data.length > 0) {
                allShifts = [...allShifts, ...data];
                
                
                if (data.length < pageSize) {
                    hasMore = false;
                } else {
                    page++;
                }
            } else {
                hasMore = false;
            }
        }

        shifts = allShifts;
        return shifts;
        
    } catch (error) {
        console.error("❌ Error cargando shifts:", error);
        showAlert("Error cargando turnos", "error");
        return [];
    }
}

async function loadWorkersFromDB() {
    
    try {
        const { data, error } = await supabaseClient
            .from("workers")
            .select("*")
            .order("alias", { ascending: true });

        if (error) throw error;
        
        workers = data || [];
        
        
        return workers;
    } catch (error) {
        console.error("❌ Error cargando workers:", error);
        showAlert("Error cargando personal", "error");
        return [];
    }
}

async function saveWorker() {
    const name = elements.nameInput.value.trim();
    const alias = elements.aliasInput.value.trim();
    const cedula = elements.cedulaInput.value.trim();
    const cargo = elements.cargoInput.value.trim();
    const id = elements.workerIdInput.value;

    if (!name || !alias) {
        showAlert('Nombre y Apellido son obligatorios', 'error');
        return;
    }

    try {
        if (id) {
            const { error } = await supabaseClient
                .from("workers")
                .update({ name, alias, cedula, cargo })
                .eq("id", id);

            if (error) throw error;
            showAlert("Trabajador actualizado", "success");
        } else {
            const { error } = await supabaseClient
                .from("workers")
                .insert([{ name, alias, cedula, cargo }]);

            if (error) throw error;
            showAlert("Trabajador creado", "success");
        }

        resetWorkerForm();
        await loadWorkersFromDB();
    } catch (error) {
        console.error("Error guardando worker:", error);
        showAlert("Error guardando trabajador", "error");
    }
}

async function handleAddShift() {
    
    
    try {
        const selectedChips = document.querySelectorAll('.chip.selected');
        const workerIds = Array.from(selectedChips).map(c => c.dataset.id);
        
        const start = elements.startTimeInput.value;
        let end = elements.endTimeInput.value;
        const location = elements.locationInput.value.trim();
        const status = elements.statusInput.value;
        const date = selectedDate;

        if (elements.chkTerminar && elements.chkTerminar.checked) {
            end = "Terminar";
        }


        if (workerIds.length === 0) {
            showAlert('Debe seleccionar al menos un trabajador.', 'error');
            return;
        }

        if (!location) {
            showAlert('La ubicación es obligatoria.', 'error');
            return;
        }

        
        const { data: existingShifts, error: fetchError } = await supabaseClient
            .from("shifts")
            .select("*")
            .eq("date", date);

        if (fetchError) throw fetchError;

        let shiftsToCheck = existingShifts || [];
        if (editingShiftId) {
            shiftsToCheck = existingShifts.filter(s => 
                !editingShiftId.shiftIds.includes(s.id)
            );
        }

        const conflicts = [];
        const startMin = timeToMinutes(start);
        const endMin = timeToMinutes(end);

        workerIds.forEach(wId => {
            const conflictShift = shiftsToCheck.find(s => {
                if (String(s.worker_id) !== String(wId)) return false;
                const sStart = timeToMinutes(s.start_time);
                const sEnd = timeToMinutes(s.end_time);
                if (sStart === null || sEnd === null || startMin === null || endMin === null) {
                    return false;
                }
                return startMin < sEnd && endMin > sStart;
            });

            if (conflictShift) {
                const w = workers.find(x => String(x.id) === String(wId));
                conflicts.push(`${w?.alias || 'Unknown'} (en ${conflictShift.location})`);
            }
        });

        if (conflicts.length > 0) {
            showAlert(`⛔ CRUCE DETECTADO: ${conflicts.join(', ')}`, 'error');
            return;
        }

        

        const inserts = workerIds.map(wId => ({
            date: date,
            worker_id: wId,
            start_time: start || null,
            end_time: end || null,
            location: location,
            status: status || 'Programado'
        }));

        if (editingShiftId) {
            
            const { error: deleteError } = await supabaseClient
                .from("shifts")
                .delete()
                .in("id", editingShiftId.shiftIds);

            if (deleteError) throw deleteError;
        }
        
        const { error: insertError } = await supabaseClient
            .from("shifts")
            .insert(inserts);

        if (insertError) throw insertError;

        showAlert(
            editingShiftId ? '✅ Grupo actualizado correctamente' : '✅ Grupo programado exitosamente',
            'success'
        );

        await loadAllShiftsFromDB();
        resetShiftForm();
        renderSchedule();
        renderWorkers();

    } catch (error) {
        console.error("❌ Error en handleAddShift:", error);
        showAlert("Error inesperado al guardar el turno", "error");
    }
}

function handleTabClick(e) {
    const tab = e.currentTarget;
    elements.tabs.forEach(t => t.classList.remove('active'));
    elements.tabContents.forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    
    const tabId = `${tab.dataset.tab}-tab`;
    document.getElementById(tabId)?.classList.add('active');

    if (tab.dataset.tab === 'cronograma') {
        renderSchedule();
    }
    if (tab.dataset.tab === 'listado') {
        renderListado();
    }
}

function handleDateChange(e) {
    selectedDate = e.target.value;
    renderSchedule();
    renderWorkers();
    renderListado();
}

function handleTerminarCheck(e) {
    if (e.target.checked) {
        elements.endTimeInput.value = '';
        elements.endTimeInput.disabled = true;
    } else {
        elements.endTimeInput.disabled = false;
    }
}

function handleChipClick(e) {
    const chip = e.target.closest('.chip');
    if (chip) {
        chip.classList.toggle('selected');
    }
}

function handleEditButtonClick(e) {
    const editBtn = e.target.closest('.btn-edit');
    if (editBtn) {
        const shiftIds = editBtn.dataset.ids.split(',').map(id => parseInt(id));
        const workerIds = editBtn.dataset.workerids;
        const start = editBtn.dataset.start;
        const end = editBtn.dataset.end;
        const location = editBtn.dataset.location;
        
        editShift(shiftIds, workerIds, start, end, location);
    }
}

async function handleCopyListado() {
    const textToCopy = window.currentListadoText || elements.listadoPreview?.innerText;
    try {
        await navigator.clipboard.writeText(textToCopy);
        showAlert('📋 Listado copiado al portapapeles', 'success');
    } catch (err) {
        showAlert('Error al copiar', 'error');
    }
}

async function handleDownloadJpg() {
    if (!elements.exportArea) return;
    
    try {
        showAlert('Generando imagen...', 'info');
        
        const canvas = await html2canvas(elements.exportArea, {
            scale: 4,
            backgroundColor: "#ffffff"
        });
        
        const link = document.createElement("a");
        link.download = `cronograma_${selectedDate}.jpg`;
        link.href = canvas.toDataURL("image/jpeg", 1.0);
        link.click();
        
        showAlert('✅ Imagen descargada', 'success');
    } catch (error) {
        console.error("Error generando JPG:", error);
        showAlert("Error al generar la imagen", "error");
    }
}

async function handleExport() {
    
    
    try {
        const { data: allWorkers } = await supabaseClient.from("workers").select("*");
        const { data: allShifts } = await supabaseClient.from("shifts").select("*");
        
        const shiftsByDate = {};
        allShifts.forEach(shift => {
            const date = shift.date.split('T')[0];
            if (!shiftsByDate[date]) {
                shiftsByDate[date] = [];
            }
            
            const existingGroup = shiftsByDate[date].find(g => 
                g.start === shift.start_time && 
                g.end === shift.end_time && 
                g.location === shift.location
            );
            
            if (existingGroup) {
                if (!existingGroup.workerIds.includes(shift.worker_id)) {
                    existingGroup.workerIds.push(shift.worker_id);
                }
            } else {
                shiftsByDate[date].push({
                    start: shift.start_time,
                    end: shift.end_time,
                    location: shift.location,
                    workerIds: [shift.worker_id],
                    status: shift.status
                });
            }
        });
        
        const exportData = {
            workers: allWorkers,
            shiftsByDate: shiftsByDate,
            exportDate: new Date().toISOString(),
            version: "1.0"
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_personal_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        showAlert('✅ Datos exportados correctamente', 'success');
        
    } catch (error) {
        console.error("Error en exportación:", error);
        showAlert("Error al exportar datos", "error");
    }
}

async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.workers || !data.shiftsByDate) {
            showAlert("El archivo JSON debe contener 'workers' y 'shiftsByDate'", "error");
            return;
        }

        if (!confirm("⚠️ Esto reemplazará TODOS los datos actuales. ¿Continuar?")) {
            event.target.value = '';
            return;
        }

        showAlert('Importando datos...', 'info');

        await supabaseClient.from('shifts').delete().neq('id', 0);
        await supabaseClient.from('workers').delete().neq('id', 0);

        const workersToInsert = data.workers.map(w => {
            const { id, ...rest } = w;
            return rest;
        });

        const { data: insertedWorkers, error: workersError } = await supabaseClient
            .from('workers')
            .insert(workersToInsert)
            .select();

        if (workersError) throw workersError;

        const aliasToId = {};
        insertedWorkers.forEach(w => {
            aliasToId[w.alias] = w.id;
        });

        const flatShifts = [];
        
        for (const date in data.shiftsByDate) {
            const shiftsOnDate = data.shiftsByDate[date];
            
            for (const group of shiftsOnDate) {
                if (!group.workerIds || !Array.isArray(group.workerIds)) continue;

                for (const oldId of group.workerIds) {
                    const worker = data.workers.find(w => w.id === oldId);
                    if (!worker) continue;
                    
                    const newWorkerId = aliasToId[worker.alias];
                    if (!newWorkerId) continue;
                    
                    flatShifts.push({
                        worker_id: newWorkerId,
                        date: date,
                        start_time: group.start,
                        end_time: group.end,
                        location: group.location,
                        status: group.status || 'Programado'
                    });
                }
            }
        }

        if (flatShifts.length > 0) {
            const { error: shiftsError } = await supabaseClient
                .from('shifts')
                .insert(flatShifts);

            if (shiftsError) throw shiftsError;
        }

        await loadWorkersFromDB();
        await loadAllShiftsFromDB();
        
        showAlert(`✅ Importación completa: ${insertedWorkers.length} workers y ${flatShifts.length} shifts`, 'success');

    } catch (error) {
        console.error("Error en importación:", error);
        showAlert("Error al importar datos: " + error.message, "error");
    } finally {
        event.target.value = '';
    }
}



function appEditWorker(id) {
    const w = workers.find(w => String(w.id) === String(id));
    if (!w) return;

    elements.workerIdInput.value = w.id;
    elements.nameInput.value = w.name;
    elements.aliasInput.value = w.alias;
    elements.cedulaInput.value = w.cedula || '';
    elements.cargoInput.value = w.cargo || '';

    elements.btnSaveWorker.textContent = '💾 Actualizar Personal';
    elements.btnCancelEdit.classList.remove('hidden');
}

async function deleteWorker(id) {
    if (!confirm('¿Eliminar trabajador?')) return;

    try {
        const { error } = await supabaseClient
            .from("workers")
            .delete()
            .eq("id", id);

        if (error) throw error;

        await loadWorkersFromDB();
        showAlert("Trabajador eliminado", "success");
    } catch (error) {
        console.error("Error eliminando worker:", error);
        showAlert("Error eliminando trabajador", "error");
    }
}

async function deleteShift(workerIds, start, end, location) {
    if (!confirm("¿Seguro que deseas eliminar este grupo?")) return;

    const idsArray = workerIds.split(",");

    try {
        for (const workerId of idsArray) {
            const { error } = await supabaseClient
                .from("shifts")
                .delete()
                .eq("worker_id", workerId)
                .eq("date", selectedDate)
                .eq("start_time", start)
                .eq("end_time", end)
                .eq("location", location);

            if (error) throw error;
        }
        
        await loadAllShiftsFromDB();
        renderSchedule();
        renderWorkers();
        showAlert("✅ Grupo eliminado correctamente", "success");
        
    } catch (error) {
        console.error("Error eliminando shift:", error);
        showAlert("Error al eliminar el grupo", "error");
    }
}

function editShift(shiftIds, workerIds, start, end, location) {

    if (!workerIds || !shiftIds?.length) return;

    const idsArray = workerIds.split(",");

    document.querySelectorAll('.chip').forEach(chip => {
        chip.classList.toggle('selected', idsArray.includes(chip.dataset.id));
    });

    elements.startTimeInput.value = start;
    
    if (end === "Terminar") {
        elements.endTimeInput.value = '';
        elements.chkTerminar.checked = true;
        elements.endTimeInput.disabled = true;
    } else {
        elements.endTimeInput.value = end;
        elements.chkTerminar.checked = false;
        elements.endTimeInput.disabled = false;
    }
    
    elements.locationInput.value = location;

    editingShiftId = {
        shiftIds: shiftIds,
        workerIds: idsArray
    };

    elements.btnAddShift.textContent = "✏️ Guardar Grupo";
    elements.btnAddShift.classList.remove("btn-primary");
    elements.btnAddShift.classList.add("btn-warning");
}



function getDOMElements() {
    return {
        tabs: document.querySelectorAll('.tab'),
        tabContents: document.querySelectorAll('.tab-content'),
        workerIdInput: document.getElementById('worker-id'),
        nameInput: document.getElementById('nombre'),
        aliasInput: document.getElementById('pseudonimo'),
        cedulaInput: document.getElementById('cedula'),
        cargoInput: document.getElementById('cargo'),
        btnSaveWorker: document.getElementById('btn-save-worker'),
        btnCancelEdit: document.getElementById('btn-cancel-edit'),
        searchInput: document.getElementById('search-personal'),
        statusFilter: document.getElementById('statusFilter'),
        personalTableContainer: document.getElementById('personal-table-container'),
        ShiftIdInput: document.getElementById('shift-id'),
        dateInput: document.getElementById('fecha-cronograma'),
        pseudonymSelector: document.getElementById('pseudonym-selector'),
        startTimeInput: document.getElementById('hora-inicio'),
        endTimeInput: document.getElementById('hora-fin'),
        chkTerminar: document.getElementById('chk-Terminar'),
        locationInput: document.getElementById('lugar'),
        statusInput: document.getElementById('estado-turno'),
        btnAddShift: document.getElementById('btn-add-shift'),
        cronogramaContainer: document.getElementById('cronograma-container'),
        alertBox: document.getElementById('alert-box'),
        listadoPreview: document.getElementById('listado-preview'),
        btnCopy: document.getElementById('btn-copy'),
        btnDownloadJpg: document.getElementById('btn-download-jpg'),
        exportArea: document.getElementById('export-area'),
        btnExport: document.getElementById('btn-export'),
        importFile: document.getElementById('importFile')
    };
}

function setupEventListeners() {
    
    if (elements.tabs) {
        elements.tabs.forEach(tab => {
            tab.addEventListener('click', handleTabClick);
        });
    }

    if (elements.btnSaveWorker) {
        elements.btnSaveWorker.addEventListener('click', saveWorker);
    }
    
    if (elements.btnCancelEdit) {
        elements.btnCancelEdit.addEventListener('click', cancelEdit);
    }
    
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', renderWorkers);
    }
    
    if (elements.statusFilter) {
        elements.statusFilter.addEventListener('change', renderWorkers);
    }

    if (elements.dateInput) {
        elements.dateInput.addEventListener('change', handleDateChange);
    }
    
    if (elements.btnAddShift) {
        elements.btnAddShift.addEventListener('click', handleAddShift);
    }
    
    if (elements.chkTerminar) {
        elements.chkTerminar.addEventListener('change', handleTerminarCheck);
    }

    if (elements.btnCopy) {
        elements.btnCopy.addEventListener('click', handleCopyListado);
    }
    
    if (elements.btnDownloadJpg && elements.exportArea) {
        elements.btnDownloadJpg.addEventListener('click', handleDownloadJpg);
    }

    if (elements.btnExport) {
        elements.btnExport.addEventListener('click', handleExport);
    }
    
    if (elements.importFile) {
        elements.importFile.addEventListener('change', handleImport);
    }

    document.addEventListener('click', handleChipClick);
    document.addEventListener('click', handleEditButtonClick);

    window.appEditWorker = appEditWorker;
    window.appDeleteWorker = deleteWorker;
    window.deleteShift = deleteShift;
    
}


async function initApp() {
    
    try {
        elements = getDOMElements();
        
        if (!elements.cronogramaContainer) {
            console.error("❌ Error: No se encontró cronograma-container");
            return;
        }

        if (elements.dateInput) {
            elements.dateInput.value = selectedDate;
        }

        await loadWorkersFromDB();
        await loadAllShiftsFromDB();

        renderWorkers();
        renderSelector();
        renderSchedule();

        setupEventListeners();

    } catch (error) {
        console.error("❌ Error en inicialización:", error);
        showAlert("Error al inicializar la aplicación", "error");
    }
}


console.log("🎯 Script cargado, esperando DOM...");
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

