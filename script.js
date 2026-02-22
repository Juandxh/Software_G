const SUPABASE_URL = "https://jrgiagkzsyhhseyedfqc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ2lhZ2t6c3loaHNleWVkZnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTQwNTYsImV4cCI6MjA4NzA5MDA1Nn0.v57gDJFOkWRUfwbmDkU0ekEktrNeUOWBK75udvY9nqg";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', async () => {


    loadWorkersFromDB();
    
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');


    // Base de Datos
    const workerIdInput = document.getElementById('worker-id');
    const nameInput = document.getElementById('nombre');
    const aliasInput = document.getElementById('pseudonimo');
    const cedulaInput = document.getElementById('cedula');
    const cargoInput = document.getElementById('cargo');
    const btnSaveWorker = document.getElementById('btn-save-worker');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    const searchInput = document.getElementById('search-personal');
    const statusFilter = document.getElementById('statusFilter');
    const personalTableContainer = document.getElementById('personal-table-container');

    // Cronograma
    const ShiftIdInput = document.getElementById('shift-id')
    const dateInput = document.getElementById('fecha-cronograma');
    const pseudonymSelector = document.getElementById('pseudonym-selector');
    const startTimeInput = document.getElementById('hora-inicio');
    const endTimeInput = document.getElementById('hora-fin');
    const chkTerminar = document.getElementById('chk-terminar');
    const locationInput = document.getElementById('lugar');
    const statusInput = document.getElementById('estado-turno');
    const btnAddShift = document.getElementById('btn-add-shift');
    const activityInput = document.getElementById('activity');
    const cronogramaContainer = document.getElementById('cronograma-container');
    const alertBox = document.getElementById('alert-box');

    // Listado para compartir
    const listadoPreview = document.getElementById('listado-preview');
    const btnCopy = document.getElementById('btn-copy');
    const btnDownloadJpg = document.getElementById('btn-download-jpg');
    const exportArea = document.getElementById('export-area');


    
    let workers = [];
    let shifts = [];
    let currentReportText = "";
    

    
   
    let selectedDate = new Date().toISOString().split('T')[0];
    dateInput.value = selectedDate;

    
    let editingShiftId = null;

    await loadShiftsFromDB();
    console.log("SHIFTS CARGADOS:", shifts);
    renderWorkers();
    renderSelector();
    renderSchedule();
    

    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');

            
            if (tab.dataset.tab === 'cronograma') renderSchedule();
            if (tab.dataset.tab === 'listado') renderListado();
        });
    });

    
    btnSaveWorker.addEventListener('click', async () => {
    const id = workerIdInput.value; 
    const name = nameInput.value.trim();
    const alias = aliasInput.value.trim();
    const cedula = cedulaInput.value.trim();
    const cargo = cargoInput.value.trim();

    if (!name || !alias) {
        showAlert('Nombre y alias son obligatorios', 'error');
        return;
    }

    if (id) {
        
        const { error } = await supabaseClient
            .from('workers')
            .update({ name, alias, cedula, cargo })
            .eq('id', id);

        if (error) {
            console.error(error);
            showAlert('Error actualizando trabajador', 'error');
            return;
        }

        showAlert('Trabajador actualizado', 'success');
    } else {
        // Crear nuevo trabajador
        const { error } = await supabaseClient
            .from('workers')
            .insert([{ name, alias, cedula, cargo }]);

        if (error) {
            console.error(error);
            showAlert('Error creando trabajador', 'error');
            return;
        }

        showAlert('Trabajador agregado', 'success');
    }

    resetWorkerForm();
    await loadWorkersFromDB(); // recargar la tabla
});
    btnCancelEdit.addEventListener('click', cancelEdit);
    searchInput.addEventListener('input', renderWorkers);

    
    dateInput.addEventListener('change', (e) => {
        selectedDate = e.target.value;
        renderSchedule();
    });
    btnAddShift.addEventListener('click', addShift);

    
    btnCopy.addEventListener('click', () => {
        const textToCopy = window.currentListadoText || listadoPreview.innerText;
        navigator.clipboard.writeText(textToCopy)
            .then(() => alert('📋 Listado copiado al portapapeles'));
    });
    if (btnDownloadJpg && exportArea) {
    btnDownloadJpg.addEventListener('click', () => {

        html2canvas(exportArea, {
            scale: 4,
            backgroundColor: "#ffffff"
        }).then(canvas => {

            const link = document.createElement("a");
            const fecha = selectedDate;

            link.download = `cronograma_${fecha}.jpg`;
            link.href = canvas.toDataURL("image/jpeg", 1.0);
            link.click();
        });

    });
}

    async function saveWorker() {
    const name = nameInput.value.trim();

    const alias = aliasInput.value.trim();
    const cedula = cedulaInput.value.trim();
    const cargo = cargoInput.value.trim();
    const id = workerIdInput.value;

    if (!name || !alias) {
        alert('Nombre y Apellido son obligatorios');
        return;
    }



    if (id) {
        
        const { error } = await supabaseClient
            .from("workers")
            .update({ name, alias, cedula, cargo })
            .eq("id", id);

        if (error) {
            alert("Error actualizando trabajador");
            return;
        }

        alert("Trabajador actualizado");
    } else {
        
        const { error } = await supabaseClient
            .from("workers")
            .insert([{ name, alias, cedula, cargo }]);

        if (error) {
            alert("Error guardando trabajador");
            return;
        }

        alert("Trabajador creado");
    }

    resetWorkerForm();
    await loadWorkersFromDB();
}


   window.appEditWorker = function(id) {
    const w = workers.find(w => String(w.id) === String(id));
    if (!w) return;

    workerIdInput.value = w.id;
    nameInput.value = w.name;
    aliasInput.value = w.alias;
    cedulaInput.value = w.cedula || '';
    cargoInput.value = w.cargo || '';

    btnSaveWorker.textContent = '💾 Actualizar Personal';
    btnCancelEdit.classList.remove('hidden');

};

    async function deleteWorker(id) {
    if (!confirm('¿Eliminar trabajador?')) return;

    const { error } = await supabaseClient
        .from("workers")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Error eliminando trabajador");
        return;
    }

    await loadWorkersFromDB();
}


    function resetWorkerForm() {
        workerIdInput.value = '';
        nameInput.value = '';
        aliasInput.value = '';
        cedulaInput.value = '';
        cargoInput.value = '';
        btnSaveWorker.textContent = '✅ Guardar Personal';
        btnCancelEdit.classList.add('hidden');
    }

    function cancelEdit() {
        resetWorkerForm();
    }

    function getWorkerStatus(workerId) {

    const hasShift = shifts.some(s =>
        s.worker_id === workerId &&
        s.date === selectedDate
    );

    return hasShift ? "Agendado" : "Por agendar";
}


function renderWorkers() {

    const term = searchInput.value.toLowerCase();


        statusFilter.addEventListener('change', () => {
            renderWorkers();
        });

    const filtered = workers.filter(w =>
        (w.name || "").toLowerCase().includes(term) ||
        (w.cargo || "").toLowerCase().includes(term) ||
        (w.cedula || "").includes(term)
    );



    if (filtered.length === 0) {
        personalTableContainer.innerHTML =
            '<p style="text-align:center; color:#999;">No hay resultados.</p>';
        return;
    }



    
   const scheduledWorkers = new Set(
    shifts
        .filter(s => {
            const shiftDate = s.date?.split('T')[0]; 
            return shiftDate === selectedDate;
        })
        .map(s => String(s.worker_id))
);

    const filterValue = statusFilter.value;

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

    personalTableContainer.innerHTML = html;
}

async function loadWorkersFromDB() {
    const { data, error } = await supabaseClient
        .from("workers")
        .select("*")
        .order("alias", { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    workers = data;
    renderWorkers();   
    renderSelector();  
    renderSchedule();  
}



    

    function renderSelector() {
        pseudonymSelector.innerHTML = '';
        if (workers.length === 0) {
            pseudonymSelector.innerHTML = '<p class="empty-msg">No hay personal registrado.</p>';
            return;
        }

        
        const sorted = [...workers].sort((a, b) => a.alias.localeCompare(b.alias));

        sorted.forEach(w => {
            const chip = document.createElement('div');
            chip.className = 'chip';
            chip.dataset.id = w.id;
            chip.innerHTML = `<strong>${w.alias}</strong> <small>${w.name.split(' ')[0]}</small>`;

            chip.addEventListener('click', () => {
                chip.classList.toggle('selected');
            });

            pseudonymSelector.appendChild(chip);
        });
    }

    async function loadShiftsFromDB() {
    const { data, error } = await supabaseClient
        .from("shifts")
        .select("*");

    if (error) {
        console.error(error);
        return;
    }

    shifts = data || [];
}

    function resetShiftForm() {

        document.querySelectorAll('.chip').forEach(chip => {
        chip.classList.remove('selected');
    });

        ShiftIdInput.value = '';
        activityInput.value = '';
        locationInput.value = '';
        statusInput.value = '';
        selectedDate.value = '';
        btnSaveShift.textContent = '✅ Guardar turno';
        btnCancelEdit.classList.add('hidden');
    }
async function addShift() {
    const selectedChips = document.querySelectorAll('.chip.selected');
    const workerIds = Array.from(selectedChips).map(c => c.dataset.id);

    const start = startTimeInput.value;
    let end = endTimeInput.value;

    if (chkTerminar && chkTerminar.checked) {
        end = "TERMINAR";
    }

    const activity = activityInput.value.trim();
    const location = locationInput.value.trim();
    const status = statusInput.value;
    const date = selectedDate;

    if (workerIds.length === 0) {
        showAlert('Debe seleccionar al menos un trabajador.', 'error');
        return;
    }

    if (!location) {
        showAlert('La ubicación es obligatoria.', 'error');
        return;
    }

    // Función para convertir hora "HH:MM" a minutos desde medianoche
    function timeToMinutes(t) {
        if (t === "TERMINAR") return null;
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    }

    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);

    // Traer todos los turnos del mismo día
    const { data: existingShifts, error: fetchError } = await supabaseClient
        .from("shifts")
        .select("*")
        .eq("date", date);

    if (fetchError) {
        console.error(fetchError);
        showAlert("Error validando cruces", "error");
        return;
    }

    const isEditing = !!editingShiftId;

    let shiftsToCheck = existingShifts;

    if (isEditing) {
        shiftsToCheck = existingShifts.filter(s =>
            !editingShiftId.shiftIds.includes(s.id)
        );
    }

    const conflicts = [];

    workerIds.forEach(wId => {
        const conflictShift = shiftsToCheck.find(s => {
            if (String(s.worker_id) !== String(wId)) return false;

            const sStart = timeToMinutes(s.start_time);
            const sEnd = timeToMinutes(s.end_time);

            
            if (sStart === null || sEnd === null || startMin === null || endMin === null) {
                return true;
            }

            return startMin < sEnd && endMin > sStart;
        });

        if (conflictShift) {
            const w = workers.find(x => String(x.id) === String(wId));
            conflicts.push(`${w.alias} (en ${conflictShift.location})`);
        }
    });

    if (conflicts.length > 0) {
        showAlert(`CRUCE DETECTADO: ${conflicts.join(', ')}`, 'error');
        return;
    }

    const inserts = workerIds.map(wId => ({
        date: date,
        worker_id: wId,
        start_time: start,
        end_time: end,
        location: location,
        activity: activity,
        status: status
    }));

    if (isEditing) {
        const { error: deleteError } = await supabaseClient
            .from("shifts")
            .delete()
            .in("id", editingShiftId.shiftIds);

        if (deleteError) {
            console.error(deleteError);
            showAlert("Error eliminando turno anterior", "error");
            return;
        }

        editingShiftId = null;
    }

    const { error: insertError } = await supabaseClient
        .from("shifts")
        .insert(inserts);

    if (insertError) {
        console.error(insertError);
        if (insertError.code === "23505") { 
            showAlert("No se puede agendar: conflicto con turno existente.", "error");
        } else {
            showAlert("Error guardando turno", "error");
        }
        return;
    }

    showAlert(
        isEditing 
            ? 'Grupo actualizado correctamente'
            : 'Grupo programado exitosamente',
        'success'
    );

    await loadShiftsFromDB();
    resetShiftForm();
    renderSchedule();

    locationInput.value = '';
    selectedChips.forEach(c => c.classList.remove('selected'));
}




function editShift(workerIds, start, end, location, activity) {

    if (!workerIds) return;

    const idsArray = workerIds.split(",");

    
    document.querySelectorAll('.chip').forEach(chip => {
        chip.classList.toggle(
            'selected',
            idsArray.includes(chip.dataset.id)
        );
    });

    
    startTimeInput.value = start;
    endTimeInput.value = end === "TERMINAR" ? "" : end;
    locationInput.value = location;

    const activityField = document.getElementById("activity");
    if (activityField) activityField.value = activity || "";

    
    const shiftsToEdit = shifts.filter(s =>
        idsArray.includes(String(s.worker_id)) &&
        s.start_time === start &&
        s.end_time === end &&
        s.location === location &&
        (s.activity || "") === (activity || "")
    );

    
    editingShiftId = {
        shiftIds: shiftsToEdit.map(s => s.id),
        workerIds: idsArray
    };

    
    btnAddShift.textContent = "✏️ Guardar Grupo";
    btnAddShift.classList.remove("btn-primary");
    btnAddShift.classList.add("btn-warning");
}

   async function deleteShift(workerIds, start, end, location, activity) {

    if (!confirm("¿Seguro que deseas eliminar este grupo?")) return;

    const idsArray = workerIds.split(",");

    for (const workerId of idsArray) {
        await supabaseClient
            .from("shifts")
            .delete()
            .eq("worker_id", workerId)
            .eq("date", selectedDate)
            .eq("start_time", start)
            .eq("end_time", end)
            .eq("location", location)
            .eq("activity", activity); 
    }

    
    await loadShiftsFromDB();
    renderSchedule();
}



function renderSchedule() {

    cronogramaContainer.innerHTML = '';

    const dayShifts = shifts.filter(s =>
    s.date && s.date.startsWith(selectedDate));


    if (dayShifts.length === 0) {
        cronogramaContainer.innerHTML =
            '<p style="text-align:center; color:#999; margin-top:20px;">No hay turnos para esta fecha.</p>';
        return;
    }

    
    const grouped = {};

    dayShifts.forEach(shift => {
        const key = `${shift.activity}_${shift.start_time}_${shift.end_time}_${shift.location}`;

        if (!grouped[key]) {
            grouped[key] = {
                activity: shift.activity,
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

        const names = group.workerIds.map(id => {
            const w = workers.find(x => x.id === id);
            return w ? `<b>${w.alias}</b>` : 'Unknown';
        });

        const card = document.createElement('div');
        card.className = 'shift-card';

        card.innerHTML = `

            <div class="shift-header">
                <span class="shift-title">
                    ${group.activity || 'Sin actividad'} - ${group.location}
                </span>
                <span class="shift-time">
                    ${group.end === "TERMINAR"
                        ? `${group.start} - TERMINAR`
                        : `${group.start} - ${group.end}`}
                </span>
                <button class="btn-icon btn-edit"
                data-workerids="${group.workerIds.join(",")}"
                data-start="${group.start}"
                data-end="${group.end}"
                data-location="${group.location}"
                data-activity="${group.activity}"
                data-ids="${group.shiftsIds.join(",")}">
                ✏️</button>

                <button class="btn-icon text-danger"
                onclick="deleteShift(
                '${group.workerIds.join(",")}',
                '${group.start}',
                '${group.end}',
                '${group.location}',
                '${group.activity}'
                )">🗑️</button>

            </div>

            <div class="shift-people">
                👥 ${names.join(', ')}
            </div>

            <div style="margin-top:8px; font-size:0.85rem; color:#64748b;">
                Estado: <strong>${group.status}</strong> |
                Pers: ${group.workerIds.length}
            </div>


            

        `;

        cronogramaContainer.appendChild(card);
    });
}

    

    const btnExport = document.getElementById('btn-export');
    const btnImportTrigger = document.getElementById('btn-import-trigger');
    const fileImport = document.getElementById('file-import');

    if (btnExport) {
        btnExport.addEventListener('click', () => {
            const dataStr = JSON.stringify({
                workers: workers,
                shiftsByDate: shiftsByDate
            }, null, 2);

            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_personal_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url); 
        });
    }

    if (btnImportTrigger && fileImport) {
        btnImportTrigger.addEventListener('click', () => fileImport.click());

        fileImport.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data.workers && data.shiftsByDate) {
                        if (confirm('⚠️ Esto reemplazará TODOS los datos actuales con los del archivo. ¿Continuar con la carga?')) {
                            workers = data.workers;
                            shiftsByDate = data.shiftsByDate;

                            alert('✅ Datos cargados correctamente. La página se recargará.');
                            location.reload();
                        }
                    } else {
                        alert('❌ El archivo no tiene el formato correcto.');
                    }
                } catch (err) {
                    alert('❌ Error al leer el archivo JSON.');
                    console.error(err);
                }
            };
            reader.readAsText(file);
        });

        if (chkTerminar) {
    chkTerminar.checked = false;
}

    }





function renderListado() {

    const dayShifts = shifts.filter(s =>
        s.date && s.date.startsWith(selectedDate)
    );

    const personalProgramado = new Set(
        dayShifts.map(s => String(s.worker_id))
    ).size;

    currentReportText = "";
    listadoPreview.innerHTML = "";

    if (dayShifts.length === 0) {
        listadoPreview.innerHTML = "<p>No hay datos para esta fecha.</p>";
        return;
    }

    
    const grouped = {};

    dayShifts.forEach(shift => {

        const key = `${shift.start_time}|${shift.end_time}|${shift.location}|${shift.activity}`;

        if (!grouped[key]) {
            grouped[key] = {
                start: shift.start_time,
                end: shift.end_time,
                location: shift.location,
                activity: shift.activity,
                workers: []
            };
        }

        const w = workers.find(x => String(x.id) === String(shift.worker_id));
        if (w) {
            grouped[key].workers.push(w.alias);
        }
    });

    let groupedArray = Object.values(grouped);

    
    groupedArray.sort((a, b) => {

        const locCompare = a.location.localeCompare(b.location);
        if (locCompare !== 0) return locCompare;

        const actCompare = (a.activity || "").localeCompare(b.activity || "");
        if (actCompare !== 0) return actCompare;

        return a.start.localeCompare(b.start);
    });

    let htmlMap = `
        <div class="report-header">
            <h2 class="titulo-listado">
                CRONOGRAMA - ${selectedDate} | 
                Total Personal Programado: ${personalProgramado}
            </h2>
        </div>
        <table class="report-table">
            <thead>
                <tr>
                    <th>PERSONAL</th>
                    <th>HORARIO</th>
                    <th>UBICACIÓN</th>
                    <th>ACTIVIDAD</th>
                </tr>
            </thead>
            <tbody>
    `;

    currentReportText += `CRONOGRAMA: ${selectedDate}\n`;
    currentReportText += `============================================================\n`;

    groupedArray.forEach(group => {

        const personalOrdenado = group.workers.sort().join(", ");

        htmlMap += `
            <tr>
                <td>${personalOrdenado}</td>
                <td>${group.start} - ${group.end}</td>
                <td>${group.location}</td>
                <td>${group.activity || '-'}</td>
            </tr>
        `;

        currentReportText += `${personalOrdenado} | ${group.start}-${group.end} | ${group.location} | ${group.activity || '-'}\n`;
    });

    htmlMap += `</tbody></table>`;

    listadoPreview.innerHTML = htmlMap;
    window.currentListadoText = currentReportText;
}


    function showAlert(msg, type) {
        alertBox.textContent = msg;
        alertBox.className = `alert alert-${type}`;
        alertBox.classList.remove('hidden');
        setTimeout(() => alertBox.classList.add('hidden'), 5000);
    }

    document.addEventListener("click", function(e) {

    if (e.target.classList.contains("btn-edit")) {
        const btn = e.target;

        editShift(
            btn.dataset.workerids,
            btn.dataset.start,
            btn.dataset.end,
            btn.dataset.location,
            btn.dataset.activity,
            btn.dataset.id
        );
    }

    if (e.target.classList.contains("btn-delete")) {
        const btn = e.target;

        deleteShift(
            btn.dataset.workerids,
            btn.dataset.start,
            btn.dataset.end,
            btn.dataset.location,
            btn.dataset.activity
        );
    }

});

document.getElementById('importFile').addEventListener('change', async function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    for (const date in data.shiftsByDate) {
    const shiftsOnDate = data.shiftsByDate[date];
    if (!shiftsOnDate || !Array.isArray(shiftsOnDate)) continue; // 🔹 ignorar null o no-array

    shiftsOnDate.forEach(shift => {
        if (!shift.workerIds || !Array.isArray(shift.workerIds)) return; // 🔹 ignorar si no hay workerIds
        shift.workerIds.forEach(oldId => {
            const worker = data.workers.find(w => w.id === oldId);
            if (!worker) return;
            const newWorkerId = aliasToId[worker.alias];
            if (!newWorkerId) return;

            flatShifts.push({
                worker_id: newWorkerId,
                date: date,
                start_time: shift.start,
                end_time: shift.end,
                location: shift.location,
                activity: shift.activity || '',
                status: shift.status || 'Programado'
            });
        });
    });
}

    reader.onload = async function (e) {
        try {
            const data = JSON.parse(e.target.result);

            if (!data.workers || !data.shiftsByDate) {
                alert("El archivo JSON debe contener 'workers' y 'shiftsByDate'");
                return;
            }

            const confirmReplace = confirm("⚠️ Esto reemplazará todos los datos actuales. ¿Continuar?");
            if (!confirmReplace) return;

            // --- Limpiar la base ---
            await supabaseClient.from('shifts').delete().neq('id', 0);
            await supabaseClient.from('workers').delete().neq('id', 0);

            // --- Insertar workers sin IDs viejos ---
            const workersToInsert = data.workers.map(w => {
                const { id, ...rest } = w; // eliminamos id
                return rest;
            });

            const { data: insertedWorkers, error: workersError } = await supabaseClient
                .from('workers')
                .insert(workersToInsert);

            if (workersError) throw workersError;

            // --- Crear mapa alias → nuevo id generado ---
            const aliasToId = {};
            insertedWorkers.forEach(w => {
                aliasToId[w.alias] = w.id;
            });

            // --- Convertir shiftsByDate a array plano usando los nuevos IDs ---
            const flatShifts = [];

            for (const date in data.shiftsByDate) {
                const shiftsOnDate = data.shiftsByDate[date];
                shiftsOnDate.forEach(shift => {
                    shift.workerIds.forEach(oldId => {
                        // Encontrar el alias correspondiente al oldId
                        const worker = data.workers.find(w => w.id === oldId);
                        if (!worker) return; // omitir si no existe
                        const newWorkerId = aliasToId[worker.alias];
                        if (!newWorkerId) return; // omitir si algo falla

                        flatShifts.push({
                            worker_id: newWorkerId,
                            date: date,
                            start_time: shift.start,
                            end_time: shift.end,
                            location: shift.location,
                            activity: shift.activity || '',
                            status: shift.status || 'Programado'
                        });
                    });
                });
            }

            if (flatShifts.length === 0) {
                alert("No se encontraron shifts válidos para importar");
                return;
            }

            const { error: shiftsError } = await supabaseClient
                .from('shifts')
                .insert(flatShifts);

            if (shiftsError) throw shiftsError;

            alert(`✅ Importación completa: ${insertedWorkers.length} workers y ${flatShifts.length} shifts`);

            // --- Recargar datos ---
            await loadWorkersFromDB();
            await loadShiftsFromDB();
            renderSchedule();

        } catch (err) {
            console.error(err);
            alert("Error importando JSON: " + err.message);
        }
    };

    reader.readAsText(file);
});


    



    window.appDeleteWorker = deleteWorker;
    window.deleteShift = deleteShift;
    window.editShift = editShift;
});
