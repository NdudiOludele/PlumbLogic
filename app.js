// PlumbLogic Task Manager State Management
(function () {
  'use strict';

  // Application State
  let tasks = [];
  let taskToDeleteId = null;
  let currentFilter = 'all';

  // DOM Elements
  const taskForm = document.getElementById('new-task-form');
  const taskInput = document.getElementById('new-task-input');
  const taskList = document.getElementById('task-list');
  const emptyState = document.getElementById('empty-state');
  
  // Stats Elements
  const totalCountEl = document.getElementById('total-count');
  const completedCountEl = document.getElementById('completed-count');

  // Modal Elements
  const deleteModal = document.getElementById('delete-modal');
  const modalTaskPreview = document.getElementById('modal-task-preview');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

  // Filter Elements
  const filterButtons = document.querySelectorAll('.filter-btn');

  // Initialize App
  function init() {
    setupEventListeners();
    render();
  }

  // Event Listeners Configuration
  function setupEventListeners() {
    // Form Submission
    taskForm.addEventListener('submit', handleTaskSubmit);

    // Modal Interaction Handlers
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
    
    // Close modal on click of the background overlay
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) {
        closeDeleteModal();
      }
    });

    // Accessibility: Keyboard support for ESC key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && deleteModal.classList.contains('active')) {
        closeDeleteModal();
      }
    });

    // Filter Buttons
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => setFilter(btn.dataset.filter));
    });
  }

  // Set Active Filter
  function setFilter(filter) {
    currentFilter = filter;
    render();
  }

  // Create Task Submission
  function handleTaskSubmit(e) {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;

    const newTask = {
      id: 'job-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      text: text,
      completed: false,
      createdAt: Date.now()
    };

    tasks.push(newTask);
    taskInput.value = '';
    
    // UI Update
    render();
  }

  // Toggle Completion State
  function toggleTask(id) {
    tasks = tasks.map(task => {
      if (task.id === id) {
        return { ...task, completed: !task.completed };
      }
      return task;
    });
    render();
  }

  // Open Delete Dialog (Modal)
  function openDeleteModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    taskToDeleteId = id;
    
    // Safely set text content for the preview element in modal to avoid XSS
    modalTaskPreview.textContent = task.text;
    
    // Open Modal
    deleteModal.classList.add('active');
    deleteModal.setAttribute('aria-hidden', 'false');
    
    // Focus confirmation button for keyboard accessibility
    confirmDeleteBtn.focus();
  }

  // Close Delete Dialog (Modal)
  function closeDeleteModal() {
    deleteModal.classList.remove('active');
    deleteModal.setAttribute('aria-hidden', 'true');
    taskToDeleteId = null;
  }

  // Confirm Deletion Flow
  function handleConfirmDelete() {
    if (!taskToDeleteId) return;

    const id = taskToDeleteId;
    const taskElement = taskList.querySelector(`[data-id="${id}"]`);

    if (taskElement) {
      // Trigger visually polished exiting animation
      taskElement.classList.add('removing');
      
      // Delay state removal slightly to let keyframe exit animation complete
      taskElement.addEventListener('animationend', () => {
        completeStateRemoval(id);
      }, { once: true });
      
      // Safety fallback if animation is blocked/fails
      setTimeout(() => {
        completeStateRemoval(id);
      }, 350);
    } else {
      completeStateRemoval(id);
    }

    closeDeleteModal();
  }

  // Complete removal from state array
  function completeStateRemoval(id) {
    const originalLength = tasks.length;
    tasks = tasks.filter(t => t.id !== id);
    
    // Re-render UI list only if change occurred
    if (tasks.length !== originalLength) {
      render();
    }
  }

  // Formatter for localized creation times
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    
    // Custom localized format: e.g. Jun 6, 7:35 AM
    const options = {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleString('en-US', options);
  }

  // Update Stats & Counters
  function updateCounters() {
    const totalCount = tasks.length;
    const completedCount = tasks.filter(t => t.completed).length;

    totalCountEl.textContent = totalCount;
    completedCountEl.textContent = completedCount;
  }

  // Render list to screen (Dynamic safe DOM creation)
  function render() {
    // Update active filter button
    filterButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === currentFilter);
    });

    // Filter tasks based on current filter
    const filteredTasks = tasks.filter(task => {
      if (currentFilter === 'completed') return task.completed;
      return true; // 'all' shows everything
    });

    // Clear list securely (never innerHTML = '')
    taskList.replaceChildren();

    // Toggle Empty State view
    if (filteredTasks.length === 0) {
      emptyState.style.display = 'flex';
      taskList.style.display = 'none';
    } else {
      emptyState.style.display = 'none';
      taskList.style.display = 'flex';
    }

    // Sort: Active tasks first, newest tasks first
    const sortedTasks = [...filteredTasks].sort((a, b) => {
      if (a.completed === b.completed) {
        return b.createdAt - a.createdAt; // Newer tasks higher
      }
      return a.completed ? 1 : -1; // Active tasks first
    });

    // Build DOM elements dynamically for security
    sortedTasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item';
      if (task.completed) {
        li.classList.add('completed');
      }
      li.setAttribute('data-id', task.id);

      // Main Left Block
      const mainDiv = document.createElement('div');
      mainDiv.className = 'task-main';

      // Custom Toggle Bezel
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

      // Text and Time stamp
      const contentDiv = document.createElement('div');
      contentDiv.className = 'task-content';

      const textSpan = document.createElement('span');
      textSpan.className = 'task-text';
      textSpan.textContent = task.text; // SECURE: Escapes user string safely

      const timeSpan = document.createElement('span');
      timeSpan.className = 'task-time';
      timeSpan.textContent = formatTime(task.createdAt); // SECURE: Static display

      contentDiv.appendChild(textSpan);
      contentDiv.appendChild(timeSpan);

      mainDiv.appendChild(toggleLabel);
      mainDiv.appendChild(contentDiv);

      // Right Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-delete';
      deleteBtn.setAttribute('aria-label', `Delete job "${task.text}"`);
      deleteBtn.addEventListener('click', () => openDeleteModal(task.id));

      // Parse trash icon SVG securely using DOMParser to avoid raw innerHTML manipulation
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
      const svgElement = svgDoc.documentElement;
      
      deleteBtn.appendChild(svgElement);

      // Combine components into list item
      li.appendChild(mainDiv);
      li.appendChild(deleteBtn);

      taskList.appendChild(li);
    });

    // Refresh Counters
    updateCounters();
  }

  // Boot App
  document.addEventListener('DOMContentLoaded', init);
})();
