(function () {
  'use strict';

  const API_BASE = `${window.location.protocol}//${window.location.hostname}:3000`;

  let tasks = [];
  let taskToDeleteId = null;
  let currentFilter = 'all';

  const taskForm = document.getElementById('new-task-form');
  const taskInput = document.getElementById('new-task-input');
  const taskDateInput = document.getElementById('new-task-date');
  const taskAddressInput = document.getElementById('new-task-address');
  const taskPhoneInput = document.getElementById('new-task-phone');
  const taskList = document.getElementById('task-list');
  const emptyState = document.getElementById('empty-state');

  const totalCountEl = document.getElementById('total-count');
  const completedCountEl = document.getElementById('completed-count');

  const deleteModal = document.getElementById('delete-modal');
  const modalTaskPreview = document.getElementById('modal-task-preview');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

  const filterButtons = document.querySelectorAll('.filter-btn');

  function init() {
    setupEventListeners();
    loadTasks();
  }

  function setupEventListeners() {
    taskForm.addEventListener('submit', handleTaskSubmit);
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) closeDeleteModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && deleteModal.classList.contains('active')) closeDeleteModal();
    });
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => setFilter(btn.dataset.filter));
    });
  }

  function setFilter(filter) {
    currentFilter = filter;
    render();
  }

  async function loadTasks() {
    try {
      const res = await fetch(`${API_BASE}/api/tasks`);
      tasks = await res.json();
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
    render();
  }

  async function handleTaskSubmit(e) {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;

    try {
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          startDate: taskDateInput.value || null,
          address: taskAddressInput.value.trim() || null,
          phone: taskPhoneInput.value.trim() || null
        })
      });
      const task = await res.json();
      tasks.push(task);
      taskInput.value = '';
      taskDateInput.value = '';
      taskAddressInput.value = '';
      taskPhoneInput.value = '';
      render();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  }

  async function toggleTask(id) {
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${id}/toggle`, { method: 'PATCH' });
      const updated = await res.json();
      tasks = tasks.map(t => t.id === id ? updated : t);
      render();
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  }

  function openDeleteModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    taskToDeleteId = id;
    modalTaskPreview.textContent = task.text;
    deleteModal.classList.add('active');
    deleteModal.setAttribute('aria-hidden', 'false');
    confirmDeleteBtn.focus();
  }

  function closeDeleteModal() {
    deleteModal.classList.remove('active');
    deleteModal.setAttribute('aria-hidden', 'true');
    taskToDeleteId = null;
  }

  async function handleConfirmDelete() {
    if (!taskToDeleteId) return;
    const id = taskToDeleteId;
    const taskElement = taskList.querySelector(`[data-id="${id}"]`);

    if (taskElement) {
      taskElement.classList.add('removing');
      taskElement.addEventListener('animationend', async () => {
        await removeTask(id);
      }, { once: true });
      setTimeout(async () => {
        await removeTask(id);
      }, 350);
    } else {
      await removeTask(id);
    }
    closeDeleteModal();
  }

  async function removeTask(id) {
    try {
      await fetch(`${API_BASE}/api/tasks/${id}`, { method: 'DELETE' });
      tasks = tasks.filter(t => t.id !== id);
      render();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }

  function formatStartDate(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    const options = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
    return date.toLocaleString('en-US', options);
  }

  function updateCounters() {
    totalCountEl.textContent = tasks.length;
    completedCountEl.textContent = tasks.filter(t => t.completed).length;
  }

  function render() {
    filterButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === currentFilter);
    });

    const filteredTasks = tasks.filter(task => {
      if (currentFilter === 'completed') return task.completed;
      return true;
    });

    taskList.replaceChildren();

    if (filteredTasks.length === 0) {
      emptyState.style.display = 'flex';
      taskList.style.display = 'none';
    } else {
      emptyState.style.display = 'none';
      taskList.style.display = 'flex';
    }

    const sortedTasks = [...filteredTasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const dateA = a.start_date || '9999-12-31';
      const dateB = b.start_date || '9999-12-31';
      if (dateA !== dateB) return dateA < dateB ? -1 : 1;
      return b.created_at - a.created_at;
    });

    sortedTasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item';
      if (task.completed) li.classList.add('completed');
      li.setAttribute('data-id', task.id);

      const mainDiv = document.createElement('div');
      mainDiv.className = 'task-main';

      const toggleLabel = document.createElement('label');
      toggleLabel.className = 'toggle-wrapper';
      toggleLabel.setAttribute('aria-label', `Mark "${task.text}" as ${task.completed ? 'active' : 'completed'}`);

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'toggle-input';
      checkbox.checked = task.completed;
      checkbox.id = `check-${task.id}`;
      checkbox.addEventListener('change', () => toggleTask(task.id));

      const valveSpan = document.createElement('span');
      valveSpan.className = 'toggle-valve';

      toggleLabel.appendChild(checkbox);
      toggleLabel.appendChild(valveSpan);

      const contentDiv = document.createElement('div');
      contentDiv.className = 'task-content';

      const textSpan = document.createElement('span');
      textSpan.className = 'task-text';
      textSpan.textContent = task.text;

      const detailRow = document.createElement('div');
      detailRow.className = 'task-details';

      if (task.address) {
        const addressSpan = document.createElement('span');
        addressSpan.className = 'task-address';
        addressSpan.textContent = task.address;
        detailRow.appendChild(addressSpan);
      }

      if (task.phone) {
        const phoneSpan = document.createElement('span');
        phoneSpan.className = 'task-phone';
        phoneSpan.textContent = task.phone;
        detailRow.appendChild(phoneSpan);
      }

      if (detailRow.children.length > 0) contentDiv.appendChild(detailRow);

      const metaRow = document.createElement('div');
      metaRow.className = 'task-meta';

      const categorySpan = document.createElement('span');
      categorySpan.className = 'task-category';
      categorySpan.textContent = task.category;

      if (task.start_date) {
        const dateSpan = document.createElement('span');
        dateSpan.className = 'task-start-date';
        dateSpan.textContent = formatStartDate(task.start_date);
        metaRow.appendChild(dateSpan);
      }

      const timeSpan = document.createElement('span');
      timeSpan.className = 'task-time';
      timeSpan.textContent = formatTime(task.created_at);

      metaRow.appendChild(categorySpan);
      metaRow.appendChild(timeSpan);

      contentDiv.appendChild(textSpan);
      contentDiv.appendChild(metaRow);

      mainDiv.appendChild(toggleLabel);
      mainDiv.appendChild(contentDiv);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-delete';
      deleteBtn.setAttribute('aria-label', `Delete job "${task.text}"`);
      deleteBtn.addEventListener('click', () => openDeleteModal(task.id));

      const svgStr = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      `.trim();

      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgStr, 'image/svg+xml');
      deleteBtn.appendChild(svgDoc.documentElement);

      li.appendChild(mainDiv);
      li.appendChild(deleteBtn);
      taskList.appendChild(li);
    });

    updateCounters();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
