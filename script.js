let tasks = [];
const STORAGE_KEY = 'tasky_tasks';

// Referencias a elementos del DOM
const searchInput = document.getElementById('search-input');
const filterMateria = document.getElementById('filter-materia');
const filterPrioridad = document.getElementById('filter-prioridad');
const sortBy = document.getElementById('sort-by');
const sortDirectionBtn = document.getElementById('sort-direction-btn');
const modal = document.getElementById('task-modal');
const form = document.getElementById('task-form');
const taskIdInput = document.getElementById('task-id');
const modalTitle = document.getElementById('modal-title');
const addTaskBtn = document.getElementById('add-task-btn');
const closeBtn = document.querySelector('.close-btn');

// --- Persistencia ---
function loadTasks() {
    const data = localStorage.getItem(STORAGE_KEY);
    tasks = data ? JSON.parse(data) : [];
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// --- Lógica de Ordenamiento y Visualización ---

function getPriorityValue(priority) {
    switch (priority) {
        case 'High': return 3;
        case 'Medium': return 2;
        case 'Low': return 1;
        default: return 0;
    }
}

// Convierte la fecha DD/MM/YYYY a un valor comparable (YYYYMMDD)
function compareDates(dateStrA, dateStrB) {
    const parseDate = (dateStr) => {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            // YYYY + MM + DD
            return parts[2] + parts[1] + parts[0];
        }
        // Si el formato es incorrecto, lo pone al inicio (o fin) del orden
        return '00000000'; 
    };
    
    const valA = parseDate(dateStrA);
    const valB = parseDate(dateStrB);

    if (valA < valB) return -1;
    if (valA > valB) return 1;
    return 0;
}


function createTaskCardHTML(task) {
    const priorityClass = `priority-${task.prioridad}`;

    return `
        <div class="task-card" data-id="${task.id}">
            <div class="task-header">
                <span class="tag date">${task.fechaEntrega}</span>
                <div class="task-actions">
                    <button class="task-action-btn edit-btn" data-id="${task.id}"><i class="material-icons">edit</i></button>
                    <button class="task-action-btn delete-btn" data-id="${task.id}"><i class="material-icons">delete</i></button>
                </div>
            </div>
            <div class="task-details">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px;">
                    <span class="tag ${priorityClass}">${task.prioridad}</span>
                    <span class="tag materia">${task.materia}</span>
                </div>
                <h4 class="task-title">${task.titulo}</h4>
                <p class="task-description">${task.descripcion}</p>
            </div>
        </div>
    `;
}

function renderTasks() {
    
    // 1. Clonar y Ordenar las Tareas
    let currentTasks = [...tasks]; 
    const sortKey = sortBy.value;
    const direction = sortDirectionBtn.dataset.direction === 'asc' ? 1 : -1;

    currentTasks.sort((a, b) => {
        let comparison = 0;

        if (sortKey === 'prioridad') {
            const valA = getPriorityValue(a.prioridad);
            const valB = getPriorityValue(b.prioridad);
            comparison = valA - valB;
            
        } else if (sortKey === 'fechaEntrega') {
            comparison = compareDates(a.fechaEntrega, b.fechaEntrega);

        } else {
             const valA = a.titulo.toLowerCase();
             const valB = b.titulo.toLowerCase();
             if (valA < valB) comparison = -1;
             if (valA > valB) comparison = 1;
        }

        // Aplicar la dirección (Ascendente o Descendente)
        return comparison * direction;
    });

    // 2. Aplicar Filtro de Texto (Búsqueda)
    const filterText = searchInput.value.toLowerCase();
    const filteredBySearch = currentTasks.filter(task => {
        if (!filterText) return true;
        return task.titulo.toLowerCase().includes(filterText) ||
               task.descripcion.toLowerCase().includes(filterText) ||
               task.materia.toLowerCase().includes(filterText);
    });

    // 3. Aplicar Filtros Rápidos (Materia y Prioridad)
    const filterMat = filterMateria.value;
    const filterPri = filterPrioridad.value;

    const finalFilteredTasks = filteredBySearch.filter(task => {
        const matchesMateria = filterMat === '' || task.materia === filterMat;
        const matchesPrioridad = filterPri === '' || task.prioridad === filterPri;
        return matchesMateria && matchesPrioridad;
    });
    
    // 4. Renderizar la Vista en las Columnas
    const lists = {
        'In Progress': document.getElementById('list-in-progress'),
        'Completed Task': document.getElementById('list-completed'),
        'Over-Due': document.getElementById('list-overdue')
    };
    
    const counts = {
        'In Progress': document.getElementById('count-in-progress'),
        'Completed Task': document.getElementById('count-completed'),
        'Over-Due': document.getElementById('count-overdue')
    };

    Object.values(lists).forEach(list => list.innerHTML = '');
    
    let taskCounts = { 'In Progress': 0, 'Completed Task': 0, 'Over-Due': 0 };

    finalFilteredTasks.forEach(task => {
        const list = lists[task.estado];
        if (list) {
            list.innerHTML += createTaskCardHTML(task);
            taskCounts[task.estado]++;
        }
    });

    Object.keys(counts).forEach(key => {
        if (counts[key]) {
             counts[key].textContent = taskCounts[key];
        }
    });
    
    attachTaskActionListeners();
}

// --- CRUD Funcionalidad ---
function createNewTask(data) {
    const newId = Date.now().toString(); 
    const newTask = { id: newId, ...data };
    tasks.push(newTask);
    saveTasks();
}

function updateTask(id, data) {
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
        tasks[index] = { id: id, ...data };
        saveTasks();
    }
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
}

// --- Manejo de Eventos del Formulario y Modal ---
function openModalForEdit(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        modalTitle.textContent = 'Editar Tarea';
        taskIdInput.value = task.id;
        document.getElementById('titulo').value = task.titulo;
        document.getElementById('descripcion').value = task.descripcion;
        
        const parts = task.fechaEntrega.split('/');
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        const formattedDate = `${year}-${parts[1]}-${parts[0]}`;
        
        document.getElementById('fechaEntrega').value = formattedDate;
        document.getElementById('materia').value = task.materia;
        document.getElementById('prioridad').value = task.prioridad;
        document.getElementById('estado').value = task.estado;
        
        modal.style.display = 'block';
    }
}

form.onsubmit = (e) => {
    e.preventDefault();

    const id = taskIdInput.value;
    const titulo = document.getElementById('titulo').value;
    const descripcion = document.getElementById('descripcion').value;
    const rawDate = document.getElementById('fechaEntrega').value;
    const materia = document.getElementById('materia').value;
    const prioridad = document.getElementById('prioridad').value;
    const estado = document.getElementById('estado').value;

    const [year, month, day] = rawDate.split('-');
    const fechaEntrega = `${day}/${month}/${year}`;

    const newTaskData = { titulo, descripcion, fechaEntrega, materia, prioridad, estado };

    if (id) {
        updateTask(id, newTaskData); 
    } else {
        createNewTask(newTaskData);
    }

    modal.style.display = 'none';
    renderTasks();
};

addTaskBtn.onclick = () => {
    form.reset();
    taskIdInput.value = '';
    modalTitle.textContent = 'Registrar Nueva Tarea';
    modal.style.display = 'block';
};

closeBtn.onclick = () => {
    modal.style.display = 'none';
};

window.onclick = (event) => {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
};

function attachTaskActionListeners() {
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.onclick = (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.id;
            if (confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
                deleteTask(id);
            }
        };
    });

    document.querySelectorAll('.edit-btn').forEach(button => {
        button.onclick = (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.id;
            openModalForEdit(id);
        };
    });
    
    document.querySelectorAll('.task-details').forEach(element => {
         element.onclick = (e) => {
            const id = e.currentTarget.closest('.task-card').dataset.id;
            openModalForEdit(id);
        };
    });
}

// --- Listeners de Control ---

filterMateria.addEventListener('change', renderTasks);
filterPrioridad.addEventListener('change', renderTasks);
sortBy.addEventListener('change', renderTasks);
searchInput.addEventListener('input', renderTasks);

sortDirectionBtn.addEventListener('click', () => {
    let direction = sortDirectionBtn.dataset.direction;
    const icon = sortDirectionBtn.querySelector('i');

    if (direction === 'asc') {
        sortDirectionBtn.dataset.direction = 'desc';
        icon.textContent = 'arrow_downward';
    } else {
        sortDirectionBtn.dataset.direction = 'asc';
        icon.textContent = 'arrow_upward';
    }
    renderTasks();
});

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        e.currentTarget.classList.add('active');
        renderTasks();
    });
});

// --- Inicialización ---
function init() {
    loadTasks();
    if (tasks.length === 0) {
        const exampleTask = { id: Date.now().toString(), titulo: "Preparar Exposición Final", descripcion: "Reunir todos los entregables de HTML, CSS y JS y ensayar la presentación de 10 minutos.", fechaEntrega: "25/12/2025", materia: "Development", prioridad: "High", estado: "In Progress" };
        const exampleTask2 = { id: (Date.now() + 1).toString(), titulo: "Revisar CSS Responsive", descripcion: "Asegurar que el diseño funcione correctamente en móviles y tablets.", fechaEntrega: "15/12/2025", materia: "UX Design", prioridad: "Low", estado: "Completed Task" };
        const exampleTask3 = { id: (Date.now() + 2).toString(), titulo: "Comprar materiales", descripcion: "Comprar cartulina y marcadores para el proyecto de historia.", fechaEntrega: "01/12/2025", materia: "Others", prioridad: "Medium", estado: "Over-Due" };
        tasks.push(exampleTask, exampleTask2, exampleTask3);
        saveTasks();
    }
    renderTasks();
}

init();